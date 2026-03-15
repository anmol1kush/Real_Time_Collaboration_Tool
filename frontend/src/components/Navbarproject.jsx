import { useState } from "react";
import { useAuth } from "../auth/authContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import {
  LogOut, UserPlus, Send, Loader2, Check, X, Clock,
  LayoutDashboard, Users, ChevronDown, Github
} from "lucide-react";

/* ── Status pill styles ── */
const STATUS_STYLES = {
  PENDING:  { icon: Clock,  cls: "text-yellow-400 border-yellow-800/60 bg-yellow-950/40" },
  ACCEPTED: { icon: Check,  cls: "text-emerald-400 border-emerald-800/60 bg-emerald-950/40" },
  REJECTED: { icon: X,      cls: "text-red-400 border-red-800/60 bg-red-950/40" },
};

/* ── Invite Modal ── */
function InviteModal({ projectId, onClose }) {
  const [email, setEmail]     = useState("");
  const [invites, setInvites] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loaded, setLoaded]   = useState(false);

  /* load invites once on open */
  useState(() => {
    if (loaded) return;
    setLoaded(true);
    api.get(`/projects/${projectId}/invites`)
      .then(r => setInvites(r.data))
      .catch(() => {});
  });

  async function handleSend(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(""); setSuccess("");
    try {
      const res = await api.post(`/projects/${projectId}/invite`, { email });
      setInvites(prev => [res.data, ...prev]);
      setSuccess(`Invite sent to ${email}`);
      setEmail("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invite.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="fixed top-16 right-6 z-50 w-80 rounded-2xl border border-white/[0.08]
          bg-[#0a0a0a] shadow-2xl shadow-black/60 overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(75,85,99,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(75,85,99,0.2) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]
          bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30
              flex items-center justify-center">
              <Users size={13} className="text-[#00ff9d]" />
            </div>
            <span className="text-sm font-semibold text-white/90">Invite Members</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg
              hover:bg-white/[0.06]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4">
          <form onSubmit={handleSend} className="space-y-3">
            <input
              type="email"
              required
              placeholder="teammate@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                text-sm text-white placeholder:text-white/25 focus:outline-none
                focus:border-[#00ff9d]/50 focus:bg-white/[0.06] transition-all"
            />
            <motion.button
              type="submit"
              disabled={sending}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-xl border border-[#00ff9d]/40 text-[#00ff9d]
                text-sm font-medium hover:bg-[#00ff9d]/10 transition-all flex items-center
                justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                tracking-wide"
            >
              {sending
                ? <Loader2 size={14} className="animate-spin" />
                : <><Send size={13} /><span>Send Invite</span></>
              }
            </motion.button>
          </form>

          <AnimatePresence>
            {success && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[#00ff9d] text-xs mt-3 flex items-center gap-1.5"
              >
                <Check size={11} /> {success}
              </motion.p>
            )}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs mt-3 flex items-center gap-1.5"
              >
                <X size={11} /> {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Sent invites */}
        {invites.length > 0 && (
          <div className="border-t border-white/[0.06] px-4 pb-4">
            <p className="text-[10px] font-semibold text-white/30 tracking-widest uppercase
              mt-3 mb-2">
              Sent Invites
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5
              scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {invites.map(inv => {
                const { icon: Icon, cls } = STATUS_STYLES[inv.status] || STATUS_STYLES.PENDING;
                return (
                  <div
                    key={inv.id}
                    className={`flex items-center justify-between px-3 py-2 border rounded-xl
                      text-[11px] ${cls}`}
                  >
                    <span className="truncate flex-1 text-white/70">{inv.email}</span>
                    <span className="flex items-center gap-1 ml-2 flex-shrink-0 font-medium">
                      <Icon size={10} />
                      {inv.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ══════════════════════════════════
   MAIN NAVBAR COMPONENT
══════════════════════════════════ */
export default function NavbarProject({ projectId }) {
  const { logout, githubConnected } = useAuth();
  const [showInvite, setShowInvite] = useState(false);

  const handleConnectGithub = () => {
    const token = localStorage.getItem("token");
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/github/connect?token=${token}`;
  };

  return (
    <>
      <nav
        className="flex items-center justify-between px-5 py-0 border-b border-white/[0.06]
          relative z-30"
        style={{
          height: 56,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)",
          backgroundImage: `
            linear-gradient(to right, rgba(75,85,99,0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(75,85,99,0.25) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      >
        {/* ── Left: Logo + brand ── */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30
            flex items-center justify-center transition-all group-hover:bg-[#00ff9d]/20
            group-hover:border-[#00ff9d]/50">
            <LayoutDashboard size={15} className="text-[#00ff9d]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight text-[#00ff9d] font-mono">
              RTCT
            </span>
            <span className="text-[9px] text-white/25 tracking-widest uppercase">
              Workspace
            </span>
          </div>
        </Link>

        {/* ── Right: GitHub + Invite + Logout ── */}
        <div className="flex items-center gap-2">
          {/* GitHub Connect Button */}
          {githubConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
              bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d]">
              <Github size={12} />
              <span>GitHub ✓</span>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConnectGithub}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
                border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all"
            >
              <Github size={13} />
              <span>Connect GitHub</span>
            </motion.button>
          )}

          <div className="w-px h-4 bg-white/[0.08] mx-1" />

          {/* Invite button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowInvite(v => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
              border transition-all
              ${showInvite
                ? "bg-[#00ff9d]/15 border-[#00ff9d]/50 text-[#00ff9d]"
                : "border-[#00ff9d]/30 text-[#00ff9d]/80 hover:bg-[#00ff9d]/10 hover:border-[#00ff9d]/50 hover:text-[#00ff9d]"
              }`}
          >
            <UserPlus size={14} />
            <span>Invite</span>
          </motion.button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.08]" />

          {/* Logout button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
              border border-red-500/30 text-red-400/80 hover:bg-red-500/10
              hover:border-red-500/50 hover:text-red-400 transition-all"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </motion.button>
        </div>
      </nav>

      {/* ── Invite modal ── */}
      {showInvite && (
        <InviteModal
          projectId={projectId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}