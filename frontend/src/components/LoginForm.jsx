import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import { useAuth } from "../auth/authContext";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm mx-auto p-8 border border-zinc-800 bg-black relative z-10"
    >
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-2 tracking-widest uppercase">Login</h2>
        <p className="text-zinc-600 text-xs tracking-wider">ENTER CREDENTIALS TO ACCESS DASHBOARD</p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-3 border border-red-900 bg-red-950/30 text-red-500 text-xs">
          {error}
        </motion.div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs text-zinc-500 tracking-wider">EMAIL</label>
          <div className="relative">
            <input
              type="email"
              required
              placeholder="user@system.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-800 py-2 text-sm text-white focus:outline-none focus:border-[#00ff9d] transition-colors placeholder:text-zinc-800"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500 tracking-wider">PASSWORD</label>
          <div className="relative">
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-800 py-2 text-sm text-white focus:outline-none focus:border-[#00ff9d] transition-colors placeholder:text-zinc-800"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-4 border border-[#00ff9d] text-[#00ff9d] text-sm hover:bg-[#00ff9d]/10 transition-colors flex items-center justify-center gap-2 tracking-widest rounded-full uppercase"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : "Submit"}
        </button>
      </form>

      <p className="mt-8 text-xs text-zinc-600 tracking-wider">
        NO ACCOUNT?{' '}
        <Link to="/signup" className="text-zinc-400 hover:text-[#00ff9d] transition-colors border-b border-zinc-800 hover:border-[#00ff9d]">
          REGISTER HERE
        </Link>
      </p>
    </motion.div>
  );
}
