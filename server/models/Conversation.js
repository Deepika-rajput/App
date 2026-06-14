const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      trim: true, // only used for group conversations
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    // Cached so the conversation list can show a preview without
    // querying the messages collection separately.
    lastMessage: {
      text: { type: String },
      senderUsername: { type: String },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
