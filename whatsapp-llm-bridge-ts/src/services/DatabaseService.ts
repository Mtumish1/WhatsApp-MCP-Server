// whatsapp-llm-bridge-ts/src/services/DatabaseService.ts
// This service handles all interactions with your local SQLite database.
// It's like the librarian for your filing cabinet, knowing how to store and retrieve information.
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import logger from '../utils/logger';
import { IMessage, IChat, IContact } from '../interfaces/whatsapp';
import config from '../config';

class DatabaseService {
  private db!: Database; // Using '!' to assert that it will be initialized

  // Initializes the database connection and creates tables if they don't exist.
  // This runs when your bridge starts up.
  public async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: config.databasePath, // Path to your SQLite database file
        driver: sqlite3.Database,
      });

      // Create 'messages' table: stores all your WhatsApp messages
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          chatId TEXT NOT NULL,
          senderId TEXT NOT NULL,
          text TEXT,
          timestamp INTEGER NOT NULL,
          isGroup INTEGER NOT NULL,
          fromMe INTEGER NOT NULL,
          type TEXT NOT NULL,
          mediaUrl TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create 'chats' table: stores information about your conversations (groups or individual)
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          isGroup INTEGER NOT NULL,
          unreadCount INTEGER NOT NULL,
          lastMessageId TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create 'contacts' table: stores information about your WhatsApp contacts
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          name TEXT,
          number TEXT NOT NULL,
          isBusiness INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      logger.info(`Database initialized at ${config.databasePath}`);
    } catch (error) {
      logger.error(`Error initializing database: ${error}`);
      process.exit(1); // Exit if database can't be initialized, as it's critical
    }
  }

  // Saves or updates a message in the database.
  public async saveMessage(message: IMessage): Promise<void> {
    try {
      await this.db.run(
        `INSERT OR REPLACE INTO messages (id, chatId, senderId, text, timestamp, isGroup, fromMe, type, mediaUrl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        message.id,
        message.chatId,
        message.senderId,
        message.text,
        message.timestamp,
        message.isGroupMsg ? 1 : 0, // SQLite stores boolean as 0 or 1
        message.fromMe ? 1 : 0,
        message.type,
        message.mediaUrl || null
      );
      logger.debug(`Message saved: ${message.id}`);
    } catch (error) {
      logger.error(`Error saving message ${message.id}: ${error}`);
    }
  }

  // Retrieves messages for a specific chat ID.
  public async getMessagesByChatId(chatId: string, limit = 100, offset = 0): Promise<IMessage[]> {
    try {
      const messages = await this.db.all<IMessage[]>(
        `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
        chatId,
        limit,
        offset
      );
      return messages;
    } catch (error) {
      logger.error(`Error getting messages for chat ${chatId}: ${error}`);
      return [];
    }
  }

  // Saves or updates a chat in the database.
  public async saveChat(chat: IChat): Promise<void> {
    try {
      await this.db.run(
        `INSERT OR REPLACE INTO chats (id, name, isGroup, unreadCount, lastMessageId)
         VALUES (?, ?, ?, ?, ?)`,
        chat.id,
        chat.name,
        chat.isGroup ? 1 : 0,
        chat.unreadCount,
        chat.lastMessage?.id || null
      );
      logger.debug(`Chat saved: ${chat.id}`);
    } catch (error) {
      logger.error(`Error saving chat ${chat.id}: ${error}`);
    }
  }

  // Retrieves all chats from the database.
  public async getChats(): Promise<IChat[]> {
    try {
      const chats = await this.db.all<IChat[]>(`SELECT * FROM chats ORDER BY lastMessageId DESC`);
      // You might need to fetch the full last message object separately if needed,
      // or enhance the schema to store more last message details.
      return chats;
    } catch (error) {
      logger.error(`Error getting chats: ${error}`);
      return [];
    }
  }

  // Saves or updates a contact in the database.
  public async saveContact(contact: IContact): Promise<void> {
    try {
      await this.db.run(
        `INSERT OR REPLACE INTO contacts (id, name, number, isBusiness)
         VALUES (?, ?, ?, ?)`,
        contact.id,
        contact.name,
        contact.number,
        contact.isBusiness ? 1 : 0
      );
      logger.debug(`Contact saved: ${contact.id}`);
    } catch (error) {
      logger.error(`Error saving contact ${contact.id}: ${error}`);
    }
  }

  // Retrieves all contacts from the database.
  public async getContacts(): Promise<IContact[]> {
    try {
      const contacts = await this.db.all<IContact[]>(`SELECT * FROM contacts ORDER BY name ASC`);
      return contacts;
    } catch (error) {
      logger.error(`Error getting contacts: ${error}`);
      return [];
    }
  }
}

export default new DatabaseService(); // Export a singleton instance
