import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function ChatLayout() {
  return (
    <>
      <style>{`
        .app-shell {
          display: flex;
          width: 100vw;
          height: 100vh;
          background: var(--bg);
          overflow: hidden;
        }
        .main-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100vh;
        }
      `}</style>

      <div className="app-shell">
        <Sidebar />
        <div className="main-panel">
          <Outlet />
        </div>
      </div>
    </>
  );
}

export default ChatLayout;
