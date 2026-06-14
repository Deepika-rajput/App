function EmptyState() {
  return (
    <>
      <style>{`
        .empty-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-faint);
          gap: 10px;
          font-size: 13px;
          font-family: 'Sora', sans-serif;
        }
        .empty-panel .empty-icon { font-size: 36px; }
      `}</style>

      <div className="empty-panel">
        <span className="empty-icon">💬</span>
        <span>Select a conversation or start a new chat</span>
      </div>
    </>
  );
}

export default EmptyState;
