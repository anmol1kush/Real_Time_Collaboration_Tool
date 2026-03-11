import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { Plus, Trash2, Loader2 } from "lucide-react";

const COLUMNS = [
  { key: "TODO", label: "To Do", color: "border-zinc-600", badge: "bg-zinc-800 text-zinc-300" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-blue-600", badge: "bg-blue-950 text-blue-300" },
  { key: "DONE", label: "Done", color: "border-[#00ff9d]/50", badge: "bg-[#00ff9d]/10 text-[#00ff9d]" },
];

export default function KanbanBoard({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState({ TODO: "", IN_PROGRESS: "", DONE: "" });
  const [adding, setAdding] = useState(null);   // column key currently being added to
  const [creating, setCreating] = useState(null);   // column key currently saving
  const [deleting, setDeleting] = useState(null);   // taskId being deleted
  const [moving, setMoving] = useState(null);   // taskId being moved

  /* ---------- Fetch ---------- */
  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  async function fetchTasks() {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/tasks`);
      setTasks(res.data);
    } catch (err) {
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Create ---------- */
  async function handleCreate(col) {
    const title = newTitle[col].trim();
    if (!title) return;
    setCreating(col);
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, { title, status: col });
      setTasks(prev => [...prev, res.data]);
      setNewTitle(prev => ({ ...prev, [col]: "" }));
      setAdding(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create task");
    } finally {
      setCreating(null);
    }
  }

  /* ---------- Move (status change) ---------- */
  async function handleMove(taskId, status) {
    setMoving(taskId);
    try {
      await api.put(`/tasks/${taskId}`, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    } catch (err) {
      alert("Failed to move task");
    } finally {
      setMoving(null);
    }
  }

  /* ---------- Delete ---------- */
  async function handleDelete(taskId) {
    setDeleting(taskId);
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert("Failed to delete task");
    } finally {
      setDeleting(null);
    }
  }

  /* ---------- Render ---------- */
  if (loading) return (
    <div className="grid grid-cols-3 gap-4 animate-pulse">
      {COLUMNS.map(col => (
        <div key={col.key} className="h-64 bg-zinc-900 rounded-lg" />
      ))}
    </div>
  );

  if (error) return (
    <div className="p-4 border border-red-900 bg-red-950/30 text-red-400 text-sm rounded">
      {error}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} className={`flex flex-col border-t-2 ${col.color} bg-zinc-950 rounded-b-lg`}>
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">{col.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${col.badge}`}>
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => setAdding(adding === col.key ? null : col.key)}
                className="text-zinc-600 hover:text-[#00ff9d] transition-colors"
                title="Add task"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Add task input */}
            <AnimatePresence>
              {adding === col.key && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 border-b border-zinc-800 flex gap-2">
                    <input
                      autoFocus
                      value={newTitle[col.key]}
                      onChange={e => setNewTitle(prev => ({ ...prev, [col.key]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") handleCreate(col.key); if (e.key === "Escape") setAdding(null); }}
                      placeholder="Task title..."
                      className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:border-[#00ff9d] placeholder:text-zinc-600"
                    />
                    <button
                      onClick={() => handleCreate(col.key)}
                      disabled={creating === col.key || !newTitle[col.key].trim()}
                      className="px-3 py-1.5 bg-[#00ff9d]/10 border border-[#00ff9d]/40 text-[#00ff9d] text-sm rounded hover:bg-[#00ff9d]/20 transition-colors disabled:opacity-50"
                    >
                      {creating === col.key ? <Loader2 size={14} className="animate-spin" /> : "Add"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task cards */}
            <div className="flex-1 p-3 space-y-2 min-h-[200px]">
              <AnimatePresence>
                {colTasks.length === 0 && (
                  <p className="text-zinc-700 text-xs text-center pt-8">No tasks</p>
                )}
                {colTasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-white leading-snug flex-1">{task.title}</p>
                      <button
                        onClick={() => handleDelete(task.id)}
                        disabled={deleting === task.id}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0"
                      >
                        {deleting === task.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </button>
                    </div>

                    {/* Move buttons */}
                    <div className="flex gap-1 mt-2.5 flex-wrap">
                      {COLUMNS.filter(c => c.key !== col.key).map(c => (
                        <button
                          key={c.key}
                          onClick={() => handleMove(task.id, c.key)}
                          disabled={moving === task.id}
                          className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-50"
                        >
                          {moving === task.id ? "..." : `→ ${c.label}`}
                        </button>
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
  );
}