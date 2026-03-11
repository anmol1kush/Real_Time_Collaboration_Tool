import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { Send, Loader2, Check, X, Clock, Users } from "lucide-react";

const STATUS_STYLES = {
  PENDING: { icon: Clock, cls: "text-yellow-400 border-yellow-900 bg-yellow-950/20" },
  ACCEPTED: { icon: Check, cls: "text-[#00ff9d] border-[#00ff9d]/30 bg-[#00ff9d]/10" },
  REJECTED: { icon: X, cls: "text-red-400 border-red-900 bg-red-950/20" },
};

export default function InviteBox({ projectId }) {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { fetchInvites(); }, [projectId]);

  async function fetchInvites() {
    try {
      const res = await api.get(`/projects/${projectId}/invites`);
      setInvites(res.data);
    } catch {
      // non-admin users won't have access — silently ignore
    }
  }

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
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Send invite */}
      <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-950">
        <div className="flex items-center gap-2 mb-4">
          <Users size={14} className="text-[#00ff9d]" />
          <h3 className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">Invite Member</h3>
        </div>

        <form onSubmit={handleSend} className="space-y-3">
          <input
            type="email"
            required
            placeholder="teammate@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-transparent border-b border-zinc-800 py-2 text-sm text-white focus:outline-none focus:border-[#00ff9d] transition-colors placeholder:text-zinc-700"
          />
          <button
            type="submit"
            disabled={sending}
            className="w-full py-2 border border-[#00ff9d]/50 text-[#00ff9d] text-xs hover:bg-[#00ff9d]/10 transition-colors flex items-center justify-center gap-2 rounded tracking-widest uppercase"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Send Invite</>}
          </button>
        </form>

        <AnimatePresence>
          {success && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[#00ff9d] text-xs mt-3">
              ✓ {success}
            </motion.p>
          )}
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-red-400 text-xs mt-3">
              ✗ {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Invite list */}
      {invites.length > 0 && (
        <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-950">
          <h3 className="text-xs font-semibold text-zinc-400 tracking-widest uppercase mb-3">Sent Invites</h3>
          <div className="space-y-2">
            {invites.map(inv => {
              const { icon: Icon, cls } = STATUS_STYLES[inv.status] || STATUS_STYLES.PENDING;
              return (
                <div key={inv.id} className={`flex items-center justify-between px-3 py-2 border rounded text-xs ${cls}`}>
                  <span className="truncate flex-1 text-white/80">{inv.email}</span>
                  <span className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <Icon size={11} />
                    {inv.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}