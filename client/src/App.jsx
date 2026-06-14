import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatWindow from "./components/ChatWindow";
import ChatLayout from "./pages/ChatLayout";
import EmptyState from "./pages/EmptyState";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ChatLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<EmptyState />} />
              <Route path="chat/:conversationId" element={<ChatWindow />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
