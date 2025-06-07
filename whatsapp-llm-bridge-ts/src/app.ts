// whatsapp-llm-bridge-ts/src/app.ts
// This is the main entry point for your WhatsApp Bridge application.
// It orchestrates the initialization of all major components.
import 'dotenv/config'; // Ensure environment variables are loaded at the very start
import logger from './utils/logger';
import databaseService from './services/DatabaseService';
import whatsappClient from './core/WhatsAppClient';
import bridgeApiService from './services/BridgeApiService';

// Main function to start the application
async function bootstrap() {
  logger.info('Starting WhatsApp LLM Bridge application...');

  try {
    // 1. Initialize the Database
    await databaseService.initialize();
    logger.info('Database service initialized.');

    // 2. Initialize the WhatsApp Client
    // This will start the browser, handle QR code generation, and connect to WhatsApp Web.
    await whatsappClient.initialize();
    logger.info('WhatsApp client initialization started.');

    // 3. Start the Bridge API Server
    // This server will listen for requests from your Python Orchestration Layer
    // and provide real-time updates via WebSockets.
    bridgeApiService.start();
    logger.info('Bridge API service started.');

    logger.info('WhatsApp LLM Bridge is up and running!');
    logger.info('Waiting for WhatsApp client to be ready and authenticated...');

  } catch (error) {
    logger.error(`Application failed to start: ${error}`);
    process.exit(1); // Exit the process if a critical error occurs during startup
  }
}

// Call the bootstrap function to start the application
bootstrap();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: Closing WhatsApp client and shutting down...');
  try {
    await whatsappClient.getClient().destroy(); // Disconnect WhatsApp client gracefully
    // Optionally close DB connections here if your driver requires explicit close
    process.exit(0);
  } catch (error) {
    logger.error(`Error during graceful shutdown: ${error}`);
    process.exit(1);
  }
});