require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const socketAuth = require("./socket/socketAuth");
const registerSocketHandlers = require("./socket/socketHandler");

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const conversationRoutes = require("./routes/conversationRoutes");

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());

// REST API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("Chat API is running");
});

// Socket.IO — verify JWT before allowing a connection, then attach handlers
io.use(socketAuth);
registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
