// whatsapp-llm-bridge-ts/src/core/WhatsAppClient.ts
// This class manages the connection to WhatsApp Web and sends/receives messages.
// It's the core engine that interacts with WhatsApp.
import { Client, LocalAuth, Message, Chat, Contact } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import logger from '../utils/logger';
import databaseService from '../services/DatabaseService';
import config from '../config';
import { IMessage, IChat, IContact } from '../interfaces/whatsapp';

// Define a type for your event handlers
type WhatsAppEventHandler = (data: any) => void;

class WhatsAppClient {
  private client: Client;
  private messageHandlers: WhatsAppEventHandler[] = [];
  private qrCodeGenerated: boolean = false; // Track if QR code has been generated

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'whatsapp-llm-bridge', // Unique ID for your session
        dataPath: config.sessionDataPath, // Directory to store session files
      }),

      
      // You might need additional options here depending on your environment,
      // e.g., puppeteer: { args: ['--no-sandbox'] } for some Linux setups.
      puppeteer: {
        headless: true, // Run Chrome in the background without a visible window
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Recommended for many environments
      },
    });

    this.setupListeners(); // Set up all WhatsApp event listeners
  }

  // Sets up all event listeners for the WhatsApp client.
  // This is where the bridge reacts to WhatsApp events.
  private setupListeners(): void {
    // Event: When a QR code needs to be displayed for authentication
    this.client.on('qr', (qr) => {
      if (!this.qrCodeGenerated) { // Only display QR code once per new session
        logger.info('QR Code received. Scan with your phone:');
        qrcode.generate(qr, { small: true }); // Display QR code in terminal
        this.qrCodeGenerated = true;
        // Optionally, you could emit this QR code via WebSocket to the UI for display
      }
    });

    // Event: When the client is successfully authenticated
    this.client.on('authenticated', () => {
      logger.info('WhatsApp Client Authenticated!');
      this.qrCodeGenerated = false; // Reset for next potential re-auth
    });

    // Event: When authentication fails
    this.client.on('auth_failure', (msg) => {
      logger.error(`WhatsApp Client Authentication Failure: ${msg}`);
      // Consider deleting session files and re-initializing client here
      // For a real app, you might notify the user in the UI.
    });

    // Event: When the client is ready to send/receive messages
    this.client.on('ready', async () => {
      logger.info('WhatsApp Client is READY!');
      // Initial sync of chats and contacts after ready
      await this.syncAllData();
    });

    // Event: When a new message is received
    this.client.on('message', async (message) => {
      logger.debug(`New message from ${message.from}: ${message.body.substring(0, 50)}...`);
      // Convert WhatsApp message object to your internal IMessage interface
      const parsedMessage: IMessage = {
        id: message.id.id,
        chatId: message.from, // For direct messages, message.from is the chat ID
        senderId: message.from, // Sender ID is message.from
        text: message.body,
        timestamp: message.timestamp * 1000, // Convert seconds to milliseconds
        isGroup: message.isGroupMsg,
        fromMe: message.fromMe,
        type: message.type,
        mediaUrl: message.hasMedia ? await message.downloadMedia().then(media => media.data) : undefined, // Example for base64 media
        hasMedia: message.hasMedia,
        mimeType: message.hasMedia ? message.mimetype : undefined,
        caption: message.caption || undefined,
      };

      // Save the message to the local database
      await databaseService.saveMessage(parsedMessage);

      // Notify all registered handlers (e.g., the API service to push to LLM)
      this.messageHandlers.forEach(handler => handler(parsedMessage));
    });

    // Event: When a message is deleted
    this.client.on('message_revoke_everyone', async (after, before) => {
      logger.info(`Message revoked: ${before?.id?.id}`);
      // You might want to update your database here to mark message as deleted
    });

    // Event: When the client disconnects
    this.client.on('disconnected', (reason) => {
      logger.warn(`WhatsApp Client Disconnected: ${reason}`);
      this.qrCodeGenerated = false; // Allow new QR on reconnect attempt
      // Attempt to re-initialize or notify the UI for manual intervention
      if (reason === 'TOS_BLOCK') {
        logger.error('WhatsApp account blocked due to Terms of Service violation. Re-auth will not work.');
      } else {
        logger.info('Attempting to reconnect WhatsApp client in 10 seconds...');
        setTimeout(() => this.initialize(), 10000); // Try to reconnect after a delay
      }
    });

    // Event: When a state changes (e.g., 'LOADING', 'CONNECTED', 'DISCONNECTED')
    this.client.on('change_state', (state) => {
      logger.info(`WhatsApp Client State Changed: ${state}`);
    });
  }

  // Initializes the WhatsApp client connection.
  public async initialize(): Promise<void> {
    logger.info('Initializing WhatsApp Client...');
    try {
      await this.client.initialize();
    } catch (error) {
      logger.error(`Failed to initialize WhatsApp client: ${error}`);
      // Don't exit here, as client.initialize() might just fail to connect initially.
      // The disconnected handler will try to re-initialize.
    }
  }

  // Allows other parts of the application to register callbacks for new messages.
  public onNewMessage(handler: WhatsAppEventHandler): void {
    this.messageHandlers.push(handler);
  }

  // Sends a text message to a specific chat ID.
  public async sendMessage(chatId: string, message: string): Promise<Message | undefined> {
    try {
      if (!this.client.isReady) {
        logger.warn('WhatsApp client not ready to send message.');
        throw new Error('WhatsApp client not ready.');
      }
      const sentMessage = await this.client.sendMessage(chatId, message);
      logger.info(`Message sent to ${chatId}: ${message.substring(0, 30)}...`);
      return sentMessage;
    } catch (error) {
      logger.error(`Error sending message to ${chatId}: ${error}`);
      return undefined;
    }
  }

  // Fetches and saves all chats and contacts to the database.
  // This helps keep your local data up-to-date.
  private async syncAllData(): Promise<void> {
    logger.info('Syncing all chats and contacts...');
    try {
      const chats = await this.client.getChats();
      for (const chat of chats) {
        // Convert and save chat to database
        const iChat: IChat = {
          id: chat.id._serialized,
          name: chat.name,
          isGroup: chat.isGroup,
          unreadCount: chat.unreadCount,
          lastMessage: chat.lastMessage ? await this.convertWWebMessageToIMessage(chat.lastMessage) : undefined,
        };
        await databaseService.saveChat(iChat);
      }
      logger.info(`Synced ${chats.length} chats.`);

      const contacts = await this.client.getContacts();
      for (const contact of contacts) {
        // Convert and save contact to database
        const iContact: IContact = {
          id: contact.id._serialized,
          name: contact.name || contact.pushname || contact.id.user,
          number: contact.number,
          isBusiness: contact.isBusiness,
        };
        await databaseService.saveContact(iContact);
      }
      logger.info(`Synced ${contacts.length} contacts.`);
    } catch (error) {
      logger.error(`Error syncing data: ${error}`);
    }
  }

  // Helper to convert whatsapp-web.js Message object to our IMessage interface
  private async convertWWebMessageToIMessage(message: Message): Promise<IMessage> {
    return {
      id: message.id.id,
      chatId: message.from,
      senderId: message.from,
      text: message.body,
      timestamp: message.timestamp * 1000,
      isGroup: message.isGroupMsg,
      fromMe: message.fromMe,
      type: message.type,
      mediaUrl: message.hasMedia ? await message.downloadMedia().then(media => media.data) : undefined,
      hasMedia: message.hasMedia,
      mimeType: message.mimetype || undefined,
      caption: message.caption || undefined,
    };
  }

  // Provides access to the underlying whatsapp-web.js client if needed by other services
  public getClient(): Client {
    return this.client;
  }
}

export default new WhatsAppClient(); // Export a singleton instance of the client