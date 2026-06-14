import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import NewConversationModal from "./NewConversationModal";

function getConversationLabel(conversation, currentUserId) {
  if (conversation.isGroup) return conversation.name || "Group chat";
  const other = conversation.participants.find((p) => p._id !== currentUserId);
  return other ? other.username : "Unknown user";
}

function Sidebar() {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId: activeId } = useParams();

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get("/conversations");
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, location.pathname]);

  // Keep previews + ordering fresh as new messages arrive anywhere
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message) => {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c._id === message.conversation
            ? {
                ...c,
                lastMessage: {
                  text: message.text,
                  senderUsername: message.senderUsername,
                  createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
              }
            : c
        );
        return [...updated].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on("message", handleMessage);
    return () => socket.off("message", handleMessage);
  }, [socket]);

  const handleCreated = (conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c._id === conversation._id);
      return exists ? prev : [conversation, ...prev];
    });
    setShowModal(false);
    navigate(`/chat/${conversation._id}`);
  };

  return (
    <>
      <style>{`
        .sidebar {
          width: 300px;
          flex-shrink: 0;
          background: var(--panel);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Sora', sans-serif;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 16px;
          border-bottom: 1px solid var(--border);
        }
        .me { display: flex; align-items: center; gap: 10px; }
        .me-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(108,142,255,0.2); color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 600;
        }
        .me-name { font-size: 14px; font-weight: 600; color: var(--text); }
        .me-status {
          font-size: 11px; color: var(--online);
          display: flex; align-items: center; gap: 5px; margin-top: 2px;
        }
        .me-status .dot { width: 6px; height: 6px; background: var(--online); border-radius: 50%; }
        .icon-btn {
          background: transparent; border: 1px solid var(--border-strong);
          color: var(--text-dim); width: 32px; height: 32px; border-radius: 10px;
          cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .icon-btn:hover { background: rgba(255,99,99,0.1); color: var(--danger); border-color: rgba(255,99,99,0.3); }

        .new-chat-btn {
          margin: 12px 16px;
          background: var(--accent);
          color: white; border: none; border-radius: 12px;
          padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .new-chat-btn:hover { background: var(--accent-strong); }

        .conversation-list { flex: 1; overflow-y: auto; padding: 0 8px 12px; }
        .empty-hint { color: var(--text-faint); font-size: 12.5px; text-align: center; padding: 24px 12px; }

        .conversation-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 8px; border-radius: 12px; cursor: pointer;
          transition: background 0.15s;
        }
        .conversation-item:hover { background: var(--panel-alt); }
        .conversation-item.active { background: var(--panel-alt); border: 1px solid var(--border-strong); }

        .conv-avatar {
          position: relative;
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--panel-alt); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; color: var(--text); flex-shrink: 0;
        }
        .online-dot {
          position: absolute; bottom: -1px; right: -1px;
          width: 10px; height: 10px; background: var(--online);
          border-radius: 50%; border: 2px solid var(--panel);
        }
        .conv-info { min-width: 0; flex: 1; }
        .conv-name { font-size: 13.5px; font-weight: 600; color: var(--text); }
        .conv-preview {
          font-size: 12px; color: var(--text-dim);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 2px;
        }
      `}</style>

      <div className="sidebar">
        <div className="sidebar-header">
          <div className="me">
            <div className="me-avatar">{user.username.charAt(0).toUpperCase()}</div>
            <div>
              <div className="me-name">{user.username}</div>
              <div className="me-status"><span className="dot" /> Online</div>
            </div>
          </div>
          <button className="icon-btn" onClick={logout} title="Logout">⏻</button>
        </div>

        <button className="new-chat-btn" onClick={() => setShowModal(true)}>
          + New chat
        </button>

        <div className="conversation-list">
          {conversations.length === 0 && (
            <div className="empty-hint">No conversations yet. Start one!</div>
          )}
          {conversations.map((conversation) => {
            const label = getConversationLabel(conversation, user.id);
            const other = !conversation.isGroup
              ? conversation.participants.find((p) => p._id !== user.id)
              : null;
            const isOnline = other && onlineUsers.includes(other._id);

            return (
              <div
                key={conversation._id}
                className={`conversation-item ${activeId === conversation._id ? "active" : ""}`}
                onClick={() => navigate(`/chat/${conversation._id}`)}
              >
                <div className="conv-avatar">
                  {conversation.isGroup ? "👥" : label.charAt(0).toUpperCase()}
                  {!conversation.isGroup && isOnline && <span className="online-dot" />}
                </div>
                <div className="conv-info">
                  <div className="conv-name">{label}</div>
                  <div className="conv-preview">
                    {conversation.lastMessage?.text
                      ? `${conversation.lastMessage.senderUsername}: ${conversation.lastMessage.text}`
                      : "No messages yet"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showModal && (
          <NewConversationModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
        )}
      </div>
    </>
  );
}

export default Sidebar;
