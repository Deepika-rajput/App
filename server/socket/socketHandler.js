const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// Tracks which userIds are currently connected.
// A user can have multiple sockets (e.g. two browser tabs), so we
// keep a Set of socket ids per user and only mark them "offline"
// once every socket has disconnected.
const onlineUsers = new Map();

const broadcastOnlineUsers = (io) => {
  io.emit("online_users", Array.from(onlineUsers.keys()));
};

// Registers all socket.io event handlers.
// `io` is the Socket.IO server instance (already passed through socketAuth).
const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    const { id: userId, username } = socket.user;
    console.log(`${username} connected (${socket.id})`);

    // ── Presence ──
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    broadcastOnlineUsers(io);

    // ── Conversation rooms ──
    // Client joins a room per conversation so messages are only
    // delivered to participants of that conversation.
    socket.on("join_conversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) return;

        socket.join(conversationId);
      } catch (error) {
        console.error("join_conversation error:", error.message);
      }
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(conversationId);
    });

    // ── Chat messages ──
    socket.on("message", async ({ conversationId, text }) => {
      try {
        const trimmed = (text || "").trim();
        if (!trimmed || !conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) return;

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          senderUsername: username,
          text: trimmed,
        });

        conversation.lastMessage = {
          text: trimmed,
          senderUsername: username,
          createdAt: message.createdAt,
        };
        await conversation.save();

        io.to(conversationId).emit("message", {
          _id: message._id,
          conversation: conversationId,
          text: message.text,
          senderUsername: message.senderUsername,
          sender: message.sender,
          createdAt: message.createdAt,
        });
      } catch (error) {
        console.error("Error saving message:", error.message);
      }
    });

    // ── Typing indicators ──
    socket.on("typing", (conversationId) => {
      socket.to(conversationId).emit("typing", { conversationId, username });
    });

    socket.on("stop_typing", (conversationId) => {
      socket.to(conversationId).emit("stop_typing", { conversationId, username });
    });

    // ── Disconnect ──
    socket.on("disconnect", () => {
      console.log(`${username} disconnected (${socket.id})`);

      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(userId);
      }
      broadcastOnlineUsers(io);
    });
  });
};

module.exports = registerSocketHandlers;
