const Conversation = require("../models/Conversation");
const User = require("../models/User");

// @desc    Get all conversations the logged-in user is part of
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "username")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single conversation by id (must be a participant)
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).populate(
      "participants",
      "username"
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some((p) =>
      p._id.equals(req.user._id)
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Find an existing 1:1 conversation with a user, or create one
// @route   POST /api/conversations/direct  { username }
// @access  Private
const getOrCreateDirectConversation = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const otherUser = await User.findOne({ username });
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (otherUser._id.equals(req.user._id)) {
      return res.status(400).json({ message: "You can't start a conversation with yourself" });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, otherUser._id], $size: 2 },
    }).populate("participants", "username");

    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: false,
        participants: [req.user._id, otherUser._id],
      });
      conversation = await conversation.populate("participants", "username");
    }

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a group conversation
// @route   POST /api/conversations/group  { name, usernames: [] }
// @access  Private
const createGroupConversation = async (req, res) => {
  const { name, usernames } = req.body;

  if (!name || !Array.isArray(usernames) || usernames.length === 0) {
    return res
      .status(400)
      .json({ message: "Group name and at least one other member are required" });
  }

  try {
    const members = await User.find({ username: { $in: usernames } });

    if (members.length !== usernames.length) {
      return res.status(404).json({ message: "One or more usernames were not found" });
    }

    const participantIds = [req.user._id, ...members.map((m) => m._id)];

    let conversation = await Conversation.create({
      isGroup: true,
      name,
      participants: participantIds,
    });
    conversation = await conversation.populate("participants", "username");

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getConversations,
  getConversationById,
  getOrCreateDirectConversation,
  createGroupConversation,
};
