import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const EMOJIS = [
  "😀","😂","😍","🥹","😎","😭","😅","🤔","🥳","😴",
  "👍","👎","👏","🙌","🤝","❤️","🔥","✨","🎉","💯",
  "😡","😱","🤯","🥺","😇","🤗","😏","🫡","💀","🫠",
];

// How long to keep showing "X is typing…" if a stop_typing event never arrives
const TYPING_TIMEOUT = 3000;
// How long after the last keystroke to tell others typing has stopped
const STOP_TYPING_DELAY = 1500;

function ChatWindow() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingClearRef = useRef(null);
  const stopTypingRef = useRef(null);

  // ── Load conversation details + message history whenever the route changes ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setConversation(null);
    setTypingUser(null);

    const load = async () => {
      try {
        const [convoRes, messagesRes] = await Promise.all([
          api.get(`/conversations/${conversationId}`),
          api.get(`/messages/${conversationId}`),
        ]);
        if (cancelled) return;
        setConversation(convoRes.data);
        setMessages(messagesRes.data);
      } catch (err) {
        console.error("Failed to load conversation:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // ── Join/leave this conversation's socket room ──
  useEffect(() => {
    if (!socket) return;
    socket.emit("join_conversation", conversationId);
    return () => socket.emit("leave_conversation", conversationId);
  }, [socket, conversationId]);

  // ── Listen for messages + typing events scoped to this conversation ──
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message) => {
      if (message.conversation !== conversationId) return;
      setMessages((prev) => [...prev, message]);
    };

    const handleTyping = ({ conversationId: cid, username }) => {
      if (cid !== conversationId || username === user.username) return;
      setTypingUser(username);
      clearTimeout(typingClearRef.current);
      typingClearRef.current = setTimeout(() => setTypingUser(null), TYPING_TIMEOUT);
    };

    const handleStopTyping = ({ conversationId: cid, username }) => {
      if (cid !== conversationId || username === user.username) return;
      setTypingUser((prev) => (prev === username ? null : prev));
    };

    socket.on("message", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);

    return () => {
      socket.off("message", handleMessage);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
      clearTimeout(typingClearRef.current);
    };
  }, [socket, conversationId, user.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = messageInput.trim();
    if (!text || !socket) return;

    socket.emit("message", { conversationId, text });

    clearTimeout(stopTypingRef.current);
    socket.emit("stop_typing", conversationId);

    setMessageInput("");
    setShowEmojis(false);
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (!socket) return;

    socket.emit("typing", conversationId);
    clearTimeout(stopTypingRef.current);
    stopTypingRef.current = setTimeout(() => {
      socket.emit("stop_typing", conversationId);
    }, STOP_TYPING_DELAY);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const addEmoji = (emoji) => {
    setMessageInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  if (loading || !conversation) {
    return (
      <>
        <style>{`
          .chat-window.loading {
            flex: 1; display: flex; align-items: center; justify-content: center;
            color: var(--text-faint); font-family: 'Sora', sans-serif; font-size: 13px;
          }
        `}</style>
        <div className="chat-window loading">
          <span>{loading ? "Loading…" : "Conversation not found"}</span>
        </div>
      </>
    );
  }

  const otherParticipant = !conversation.isGroup
    ? conversation.participants.find((p) => p._id !== user.id)
    : null;
  const headerName = conversation.isGroup
    ? conversation.name
    : otherParticipant?.username || "Unknown user";
  const isOnline = otherParticipant && onlineUsers.includes(otherParticipant._id);

  return (
    <>
      <style>{`
        .chat-window {
          flex: 1;
          display: flex; flex-direction: column;
          height: 100vh; min-width: 0;
          background: var(--panel);
          font-family: 'Sora', sans-serif;
        }

        /* Header */
        .chat-header {
          display: flex; align-items: center; gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
        }
        .header-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(108,142,255,0.2); color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 600; flex-shrink: 0;
        }
        .header-name { font-size: 15px; font-weight: 600; color: var(--text); }
        .header-status {
          font-size: 12px; color: var(--text-dim);
          display: flex; align-items: center; gap: 5px; margin-top: 2px;
        }
        .header-status .status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .header-status .status-dot.online { background: var(--online); }
        .header-status .status-dot.offline { background: var(--text-faint); }
        .typing-text { color: var(--accent); font-style: italic; }

        /* Messages */
        .messages-area {
          flex: 1; overflow-y: auto;
          padding: 20px;
          display: flex; flex-direction: column; gap: 10px;
          scrollbar-width: thin; scrollbar-color: #222736 transparent;
        }
        .messages-area::-webkit-scrollbar { width: 4px; }
        .messages-area::-webkit-scrollbar-thumb { background: #222736; border-radius: 2px; }

        .msg-row { display: flex; flex-direction: column; }
        .msg-row.mine   { align-items: flex-end; }
        .msg-row.theirs { align-items: flex-start; }

        .bubble {
          max-width: 60%;
          padding: 10px 14px;
          font-size: 13.5px; line-height: 1.5;
          word-break: break-word;
        }
        .bubble.mine {
          background: var(--accent-strong);
          color: white;
          border-radius: 18px 18px 6px 18px;
        }
        .bubble.theirs {
          background: var(--panel-alt);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 18px 18px 18px 6px;
        }
        .msg-time {
          font-size: 10px; color: var(--text-faint);
          margin-top: 4px; padding: 0 4px;
        }
        .msg-label {
          font-size: 10px; font-weight: 600;
          margin-bottom: 3px; padding: 0 4px;
        }
        .msg-label.mine   { color: var(--accent); }
        .msg-label.theirs { color: var(--text-dim); }

        .empty-state {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: var(--text-faint); gap: 10px; font-size: 13px;
        }
        .empty-icon { font-size: 36px; }

        /* Emoji picker */
        .emoji-picker {
          position: absolute;
          bottom: 76px; left: 16px; right: 16px;
          background: var(--panel-alt);
          border: 1px solid var(--border-strong);
          border-radius: 16px;
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 4px;
          z-index: 10;
          box-shadow: 0 -8px 32px rgba(0,0,0,0.4);
        }
        .emoji-btn {
          border: none; background: transparent;
          font-size: 20px; cursor: pointer;
          padding: 4px; border-radius: 8px;
          transition: background 0.1s;
          display: flex; align-items: center; justify-content: center;
        }
        .emoji-btn:hover { background: rgba(255,255,255,0.08); }

        /* Input bar */
        .input-bar { padding: 14px 16px; border-top: 1px solid var(--border); position: relative; }
        .input-container {
          display: flex; align-items: center; gap: 8px;
          background: var(--panel-alt);
          border: 1px solid var(--border-strong);
          border-radius: 14px; padding: 10px 14px;
          transition: border-color 0.2s;
        }
        .input-container:focus-within { border-color: rgba(108,142,255,0.4); }
        .msg-input {
          flex: 1; background: transparent;
          border: none; outline: none;
          color: var(--text); font-family: 'Sora', sans-serif; font-size: 13.5px;
        }
        .msg-input::placeholder { color: var(--text-faint); }
        .emoji-toggle {
          border: none; background: transparent;
          font-size: 18px; cursor: pointer; padding: 2px;
          border-radius: 6px; flex-shrink: 0;
          transition: transform 0.15s;
        }
        .emoji-toggle:hover { transform: scale(1.2); }
        .send-btn {
          width: 34px; height: 34px; border-radius: 10px; border: none;
          background: var(--accent); color: white; cursor: pointer; font-size: 15px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.15s, transform 0.1s;
        }
        .send-btn:hover { background: var(--accent-strong); }
        .send-btn:active { transform: scale(0.95); }
      `}</style>

      <div className="chat-window">
        {/* Header */}
        <div className="chat-header">
          <div className="header-avatar">
            {conversation.isGroup ? "👥" : headerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="header-name">{headerName}</div>
            <div className="header-status">
              {typingUser ? (
                <span className="typing-text">{typingUser} is typing…</span>
              ) : conversation.isGroup ? (
                <span>{conversation.participants.length} members</span>
              ) : (
                <>
                  <span className={`status-dot ${isOnline ? "online" : "offline"}`} />
                  {isOnline ? "Online" : "Offline"}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">💬</span>
              <span>No messages yet. Say hello!</span>
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.sender === user.id;
            return (
              <div key={msg._id} className={`msg-row ${isMine ? "mine" : "theirs"}`}>
                {conversation.isGroup && (
                  <div className={`msg-label ${isMine ? "mine" : "theirs"}`}>
                    {isMine ? "You" : msg.senderUsername}
                  </div>
                )}
                <div className={`bubble ${isMine ? "mine" : "theirs"}`}>{msg.text}</div>
                <span className="msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Picker */}
        {showEmojis && (
          <div className="emoji-picker">
            {EMOJIS.map((emoji) => (
              <button key={emoji} className="emoji-btn" onClick={() => addEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="input-bar">
          <div className="input-container">
            <button className="emoji-toggle" onClick={() => setShowEmojis((v) => !v)}>
              😊
            </button>
            <input
              ref={inputRef}
              className="msg-input"
              type="text"
              placeholder="Type a message…"
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKey}
            />
            <button className="send-btn" onClick={sendMessage}>➤</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatWindow;
