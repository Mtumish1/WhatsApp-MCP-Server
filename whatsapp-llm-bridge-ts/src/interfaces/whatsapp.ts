// whatsapp-llm-bridge-ts/src/interfaces/whatsapp.ts
// These are TypeScript interfaces that define the "shape" of your data.
// They act like blueprints or contracts, ensuring your code handles data consistently.
// For a non-technical person, think of them as forms with specific fields.
export interface IMessage {
  id: string;
  chatId: string; // The ID of the chat it belongs to
  senderId: string; // The ID of the sender
  text: string;
  timestamp: number; // When the message was sent (in milliseconds since epoch)
  isGroup: boolean;
  fromMe: boolean; // True if the message was sent by your account
  type: string; // e.g., 'chat', 'image', 'video', 'sticker'
  // Add more fields as needed for media, mentions, etc.
  mediaUrl?: string; // Optional URL for media messages
  // Other potential fields
  hasMedia?: boolean;
  mimeType?: string;
  caption?: string;

}

export interface IChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage?: IMessage; // Optional last message for quick overview
  // Add more fields for participants, profile picture, etc.
}

export interface IContact {
  id: string; // WhatsApp contact ID (JID)
  name: string | null; // Display name
  number: string; // Phone number
  isBusiness: boolean;

}
  // Add more fields for profile picture, about status, etc