import { useAuth } from "../auth/authContext";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { logout } = useAuth();

  return (
    <div className="flex justify-between items-center bg-gray-800 p-4">
      <Link to="/dashboard" className="font-bold text-xl">RTCT</Link>
      <button
        onClick={logout}
        className="bg-red-600 px-3 py-1 rounded"
      >
        Logout
      </button>
    </div>
  );
}