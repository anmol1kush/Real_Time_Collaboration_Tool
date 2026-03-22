import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { Plus, Trash2, Loader2, CheckCircle2, Circle, Clock, X, ArrowRight } from "lucide-react";

/* ─── Column definitions ─── */
const COLUMNS = [
  {
    key: "TODO",
    label: "To Do",
    icon: Circle,
    headerGradient: "from-slate-700/60 to-slate-800/60",
    borderColor: "border-slate-500",
    topBar: "bg-slate-500",
    badge: "bg-slate-700 text-slate-300",
    cardBorder: "border-slate-700/60 hover:border-slate-500/80",
    cardGlow: "hover:shadow-slate-900/40",
    iconColor: "text-slate-400",
    moveBtnHover: "hover:bg-slate-700/50 hover:text-slate-200 hover:border-slate-500",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    icon: Clock,
    headerGradient: "from-blue-900/60 to-blue-950/60",
    borderColor: "border-blue-500",
    topBar: "bg-blue-500",
    badge: "bg-blue-900 text-blue-300",
    cardBorder: "border-blue-800/60 hover:border-blue-600/80",
    cardGlow: "hover:shadow-blue-900/40",
    iconColor: "text-blue-400",
    moveBtnHover: "hover:bg-blue-900/50 hover:text-blue-200 hover:border-blue-600",
  },
  {
    key: "DONE",
    label: "Done",
    icon: CheckCircle2,
    headerGradient: "from-emerald-900/60 to-emerald-950/60",
    borderColor: "border-emerald-500",
    topBar: "bg-emerald-500",
    badge: "bg-emerald-900 text-emerald-300",
    cardBorder: "border-emerald-800/60 hover:border-emerald-600/80",
    cardGlow: "hover:shadow-emerald-900/40",
    iconColor: "text-emerald-400",
    moveBtnHover: "hover:bg-emerald-900/50 hover:text-emerald-200 hover:border-emerald-600",
  },
];

/* ─── Toast component ─── */
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl pointer-events-auto
              ${t.type === "error"
                ? "bg-red-950/90 border-red-700/60 text-red-300"
                : "bg-emerald-950/90 border-emerald-700/60 text-emerald-300"
              }`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-current opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Component ─── */
export default function KanbanBoard({ projectId, socket }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState({ TODO: "", IN_PROGRESS: "", DONE: "" });
  const [adding, setAdding] = useState(null);
  const [creating, setCreating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [moving, setMoving] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  /* ── Toast helpers ── */
  function addToast(message, type = "error") {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3500);
  }
  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  /* ── Socket: real-time sync ── */
  useEffect(() => {
    if (!socket) return;

    // Another user created a task
    socket.on("kanban:created", (task) => {
      setTasks((prev) =>
        prev.some((t) => t.id === task.id) ? prev : [...prev, task]
      );
    });

    // Another user moved a task
    socket.on("kanban:updated", ({ taskId, status }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
    });

    // Another user deleted a task
    socket.on("kanban:deleted", ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    });

    return () => {
      socket.off("kanban:created");
      socket.off("kanban:updated");
      socket.off("kanban:deleted");
    };
  }, [socket]);

  /* ── Fetch ── */
  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  async function fetchTasks() {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/tasks`);
      setTasks(res.data);
    } catch {
      addToast("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Create ── */
  async function handleCreate(col) {
    const title = newTitle[col].trim();
    if (!title) return;
    setCreating(col);
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, { title, status: col });
      setTasks((prev) => [...prev, res.data]);
      setNewTitle((prev) => ({ ...prev, [col]: "" }));
      setAdding(null);
      addToast("Task created!", "success");
      // Notify other users in real-time
      socket?.emit("kanban:created", { projectId, task: res.data });
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create task.");
    } finally {
      setCreating(null);
    }
  }

  /* ── Move ── */
  async function handleMove(taskId, status) {
    setMoving(taskId);
    try {
      await api.put(`/tasks/${taskId}`, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
      // Notify other users in real-time
      socket?.emit("kanban:updated", { projectId, taskId, status });
    } catch {
      addToast("Failed to move task.");
    } finally {
      setMoving(null);
    }
  }

  /* ── Delete ── */
  async function handleDelete(taskId) {
    setDeleting(taskId);
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      // Notify other users in real-time
      socket?.emit("kanban:deleted", { projectId, taskId });
    } catch {
      addToast("Failed to delete task.");
    } finally {
      setDeleting(null);
    }
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className="rounded-2xl bg-[#0d1117] border border-white/5 overflow-hidden animate-pulse"
          >
            <div className={`h-1 w-full ${col.topBar} opacity-50`} />
            <div className="p-4 space-y-3">
              <div className="h-5 w-24 bg-white/5 rounded" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-white/[0.03] rounded-xl border border-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const ColIcon = col.icon;
          const colTasks = tasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className="flex flex-col rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0d1117] shadow-xl"
              style={{ minHeight: 340 }}
            >
              {/* Top accent bar */}
              <div className={`h-1 w-full ${col.topBar}`} />

              {/* Column header */}
              <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${col.headerGradient} border-b border-white/[0.06]`}>
                <div className="flex items-center gap-2.5">
                  <ColIcon size={15} className={col.iconColor} />
                  <span className="font-semibold text-sm text-white/90 tracking-wide">
                    {col.label}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${col.badge}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setAdding(adding === col.key ? null : col.key)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                    ${adding === col.key
                      ? "bg-white/10 text-white rotate-45"
                      : "text-white/30 hover:text-white hover:bg-white/10"
                    }`}
                  title={adding === col.key ? "Cancel" : "Add task"}
                >
                  <Plus size={15} />
                </motion.button>
              </div>

              {/* Add task input */}
              <AnimatePresence>
                {adding === col.key && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 border-b border-white/[0.06] bg-white/[0.02]">
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={newTitle[col.key]}
                          onChange={(e) =>
                            setNewTitle((prev) => ({ ...prev, [col.key]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreate(col.key);
                            if (e.key === "Escape") setAdding(null);
                          }}
                          placeholder="Task title…"
                          className="flex-1 bg-[#161b22] border border-white/10 text-white text-sm px-3 py-2 rounded-xl
                            focus:outline-none focus:border-white/30 placeholder:text-white/20 transition-colors"
                        />
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCreate(col.key)}
                          disabled={creating === col.key || !newTitle[col.key].trim()}
                          className={`px-3 py-2 text-sm rounded-xl font-medium transition-all flex items-center gap-1.5
                            ${col.topBar} text-white opacity-90 hover:opacity-100
                            disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {creating === col.key ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            "Add"
                          )}
                        </motion.button>
                      </div>
                      <p className="text-[10px] text-white/20 mt-1.5 ml-1">
                        Enter to save · Esc to cancel
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task cards list */}
              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {colTasks.length === 0 && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-36 gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center border border-white/[0.06]">
                        <ColIcon size={18} className={`${col.iconColor} opacity-40`} />
                      </div>
                      <p className="text-white/25 text-xs text-center leading-relaxed">
                        No tasks here yet
                        <br />
                        <span className="text-white/15">Click + to add one</span>
                      </p>
                    </motion.div>
                  )}

                  {colTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94, y: 10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      className={`group relative bg-[#161b22] border ${col.cardBorder} rounded-xl p-3.5
                        transition-all duration-200 shadow-md ${col.cardGlow}
                        ${deleting === task.id ? "opacity-40 scale-95" : ""}
                        ${moving === task.id ? "opacity-60" : ""}`}
                    >
                      {/* Loading overlay for move */}
                      {moving === task.id && (
                        <div className="absolute inset-0 rounded-xl bg-black/20 flex items-center justify-center backdrop-blur-[1px] z-10">
                          <Loader2 size={16} className="animate-spin text-white/60" />
                        </div>
                      )}

                      {/* Task title row */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <ColIcon
                            size={13}
                            className={`${col.iconColor} mt-0.5 flex-shrink-0 opacity-70`}
                          />
                          <p className="text-sm text-white/85 leading-snug break-words">
                            {task.title}
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(task.id)}
                          disabled={deleting === task.id || moving === task.id}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg
                            text-white/20 hover:text-red-400 hover:bg-red-500/10
                            transition-all duration-150 flex-shrink-0"
                        >
                          {deleting === task.id ? (
                            <Loader2 size={12} className="animate-spin text-red-400" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </motion.button>
                      </div>

                      {/* Move buttons */}
                      <div className="flex gap-1.5 flex-wrap">
                        {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                          <motion.button
                            key={c.key}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleMove(task.id, c.key)}
                            disabled={moving !== null || deleting !== null}
                            className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg
                              border border-white/10 text-white/35 bg-white/[0.03]
                              ${c.moveBtnHover} transition-all duration-150
                              disabled:opacity-30 disabled:cursor-not-allowed`}
                          >
                            <ArrowRight size={9} />
                            {c.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}