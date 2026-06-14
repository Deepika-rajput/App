import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on first load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("userId");

    if (token && username && userId) {
      setUser({ token, username, id: userId });
    }
    setLoading(false);
  }, []);

  const saveSession = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.username);
    localStorage.setItem("userId", data._id);
    setUser({ token: data.token, username: data.username, id: data._id });
  };

  const register = async (username, email, password) => {
    const { data } = await api.post("/auth/register", { username, email, password });
    saveSession(data);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveSession(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
