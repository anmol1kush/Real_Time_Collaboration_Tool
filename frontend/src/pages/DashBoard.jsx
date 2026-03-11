import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import Navbar from "../components/Nav/Navbar";
import { Plus, Trash2, X, FolderOpen, Users, CheckSquare, Loader2 } from "lucide-react";

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800",
];

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Create form state
  const [form, setForm] = useState({ name: "", githubRepo: "" });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  /* ---------- Fetch projects ---------- */
  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      setError("Failed to load projects. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Create project ---------- */
  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return setFormError("Project name is required");
    setCreating(true);
    setFormError("");
    try {
      const res = await api.post("/projects", {
        name: form.name.trim(),
        githubRepo: form.githubRepo.trim(),
      });
      setProjects(prev => [res.data, ...prev]);
      setForm({ name: "", githubRepo: "" });
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  /* ---------- Delete project ---------- */
  async function handleDelete(e, projectId) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(projectId);
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete project");
    } finally {
      setDeleting(null);
    }
  }

  /* ---------- Render ---------- */
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-black text-white">
        <div className="px-[8%] pt-10 pb-20">

          {/* Header row */}
          <div className="flex items-center justify-between my-8">
            <h2 className="text-4xl font-bold tracking-tight">Projects</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 border border-[#00ff9d] text-[#00ff9d] text-sm hover:bg-[#00ff9d]/10 transition-colors rounded-full tracking-widest uppercase"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 border border-red-900 bg-red-950/30 text-red-400 text-sm rounded">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-52 bg-zinc-900 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <FolderOpen size={64} className="text-zinc-700 mb-6" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">No projects yet</h3>
              <p className="text-zinc-600 text-sm mb-8">Create your first project to start collaborating</p>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-6 py-3 border border-[#00ff9d] text-[#00ff9d] text-sm hover:bg-[#00ff9d]/10 transition-colors rounded-full tracking-widest uppercase"
              >
                <Plus size={16} /> Create Project
              </button>
            </motion.div>
          ) : (
            /* Project grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {projects.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link to={`/project/${p.id}`} className="block group">
                      <div className="relative h-52 rounded-xl overflow-hidden border border-zinc-800 hover:border-[#00ff9d]/40 transition-colors">
                        {/* Cover image */}
                        <img
                          src={COVER_IMAGES[i % COVER_IMAGES.length]}
                          alt={p.name}
                          className="w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-white text-lg leading-tight group-hover:text-[#00ff9d] transition-colors">
                                {p.name}
                              </h3>
                              {p.githubRepo && (
                                <p className="text-zinc-500 text-xs mt-1 truncate">{p.githubRepo}</p>
                              )}
                            </div>

                            {/* Delete (admin only) */}
                            {p.role === "ADMIN" && (
                              <button
                                onClick={(e) => handleDelete(e, p.id)}
                                disabled={deleting === p.id}
                                className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
                                title="Delete project"
                              >
                                {deleting === p.id
                                  ? <Loader2 size={14} className="animate-spin" />
                                  : <Trash2 size={14} />
                                }
                              </button>
                            )}
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Users size={11} />
                              {p._count?.memberships ?? 1} member{(p._count?.memberships ?? 1) !== 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckSquare size={11} />
                              {p._count?.tasks ?? 0} task{(p._count?.tasks ?? 0) !== 1 ? "s" : ""}
                            </span>
                            <span className={`ml-auto px-2 py-0.5 rounded text-[10px] border ${p.role === "ADMIN"
                                ? "border-[#00ff9d]/40 text-[#00ff9d]"
                                : "border-zinc-700 text-zinc-400"
                              }`}>
                              {p.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-8 relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-1">New Project</h3>
              <p className="text-zinc-600 text-xs tracking-wider mb-8">INITIALIZE A WORKSPACE</p>

              {formError && (
                <div className="mb-5 p-3 border border-red-900 bg-red-950/30 text-red-400 text-xs rounded">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 tracking-wider">PROJECT NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="My Awesome Project"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-transparent border-b border-zinc-800 py-2 text-sm text-white focus:outline-none focus:border-[#00ff9d] transition-colors placeholder:text-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 tracking-wider">GITHUB REPO <span className="text-zinc-700">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="https://github.com/user/repo"
                    value={form.githubRepo}
                    onChange={e => setForm(f => ({ ...f, githubRepo: e.target.value }))}
                    className="w-full bg-transparent border-b border-zinc-800 py-2 text-sm text-white focus:outline-none focus:border-[#00ff9d] transition-colors placeholder:text-zinc-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 mt-2 border border-[#00ff9d] text-[#00ff9d] text-sm hover:bg-[#00ff9d]/10 transition-colors flex items-center justify-center gap-2 tracking-widest rounded-full uppercase"
                >
                  {creating ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Create Project</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}