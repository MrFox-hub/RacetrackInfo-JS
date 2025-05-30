import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PropTypes from "prop-types";

const ProtectedRoute = ({ role, children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <p>Loading...</p>;

  // 🧠 Grant access if user role matches OR is 'developer'
  if (!user || (user.role !== role && user.role !== "developer")) {
    console.warn("⛔ Access denied. Redirecting to home.");
    return <Navigate to="/" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  role: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
