// whatsapp-llm-bridge-ts/src/config.ts
// This file loads configuration settings from your `.env` file.
// It ensures your sensitive data is kept out of your code.
import dotenv from 'dotenv';
dotenv.config(); // Loads variables from .env file

const config = {
  port: parseInt(process.env.PORT || '3000', 10), // Port for the API server
  internalApiSecret: process.env.INTERNAL_API_SECRET || 'super_insecure_default_secret', // Secret for internal communication
  sessionDataPath: process.env.SESSION_DATA_PATH || './whatsapp_session', // Path to WhatsApp session data
  databasePath: process.env.DATABASE_PATH || './data/whatsapp.db', // Path to SQLite DB file
  // Add any other configuration variables here
};

// Basic validation to ensure critical secrets are set
if (config.internalApiSecret === 'super_insecure_default_secret' && process.env.NODE_ENV !== 'development') {
  console.warn('WARNING: Using default INTERNAL_API_SECRET. Please set a strong secret in your .env file!');
}

export default config;