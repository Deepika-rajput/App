const express = require("express");
const {
  getConversations,
  getConversationById,
  getOrCreateDirectConversation,
  createGroupConversation,
} = require("../controllers/conversationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getConversations);
router.get("/:id", protect, getConversationById);
router.post("/direct", protect, getOrCreateDirectConversation);
router.post("/group", protect, createGroupConversation);

module.exports = router;
