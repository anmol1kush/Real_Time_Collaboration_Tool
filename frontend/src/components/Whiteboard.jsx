import { useEffect, useRef, useState, useCallback } from "react";
import { Excalidraw, exportToBlob, exportToSvg } from "@excalidraw/excalidraw";
import { motion, AnimatePresence } from "framer-motion";
import {
    PenLine, Users, Download, Trash2, RotateCcw, RotateCw,
    ZoomIn, ZoomOut, Maximize2, Minimize2, Share2,
    MousePointer2, ChevronDown, X, Check, Loader2,
} from "lucide-react";

/* ── Avatar color from name ── */
function avatarColor(name = "") {
    const palette = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f97316"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return palette[Math.abs(h) % palette.length];
}

/* ── Online user indicator ── */
function UserDot({ name }) {
    const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div
            title={name}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white
        ring-2 ring-[#0d1117] flex-shrink-0 -ml-1.5 first:ml-0 cursor-default select-none"
            style={{ background: avatarColor(name) }}
        >
            {initials}
        </div>
    );
}

/* ── Toolbar icon button ── */
function TBtn({ icon: Icon, label, onClick, active, danger, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
        ${danger
                    ? "text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20"
                    : active
                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                        : "text-white/40 hover:text-white/80 hover:bg-white/[0.06] border border-transparent"
                } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
const Whiteboard = ({ socket, projectId }) => {
    const excalidrawAPI = useRef(null);
    const isReceiving = useRef(false);

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [elementCount, setElementCount] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [toast, setToast] = useState(null);
    const containerRef = useRef(null);

    function showToast(msg, type = "success") {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2800);
    }

    /* ── Socket: whiteboard events ── */
    useEffect(() => {
        if (!socket) return;

        socket.on("whiteboard:updated", (elements) => {
            if (!excalidrawAPI.current) return;
            isReceiving.current = true;
            excalidrawAPI.current.updateScene({ elements });
            setElementCount(elements.filter(e => !e.isDeleted).length);
            setTimeout(() => { isReceiving.current = false; }, 150);
        });

        socket.on("online:users", (users) => {
            setOnlineUsers(Array.isArray(users) ? users : []);
        });

        return () => {
            socket.off("whiteboard:updated");
            socket.off("online:users");
        };
    }, [socket]);

    /* ── On change: emit to peers ── */
    const handleChange = useCallback((elements) => {
        if (isReceiving.current || !socket) return;
        const active = elements.filter(e => !e.isDeleted);
        setElementCount(active.length);
        socket.emit("whiteboard:update", { projectId, elements });
    }, [socket, projectId]);

    /* ── Export PNG ── */
    async function exportPNG() {
        if (!excalidrawAPI.current) return;
        setExportLoading(true);
        setShowExportMenu(false);
        try {
            const blob = await exportToBlob({
                elements: excalidrawAPI.current.getSceneElements(),
                appState: { ...excalidrawAPI.current.getAppState(), exportBackground: true, theme: "dark" },
                files: excalidrawAPI.current.getFiles(),
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `whiteboard-${Date.now()}.png`; a.click();
            URL.revokeObjectURL(url);
            showToast("Exported as PNG!");
        } catch {
            showToast("Export failed", "error");
        } finally {
            setExportLoading(false);
        }
    }

    /* ── Export SVG ── */
    async function exportSVG() {
        if (!excalidrawAPI.current) return;
        setExportLoading(true);
        setShowExportMenu(false);
        try {
            const svg = await exportToSvg({
                elements: excalidrawAPI.current.getSceneElements(),
                appState: { ...excalidrawAPI.current.getAppState(), exportBackground: true, theme: "dark" },
                files: excalidrawAPI.current.getFiles(),
            });
            const serializer = new XMLSerializer();
            const svgStr = serializer.serializeToString(svg);
            const blob = new Blob([svgStr], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `whiteboard-${Date.now()}.svg`; a.click();
            URL.revokeObjectURL(url);
            showToast("Exported as SVG!");
        } catch {
            showToast("Export failed", "error");
        } finally {
            setExportLoading(false);
        }
    }

    /* ── Clear canvas ── */
    function clearCanvas() {
        if (!excalidrawAPI.current) return;
        excalidrawAPI.current.updateScene({ elements: [] });
        socket?.emit("whiteboard:update", { projectId, elements: [] });
        setElementCount(0);
        setShowClearConfirm(false);
        showToast("Whiteboard cleared");
    }

    /* ── Undo / Redo ── */
    function undo() { excalidrawAPI.current?.history?.undo?.(); }
    function redo() { excalidrawAPI.current?.history?.redo?.(); }

    /* ── Fit to screen ── */
    function fitToScreen() {
        excalidrawAPI.current?.scrollToContent(excalidrawAPI.current.getSceneElements(), {
            fitToViewport: true, animate: true,
        });
    }

    /* ── Fullscreen ── */
    function toggleFullscreen() {
        if (!isFullscreen) {
            containerRef.current?.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        setIsFullscreen(v => !v);
    }

    /* ── Close export menu on outside click ── */
    useEffect(() => {
        if (!showExportMenu) return;
        const handler = () => setShowExportMenu(false);
        setTimeout(() => window.addEventListener("click", handler), 0);
        return () => window.removeEventListener("click", handler);
    }, [showExportMenu]);

    return (
        <div
            ref={containerRef}
            className="flex flex-col relative"
            style={{ height: "calc(100vh - 200px)", minHeight: 480 }}
        >
            {/* ── Header bar ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2
        bg-[#0d1117] border-b border-white/[0.06] z-10">

                {/* Left: brand + element count */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                            <PenLine size={13} className="text-violet-400" />
                        </div>
                        <span className="text-sm font-semibold text-white/85">Whiteboard</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <span className="text-[11px] font-mono text-white/25">
                        {elementCount} {elementCount === 1 ? "element" : "elements"}
                    </span>
                </div>

                {/* Right: online users + actions */}
                <div className="flex items-center gap-2">

                    {/* Online users */}
                    {onlineUsers.length > 0 && (
                        <div className="flex items-center gap-1 mr-1">
                            <div className="flex items-center">
                                {onlineUsers.slice(0, 5).map((u, i) => (
                                    <UserDot key={i} name={u.name || u} />
                                ))}
                            </div>
                            {onlineUsers.length > 5 && (
                                <span className="text-[10px] text-white/30 ml-1">+{onlineUsers.length - 5}</span>
                            )}
                        </div>
                    )}

                    <div className="w-px h-4 bg-white/[0.08]" />

                    {/* Undo / Redo */}
                    <TBtn icon={RotateCcw} label="Undo" onClick={undo} />
                    <TBtn icon={RotateCw} label="Redo" onClick={redo} />

                    <div className="w-px h-4 bg-white/[0.08]" />

                    {/* Fit to screen */}
                    <TBtn icon={MousePointer2} label="Fit" onClick={fitToScreen} />

                    {/* Export dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowExportMenu(v => !v); }}
                            disabled={exportLoading}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                text-white/40 hover:text-white/80 hover:bg-white/[0.06] border border-transparent
                transition-all disabled:opacity-30"
                        >
                            {exportLoading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Download size={14} />
                            }
                            <span className="hidden sm:inline">Export</span>
                            <ChevronDown size={10} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                            {showExportMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                                    transition={{ duration: 0.12 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 w-36 bg-[#161b22] border border-white/10
                    rounded-xl shadow-2xl overflow-hidden z-50"
                                >
                                    {[
                                        { label: "Export PNG", fn: exportPNG },
                                        { label: "Export SVG", fn: exportSVG },
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={item.fn}
                                            className="w-full text-left px-3 py-2.5 text-xs text-white/70 hover:text-white
                        hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                                        >
                                            <Download size={11} className="opacity-50" />
                                            {item.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Clear */}
                    <TBtn icon={Trash2} label="Clear" onClick={() => setShowClearConfirm(true)} danger />

                    {/* Fullscreen */}
                    <TBtn
                        icon={isFullscreen ? Minimize2 : Maximize2}
                        label={isFullscreen ? "Exit" : "Full"}
                        onClick={toggleFullscreen}
                    />
                </div>
            </div>

            {/* ── Canvas ── */}
            <div className="flex-1 relative overflow-hidden">
                <Excalidraw
                    excalidrawAPI={(api) => { excalidrawAPI.current = api; }}
                    onChange={handleChange}
                    theme="dark"
                    UIOptions={{
                        canvasActions: {
                            saveToActiveFile: false,
                            loadScene: false,
                            export: false,
                            toggleTheme: false,
                        },
                    }}
                />

                {/* Collaboration live badge */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2
          bg-[#0d1117]/80 backdrop-blur-md border border-white/[0.08]
          rounded-xl px-3 py-1.5 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-white/35 font-mono">Live collaborative</span>
                </div>
            </div>

            {/* ── Clear confirmation modal ── */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            className="bg-[#161b22] border border-white/10 rounded-2xl p-5 shadow-2xl max-w-xs w-full mx-4"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                    <Trash2 size={16} className="text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white/90">Clear whiteboard?</p>
                                    <p className="text-xs text-white/35">This cannot be undone for all users</p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 py-2 text-sm rounded-xl border border-white/10 text-white/50 hover:text-white/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={clearCanvas}
                                    className="flex-1 py-2 text-sm rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-medium transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Toast ── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.9 }}
                        className={`absolute bottom-14 left-1/2 -translate-x-1/2 z-50
              flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-2xl
              ${toast.type === "error"
                                ? "bg-red-950/90 border-red-700/60 text-red-300"
                                : "bg-emerald-950/90 border-emerald-700/60 text-emerald-300"
                            }`}
                    >
                        {toast.type === "error"
                            ? <X size={14} />
                            : <Check size={14} />
                        }
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Whiteboard;
