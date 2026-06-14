import { useState, useEffect } from "react";
import api from "../services/api";

function NewConversationModal({ onClose, onCreated }) {
  const [users, setUsers] = useState([]);
  const [mode, setMode] = useState("direct"); // "direct" | "group"
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users");
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    };
    fetchUsers();
  }, []);

  const toggleSelect = (username) => {
    setSelected((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const startDirect = async (username) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/conversations/direct", { username });
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start conversation");
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    setError("");
    if (!groupName.trim()) return setError("Group name is required");
    if (selected.length === 0) return setError("Pick at least one member");

    setLoading(true);
    try {
      const { data } = await api.post("/conversations/group", {
        name: groupName.trim(),
        usernames: selected,
      });
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          z-index: 50;
        }
        .modal-card {
          width: 360px; max-height: 520px;
          background: var(--panel);
          border: 1px solid var(--border-strong);
          border-radius: 20px;
          padding: 20px;
          display: flex; flex-direction: column; gap: 14px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5);
          font-family: 'Sora', sans-serif;
        }
        .modal-header { display: flex; align-items: center; justify-content: space-between; }
        .modal-header h3 { color: var(--text); font-size: 16px; font-weight: 600; }
        .modal-close {
          background: transparent; border: none; color: var(--text-dim);
          cursor: pointer; font-size: 16px; line-height: 1;
        }
        .modal-tabs { display: flex; gap: 8px; }
        .modal-tabs button {
          flex: 1; padding: 8px; border-radius: 10px; border: 1px solid var(--border-strong);
          background: transparent; color: var(--text-dim); cursor: pointer; font-size: 12.5px;
          font-family: 'Sora', sans-serif; transition: background 0.15s, color 0.15s;
        }
        .modal-tabs button.active { background: var(--accent); color: white; border-color: var(--accent); }
        .modal-error {
          background: rgba(255,99,99,0.1); border: 1px solid rgba(255,99,99,0.3);
          color: var(--danger); font-size: 12px; padding: 8px 12px; border-radius: 8px;
        }
        .modal-hint { color: var(--text-faint); font-size: 12.5px; text-align: center; padding: 12px; }
        .user-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; max-height: 240px; }
        .user-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 10px; border: none;
          background: var(--panel-alt); color: var(--text); cursor: pointer;
          font-size: 13px; font-family: 'Sora', sans-serif; text-align: left;
          width: 100%; transition: background 0.15s;
        }
        .user-row:hover { background: rgba(108,142,255,0.12); }
        .user-row:disabled { opacity: 0.6; cursor: not-allowed; }
        .user-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(108,142,255,0.2); color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; flex-shrink: 0;
        }
        .group-form { display: flex; flex-direction: column; gap: 10px; }
        .group-form input[type="text"] {
          background: var(--panel-alt); border: 1px solid var(--border-strong);
          border-radius: 10px; padding: 10px 12px; color: var(--text);
          font-size: 13px; font-family: 'Sora', sans-serif; outline: none;
        }
        .group-form input[type="text"]:focus { border-color: rgba(108,142,255,0.4); }
        .primary-btn {
          background: var(--accent); color: white; border: none;
          border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: background 0.15s;
        }
        .primary-btn:hover { background: var(--accent-strong); }
        .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>New chat</h3>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-tabs">
            <button
              className={mode === "direct" ? "active" : ""}
              onClick={() => setMode("direct")}
            >
              Direct message
            </button>
            <button
              className={mode === "group" ? "active" : ""}
              onClick={() => setMode("group")}
            >
              Group
            </button>
          </div>

          {error && <p className="modal-error">{error}</p>}

          {mode === "direct" ? (
            <div className="user-list">
              {users.length === 0 && <p className="modal-hint">No other users yet.</p>}
              {users.map((u) => (
                <button
                  key={u._id}
                  className="user-row"
                  onClick={() => startDirect(u.username)}
                  disabled={loading}
                >
                  <span className="user-avatar">{u.username.charAt(0).toUpperCase()}</span>
                  {u.username}
                </button>
              ))}
            </div>
          ) : (
            <div className="group-form">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <div className="user-list">
                {users.length === 0 && <p className="modal-hint">No other users yet.</p>}
                {users.map((u) => {
                  const isSelected = selected.includes(u.username);
                  return (
                    <button
                      key={u._id}
                      className="user-row"
                      onClick={() => toggleSelect(u.username)}
                      style={{
                        outline: isSelected ? "2px solid var(--accent)" : "none",
                      }}
                    >
                      <span className="user-avatar">{u.username.charAt(0).toUpperCase()}</span>
                      {u.username}
                      {isSelected && <span style={{ marginLeft: "auto" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <button className="primary-btn" onClick={createGroup} disabled={loading}>
                {loading ? "Creating..." : "Create group"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NewConversationModal;
