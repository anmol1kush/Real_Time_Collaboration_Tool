import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [githubConnected, setGithubConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setUser(res.data.user);
        
        // Also fetch GitHub status once user is loaded
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/github/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(ghRes => setGithubConnected(ghRes.data?.connected || false))
        .catch(() => setGithubConnected(false));
      })
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, githubConnected, setGithubConnected }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}