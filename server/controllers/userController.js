const User = require("../models/User");

// @desc    List all other registered users (so the current user can
//          start a new direct or group conversation with them)
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("username email")
      .sort({ username: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers };
