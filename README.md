# Real-Time Messaging App

A full-stack real-time messaging platform built with React, Node.js, Express, Socket.IO, and MongoDB. Supports user authentication, 1:1 and group conversations, live message delivery, online presence, and typing indicators.

**Live Demo:** https://newapp-omega-ochre.vercel.app

---

## Features

- **JWT Authentication** — User registration and login with bcrypt-hashed passwords and JWT-based session tokens (30-day expiry).
- **1:1 and Group Conversations** — Start a direct conversation with any registered user, or create group chats with multiple members.
- **Real-Time Messaging** — Messages are delivered instantly via Socket.IO, scoped to per-conversation rooms so only participants receive updates.
- **Authenticated Sockets** — Socket.IO connections are verified against the user's JWT at handshake time before any events are processed.
- **Online Presence** — Tracks which users are currently online (across multiple tabs/devices per user) and broadcasts live status updates to all connected clients.
- **Typing Indicators** — Shows a live "user is typing…" indicator per conversation, with debounce and timeout handling on the client.
- **Persistent Chat History** — All conversations and messages are stored in MongoDB, with indexed queries for fast history retrieval.
- **Protected Routes** — Both REST endpoints and frontend routes are gated behind authentication.

---

## Tech Stack

**Frontend:** React, Vite, React Router, Tailwind CSS, Socket.IO Client, Axios
**Backend:** Node.js, Express, Socket.IO, MongoDB, Mongoose, JWT, bcrypt
**Deployment:** Frontend on Vercel, Backend on Render

---

## How It Works

- The Express server exposes REST endpoints for authentication, user lookup, conversations, and message history.
- On login/registration, the server issues a JWT, which the client stores and sends with both REST requests and the Socket.IO handshake.
- A Socket.IO middleware (`socketAuth`) verifies this JWT before allowing a socket connection, attaching the authenticated user to the socket.
- Each client joins a Socket.IO room per active conversation (`join_conversation` / `leave_conversation`), so messages, typing events, and updates are only broadcast to participants of that conversation.
- An in-memory map tracks online user IDs (supporting multiple connections per user) and broadcasts presence updates (`online_users`) to all clients on connect/disconnect.
- Typing state is communicated via `typing` / `stop_typing` socket events, scoped to the active conversation.

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a new user | Public |
| POST | `/api/auth/login` | Log in and receive a JWT | Public |
| GET | `/api/users` | List all other registered users | Private |
| GET | `/api/conversations` | Get all conversations for the logged-in user | Private |
| GET | `/api/conversations/:id` | Get a single conversation by ID | Private |
| POST | `/api/conversations/direct` | Get or create a 1:1 conversation | Private |
| POST | `/api/conversations/group` | Create a group conversation | Private |
| GET | `/api/messages/:conversationId` | Get message history for a conversation | Private |

---

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `online_users` | Server → Client | Broadcasts the current list of online user IDs |
| `join_conversation` | Client → Server | Join the room for a conversation |
| `leave_conversation` | Client → Server | Leave the room for a conversation |
| `message` | Both | Send/receive a chat message in real time |
| `typing` | Both | Notify others that a user started typing |
| `stop_typing` | Both | Notify others that a user stopped typing |

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- A MongoDB instance (local or MongoDB Atlas)

### Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

Run the server:

```bash
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file in `client/` (see `.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Run the client:

```bash
npm run dev
```

---

## Project Structure

```
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/      # Sidebar, ChatWindow, ProtectedRoute, etc.
│       ├── context/          # AuthContext, SocketContext
│       ├── pages/             # Login, Register, ChatLayout
│       └── services/          # API client
└── server/                   # Express backend
    ├── config/                # MongoDB connection
    ├── controllers/           # Auth, users, conversations, messages
    ├── middleware/             # JWT auth middleware
    ├── models/                  # User, Conversation, Message (Mongoose)
    ├── routes/                   # REST API routes
    └── socket/                    # Socket auth + event handlers
```
