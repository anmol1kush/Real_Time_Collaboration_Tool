import { useEffect, useRef, useState, useCallback } from "react";
import { Excalidraw, exportToBlob, exportToSvg } from "@excalidraw/excalidraw";
import { motion, AnimatePresence } from "framer-motion";
import {
    PenLine, Users, Download, Trash2, RotateCcw, RotateCw,
    ZoomIn, ZoomOut, Maximize2, Minimize2, Share2,
    MousePointer2, ChevronDown, X, Check, Loader2, Link2,
} from "lucide-react";

/* ── Avatar color from name ── */
function avatarColor(name = "") {
    const palette = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f97316"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return palette[Math.abs(h) % palette.length];
}

/* ── Online user dot ── */
function UserDot({ name }) {
    const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div
            title={name}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px]
            font-bold text-white ring-2 ring-black flex-shrink-0 -ml-1.5 first:ml-0
            cursor-default select-none transition-transform hover:scale-110 hover:z-10"
            style={{ background: avatarColor(name) }}
        >
            {initials}
        </div>
    );
}

/* ── Toolbar icon button ── */
function TBtn({ icon: Icon, label, onClick, active, danger, disabled, badge }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
            text-xs font-medium transition-all select-none
            ${danger
                    ? "text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20"
                    : active
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-[0_0_8px_rgba(139,92,246,0.15)]"
                        : "text-white/45 hover:text-white/80 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]"
                } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
            {badge && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-violet-500
                    text-[8px] text-white flex items-center justify-center font-bold">
                    {badge}
                </span>
            )}
        </button>
    );
}

/* ── Separator ── */
function Sep() {
    return <div className="w-px h-5 bg-white/[0.08] flex-shrink-0" />;
}

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
const Whiteboard = ({ socket, projectId }) => {
    const excalidrawAPI = useRef(null);
    const isReceiving = useRef(false);
    const containerRef = useRef(null);

    const [onlineUsers, setOnlineUsers]         = useState([]);
    const [elementCount, setElementCount]       = useState(0);
    const [isFullscreen, setIsFullscreen]       = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [exportLoading, setExportLoading]     = useState(false);
    const [showExportMenu, setShowExportMenu]   = useState(false);
    const [toast, setToast]                     = useState(null);
    const [zoom, setZoom]                       = useState(1);

    function showToast(msg, type = "success") {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2800);
    }

    /* ── Socket events ── */
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

    /* ── Emit on change ── */
    const handleChange = useCallback((elements) => {
        if (isReceiving.current || !socket) return;
        const active = elements.filter(e => !e.isDeleted);
        setElementCount(active.length);
        socket.emit("whiteboard:update", { projectId, elements });
    }, [socket, projectId]);

    /* ── Zoom controls ── */
    function zoomIn() {
        if (!excalidrawAPI.current) return;
        const state = excalidrawAPI.current.getAppState();
        const newZ = Math.min((state.zoom?.value || 1) + 0.1, 5);
        excalidrawAPI.current.updateScene({ appState: { zoom: { value: newZ } } });
        setZoom(newZ);
    }

    function zoomOut() {
        if (!excalidrawAPI.current) return;
        const state = excalidrawAPI.current.getAppState();
        const newZ = Math.max((state.zoom?.value || 1) - 0.1, 0.1);
        excalidrawAPI.current.updateScene({ appState: { zoom: { value: newZ } } });
        setZoom(newZ);
    }

    function zoomReset() {
        if (!excalidrawAPI.current) return;
        excalidrawAPI.current.updateScene({ appState: { zoom: { value: 1 } } });
        setZoom(1);
    }

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

    /* ── Copy share link ── */
    function copyLink() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast("Link copied to clipboard!");
        }).catch(() => {
            showToast("Failed to copy link", "error");
        });
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

    const zoomPct = Math.round((zoom) * 100);

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full relative"
        >
            {/* ══ Header toolbar ══ */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5
                bg-[#0a0a0a]/95 border-b border-white/[0.07] z-10 flex-wrap
                backdrop-blur-sm"
                style={{ minHeight: 46 }}
            >
                {/* Brand */}
                <div className="flex items-center gap-2 mr-1">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30
                        flex items-center justify-center">
                        <PenLine size={13} className="text-violet-400" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[12px] font-semibold text-white/85">Whiteboard</span>
                        <span className="text-[9px] font-mono text-white/25">
                            {elementCount} {elementCount === 1 ? "element" : "elements"}
                        </span>
                    </div>
                </div>

                <Sep />

                {/* Undo / Redo */}
                <TBtn icon={RotateCcw} label="Undo" onClick={undo} />
                <TBtn icon={RotateCw}  label="Redo" onClick={redo} />

                <Sep />

                {/* Zoom controls */}
                <TBtn icon={ZoomOut} label="" onClick={zoomOut} disabled={zoom <= 0.1} />
                <button
                    onClick={zoomReset}
                    className="text-[11px] font-mono text-white/40 hover:text-white/80
                        px-2 py-1 rounded-lg hover:bg-white/[0.06] transition-all min-w-[44px] text-center"
                    title="Reset zoom"
                >
                    {zoomPct}%
                </button>
                <TBtn icon={ZoomIn}  label=""  onClick={zoomIn} disabled={zoom >= 5} />

                <Sep />

                {/* Fit to viewport */}
                <TBtn icon={MousePointer2} label="Fit" onClick={fitToScreen} />

                <Sep />

                {/* Export dropdown */}
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowExportMenu(v => !v); }}
                        disabled={exportLoading}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                            transition-all disabled:opacity-30 select-none
                            ${showExportMenu
                                ? "bg-white/[0.08] text-white/80 border border-white/[0.12]"
                                : "text-white/45 hover:text-white/80 hover:bg-white/[0.06] border border-transparent"
                            }`}
                    >
                        {exportLoading
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Download size={13} />
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
                                className="absolute left-0 top-full mt-1.5 w-40
                                    bg-[#111] border border-white/[0.09] rounded-xl
                                    shadow-2xl overflow-hidden z-50"
                            >
                                {[
                                    { label: "Export as PNG", fn: exportPNG },
                                    { label: "Export as SVG", fn: exportSVG },
                                ].map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={item.fn}
                                        className="w-full text-left px-3.5 py-2.5 text-xs text-white/60
                                            hover:text-white hover:bg-white/[0.05] transition-colors
                                            flex items-center gap-2"
                                    >
                                        <Download size={11} className="opacity-50" />
                                        {item.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Share link */}
                <TBtn icon={Link2} label="Share" onClick={copyLink} />

                <Sep />

                {/* Clear */}
                <TBtn
                    icon={Trash2}
                    label="Clear"
                    onClick={() => setShowClearConfirm(true)}
                    danger
                    disabled={elementCount === 0}
                />

                {/* Fullscreen */}
                <TBtn
                    icon={isFullscreen ? Minimize2 : Maximize2}
                    label={isFullscreen ? "Exit" : "Full"}
                    onClick={toggleFullscreen}
                />

                {/* Spacer */}
                <div className="flex-1" />

                {/* Online users */}
                {onlineUsers.length > 0 && (
                    <>
                        <Sep />
                        <div className="flex items-center gap-2">
                            <div className="flex items-center pl-1.5">
                                {onlineUsers.slice(0, 6).map((u, i) => (
                                    <UserDot key={i} name={u.name || u} />
                                ))}
                            </div>
                            {onlineUsers.length > 6 && (
                                <span className="text-[10px] text-white/30 font-mono">
                                    +{onlineUsers.length - 6}
                                </span>
                            )}
                            <span className="text-[10px] text-white/25 hidden sm:block">
                                online
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* ══ Excalidraw canvas — fills remaining height ══ */}
            <div className="flex-1 relative overflow-hidden">
                <Excalidraw
                    excalidrawAPI={(api) => {
                        excalidrawAPI.current = api;
                        // sync zoom state on API ready
                        const z = api.getAppState()?.zoom?.value;
                        if (z) setZoom(z);
                    }}
                    onChange={(elements, appState) => {
                        handleChange(elements);
                        if (appState?.zoom?.value) setZoom(appState.zoom.value);
                    }}
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

                {/* Live collaboration badge */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2
                    bg-black/70 backdrop-blur-md border border-white/[0.07]
                    rounded-xl px-3 py-1.5 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-white/35 font-mono">Live collaborative</span>
                </div>

                {/* Zoom badge (bottom right) */}
                <div className="absolute bottom-4 right-4 z-10 flex items-center
                    bg-black/70 backdrop-blur-md border border-white/[0.07]
                    rounded-xl px-3 py-1.5 pointer-events-none">
                    <span className="text-[11px] text-white/35 font-mono">{zoomPct}%</span>
                </div>
            </div>

            {/* ══ Clear confirmation modal ══ */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            className="bg-[#111] border border-white/[0.09] rounded-2xl p-5
                                shadow-2xl max-w-xs w-full mx-4"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20
                                    flex items-center justify-center">
                                    <Trash2 size={16} className="text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white/90">Clear whiteboard?</p>
                                    <p className="text-xs text-white/40">This cannot be undone for all users</p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 py-2.5 text-sm rounded-xl border border-white/[0.09]
                                        text-white/50 hover:text-white/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={clearCanvas}
                                    className="flex-1 py-2.5 text-sm rounded-xl bg-red-600/80
                                        hover:bg-red-600 text-white font-medium transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══ Toast ══ */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.9 }}
                        className={`absolute bottom-14 left-1/2 -translate-x-1/2 z-50
                            flex items-center gap-2 px-4 py-2.5 rounded-xl border
                            text-sm font-medium shadow-2xl
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
