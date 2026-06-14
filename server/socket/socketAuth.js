const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Runs once when a client tries to open a socket connection.
// The client must send the JWT as: io(URL, { auth: { token } })
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new Error("Authentication error: user not found"));
    }

    // Attach the verified user to the socket for use in event handlers
    socket.user = {
      id: user._id.toString(),
      username: user.username,
    };

    next();
  } catch (error) {
    next(new Error("Authentication error: invalid token"));
  }
};

module.exports = socketAuth;
