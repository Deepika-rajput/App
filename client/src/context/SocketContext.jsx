import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Open a single authenticated socket connection per session.
  // It stays alive across route changes so presence/typing work
  // regardless of which conversation is open.
  useEffect(() => {
    if (!user) {
      setSocket(null);
      setOnlineUsers([]);
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token: user.token },
    });

    newSocket.on("online_users", (userIds) => setOnlineUsers(userIds));
    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
