
# WhatsApp-LLM Bridge

This repository contains the TypeScript-based "Bridge" component for your personal WhatsApp-LLM assistant project. Its primary function is to serve as the direct communication layer with your personal WhatsApp account, enabling real-time messaging, chat history retrieval, and contact management.

**Think of this as the dedicated "secretary" that manages all your WhatsApp interactions.** It takes instructions from your AI (which will be in the Python Orchestration Layer) and performs the actual actions on WhatsApp. It also records all incoming messages and chat data into its local "filing cabinet" (a SQLite database).

---

## Architecture Overview

This Bridge works as follows:

1.  **WhatsApp Web Connection:** It uses a Node.js library (`whatsapp-web.js`) to programmatically connect to your personal WhatsApp account via WhatsApp Web's multi-device functionality. When you first run it, it will display a QR code in your terminal, which you'll scan with your phone's WhatsApp app to link.
2.  **Local Data Storage (SQLite):** All your message history, chats, and contacts are securely stored locally in a lightweight SQLite database file. This allows for fast retrieval of past conversations.
3.  **API Endpoints (REST):** It exposes a set of API endpoints (like web addresses) that your Python Orchestration Layer can call to:
    * Send messages
    * Retrieve chat lists
    * Fetch message history for specific chats
    * List contacts
    * Check its current status (e.g., if WhatsApp is connected)
4.  **Real-time Updates (WebSockets):** It provides a WebSocket connection. This is crucial because whenever a new message arrives on your WhatsApp, the Bridge will *immediately* push that message to your Python Orchestration Layer, allowing your AI to react in real-time.

---

## Features

* Connects to your personal WhatsApp account via QR code scanning (one-time setup).
* Sends text messages to individuals and groups.
* Receives and processes incoming messages.
* Stores all chat history, contacts, and chat metadata in a local SQLite database.
* Exposes a REST API for programmatic control.
* Provides real-time new message notifications via WebSockets.
* Logs all activity for debugging and monitoring.

---

## Setup & Installation

To get this Bridge up and running:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Mtumish1/whatsapp-llm-bridge-ts.git
    cd whatsapp-llm-bridge-ts
    ```

2.  **Install Node.js and npm:**
    Ensure you have Node.js (v18 or higher recommended) and npm installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Create `.env` file:**
    Copy the `.env.example` file to a new file named `.env` in the root of the project:
    ```bash
    cp .env.example .env
    ```
    Then, open `.env` and fill in the `INTERNAL_API_SECRET` with a strong, random string. This acts as a password for your Bridge's API, ensuring only your Python Orchestration Layer can access it.

5.  **Run in Development Mode (Recommended for first run):**
    ```bash
    npm run dev
    ```
    * **First Run:** This will start the server. You will see a QR code displayed in your terminal. **Scan this QR code using your phone's WhatsApp app** (Go to `Settings` -> `Linked Devices` -> `Link a Device`).
    * Once scanned, the terminal will show "WhatsApp Client Authenticated!" and "WhatsApp Client is READY!".
    * It will automatically create `whatsapp_session` and `data` folders in your project root, containing your session data and the SQLite database respectively.

6.  **Run in Production Mode (after development and testing):**
    First, build the TypeScript code:
    ```bash
    npm run build
    ```
    Then, start the compiled JavaScript application:
    ```bash
    npm start
    ```

---

## Usage (for the Orchestration Layer)

Once the Bridge is running and connected to WhatsApp, your Python Orchestration Layer (which we'll build next) can interact with it:

* **REST API:**
    * `GET http://localhost:3000/status`
    * `POST http://localhost:3000/send-message` (Body: `{ "chatId": "...", "message": "..." }`)
    * `GET http://localhost:3000/chats`
    * `GET http://localhost:3000/chats/:chatId/messages`
    * `GET http://localhost:3000/contacts`
    * **Remember to include an `Authorization: Bearer YOUR_INTERNAL_API_SECRET` header for all requests.**

* **WebSockets:**
    * Connect to `ws://localhost:3000/`.
    * You will receive JSON messages for `NEW_MESSAGE`, `WHATSAPP_READY`, etc., providing real-time updates.

---