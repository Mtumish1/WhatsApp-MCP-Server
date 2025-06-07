// whatsapp-llm-bridge-ts/src/services/BridgeApiService.ts
// This service sets up the web server (API) for your bridge.
// It's like the receptionist who answers the phone for the MCP Server or UI.
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import http from 'http';
import WebSocket from 'ws'; // For real-time updates
import whatsappClient from '../core/WhatsAppClient';
import databaseService from './DatabaseService';
import logger from '../utils/logger';
import config from '../config';
import { IMessage, IChat, IContact } from '../interfaces/whatsapp';

class BridgeApiService {
  public app: express.Application;
  private server: http.Server;
  private wss: WebSocket.Server; // WebSocket server instance

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server }); // Initialize WebSocket server
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSockets();
  }

  // Sets up Express middleware (like JSON parsing and authentication).
  private setupMiddleware(): void {
    this.app.use(express.json()); // Allows parsing JSON body from requests
    this.app.use(this.authenticateMiddleware); // Apply authentication to all API routes
  }

  // Middleware for internal API authentication.
  // This ensures only authorized components (your Python Orchestration layer) can talk to the bridge.
  private authenticateMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
    }
    const token = authHeader.split(' ')[1];
    if (token !== config.internalApiSecret) {
      return res.status(403).json({ error: 'Forbidden: Invalid API secret.' });
    }
    next(); // Proceed to the next middleware/route handler if authenticated
  }

  // Sets up API routes (endpoints) that the MCP Server/UI will call.
  private setupRoutes(): void {
    // GET /status: Check if the bridge is running and WhatsApp is connected
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'running',
        whatsAppClientReady: whatsappClient.getClient().isReady,
      });
    });

    // POST /send-message: Send a message via WhatsApp
    this.app.post('/send-message', async (req, res) => {
      const { chatId, message } = req.body;
      if (!chatId || !message) {
        return res.status(400).json({ error: 'chatId and message are required.' });
      }
      logger.info(`API: Received request to send message to ${chatId}`);
      const sentMessage = await whatsappClient.sendMessage(chatId, message);
      if (sentMessage) {
        res.status(200).json({ success: true, messageId: sentMessage.id.id });
      } else {
        res.status(500).json({ success: false, error: 'Failed to send message.' });
      }
    });

    // GET /chats: Retrieve all chats from the local database
    this.app.get('/chats', async (req, res) => {
      const chats = await databaseService.getChats();
      res.status(200).json(chats);
    });

    // GET /chats/:chatId/messages: Retrieve messages for a specific chat from the local database
    this.app.get('/chats/:chatId/messages', async (req, res) => {
      const { chatId } = req.params;
      const { limit, offset } = req.query;
      const messages = await databaseService.getMessagesByChatId(
        chatId,
        parseInt(limit as string) || 100,
        parseInt(offset as string) || 0
      );
      res.status(200).json(messages);
    });

    // GET /contacts: Retrieve all contacts from the local database
    this.app.get('/contacts', async (req, res) => {
      const contacts = await databaseService.getContacts();
      res.status(200).json(contacts);
    });
  }

  // Sets up WebSocket communication for real-time updates.
  // This is how your Orchestration Layer will get new messages instantly.
  private setupWebSockets(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('WebSocket client connected.');

      // When the WhatsApp client receives a new message, send it to all connected WebSocket clients
      whatsappClient.onNewMessage((message: IMessage) => {
        ws.send(JSON.stringify({ type: 'NEW_MESSAGE', payload: message }));
      });

      // You can add more event types to send over WebSocket (e.g., 'WHATSAPP_READY', 'WHATSAPP_DISCONNECTED')
      whatsappClient.getClient().on('ready', () => {
        ws.send(JSON.stringify({ type: 'WHATSAPP_READY', payload: { status: 'ready' } }));
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected.');
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error: ${error}`);
      });
    });
  }

  // Starts the API server.
  public start(): void {
    this.server.listen(config.port, () => {
      logger.info(`WhatsApp Bridge API server listening on port ${config.port}`);
    });
  }
}

export default new BridgeApiService();