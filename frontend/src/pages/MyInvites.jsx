import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Nav/Navbar";
import { Check, X, Clock, FolderOpen, Loader2 } from "lucide-react";

export default function MyInvites() {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(null); // inviteId being acted on
    const navigate = useNavigate();

    useEffect(() => { fetchInvites(); }, []);

    async function fetchInvites() {
        try {
            // Get the current user's email from /auth/me, then find pending invites
            // Since API returns user's own data, we check invites via a dedicated endpoint
            const res = await api.get("/invites/mine");
            setInvites(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(inviteId, action) {
        setActing(inviteId);
        try {
            const res = await api.post(`/projects/invite/${inviteId}/${action}`);
            if (action === "accept") {
                navigate(`/project/${res.data.projectId}`);
            } else {
                setInvites(prev => prev.filter(i => i.id !== inviteId));
            }
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${action} invite`);
        } finally {
            setActing(null);
        }
    }

    return (
        <>
            <Navbar />
            <div className="min-h-screen w-full bg-black relative text-white">
                {/* Black Basic Grid Background */}
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    background: "#000000",
                    backgroundImage: `
                      linear-gradient(to right, rgba(75, 85, 99, 0.4) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(75, 85, 99, 0.4) 1px, transparent 1px)
                    `,
                    backgroundSize: "40px 40px",
                  }}
                />

                <div className="relative z-10 px-[8%] pt-10 pb-20">
                    <h2 className="text-4xl font-bold tracking-tight mb-8">My Invites</h2>

                {loading ? (
                    <div className="flex items-center gap-2 text-zinc-500">
                        <Loader2 className="animate-spin" size={16} /> Loading invites...
                    </div>
                ) : invites.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center py-24 text-center">
                        <FolderOpen size={56} className="text-zinc-700 mb-4" />
                        <p className="text-zinc-500">No pending invites</p>
                        <Link to="/dashboard" className="mt-6 text-xs text-[#00ff9d] border-b border-[#00ff9d]/30 hover:border-[#00ff9d]">
                            Go to Dashboard
                        </Link>
                    </motion.div>
                ) : (
                    <div className="space-y-3 max-w-xl">
                        <AnimatePresence>
                            {invites.map(inv => (
                                <motion.div key={inv.id}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="border border-zinc-800 rounded-xl p-5 bg-zinc-950 flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <p className="text-white font-medium">{inv.project?.name || "Project"}</p>
                                        <p className="text-zinc-500 text-xs mt-1 flex items-center gap-1">
                                            <Clock size={11} /> Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleAction(inv.id, "accept")}
                                            disabled={acting === inv.id}
                                            className="flex items-center gap-1.5 px-4 py-2 border border-[#00ff9d]/50 text-[#00ff9d] text-xs hover:bg-[#00ff9d]/10 rounded transition-colors"
                                        >
                                            {acting === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleAction(inv.id, "reject")}
                                            disabled={acting === inv.id}
                                            className="flex items-center gap-1.5 px-4 py-2 border border-red-900 text-red-400 text-xs hover:bg-red-950/30 rounded transition-colors"
                                        >
                                            <X size={12} /> Reject
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
                </div>
            </div>
        </>
    );
}
