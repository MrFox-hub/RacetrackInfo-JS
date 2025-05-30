import { createContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { jwtDecode } from "jwt-decode";
import socket from "../utils/socket";

const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    return token && role ? { token, role } : null;
  });

  const [loading, setLoading] = useState(true);

  const isTokenExpired = (token) => {
    try {
      const { exp } = jwtDecode(token);
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  };

  // Handle token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // 🧠 Setup socket for initial connection
    socket.auth = { token: token || null };
    socket.connect(); // ✅ Connect as guest or with saved token

    if (token && role) {
      if (isTokenExpired(token)) {
        console.log("🔒 Token expired — logging out");
        logout();
      } else {
        setUser({ token, role });
      }
    }

    setLoading(false);
  }, []);

  // Timer to auto-logout when token expires
  useEffect(() => {
    if (user?.token) {
      try {
        const decoded = jwtDecode(user.token);
        const exp = decoded.exp * 1000; // convert to milliseconds
        const now = Date.now();
        const timeout = exp - now;

        if (timeout > 0) {
          const timer = setTimeout(() => {
            console.log("🔒 Token expired — auto-logging out");
            logout();
          }, timeout);

          return () => clearTimeout(timer);
        } else {
          logout();
        }
      } catch {
        logout();
      }
    }
  }, [user?.token]);

  const login = (token, role) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    setUser({ token, role });

    // ✅ Tell the socket to use the new token
    socket.auth = { token };
    socket.disconnect(); // close guest connection
    socket.connect(); // reconnect as authenticated
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);

    socket.auth = { token: null }; // 👈 clear auth
    socket.disconnect(); // reconnect as guest
    socket.connect();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { AuthContext, AuthProvider };
