import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for token check to finish
  if (!user) return <Navigate to="/login" />;
  return children;
}
