const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// @desc    Get chat history for a conversation (last 50 messages)
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some((p) =>
      p.equals(req.user._id)
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Return in chronological order (oldest first)
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMessages };
