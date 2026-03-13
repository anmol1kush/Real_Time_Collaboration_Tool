import { useEffect, useRef, useState, useCallback } from "react";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import Quote from "@editorjs/quote";
import Code from "@editorjs/code";
import Delimiter from "@editorjs/delimiter";
import InlineCode from "@editorjs/inline-code";
import Marker from "@editorjs/marker";
import Table from "@editorjs/table";
import SimpleImage from "@editorjs/simple-image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, RotateCcw, Loader2, Save, FileText,
  CheckCircle2, X, History, ChevronRight, Users,
  AlignLeft, Type, List as ListIcon, Code2, Quote as QuoteIcon,
  Table2, Image, Minus, Highlighter, PanelRightOpen, PanelRightClose
} from "lucide-react";
import api from "../services/api";

/* ── Debounce helper ── */
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

/* ── Save status badge ── */
function SaveStatus({ status }) {
  const configs = {
    idle: { label: "All saved", icon: CheckCircle2, color: "text-emerald-400" },
    saving: { label: "Saving…", icon: Loader2, color: "text-amber-400", spin: true },
    error: { label: "Save failed", icon: X, color: "text-red-400" },
  };
  const cfg = configs[status] || configs.idle;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center gap-1.5 text-xs ${cfg.color} transition-colors`}>
      <Icon size={12} className={cfg.spin ? "animate-spin" : ""} />
      <span>{cfg.label}</span>
    </div>
  );
}

/* ── Toolbar button ── */
function ToolBtn({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] transition-all
        ${active
          ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
          : "text-white/35 hover:text-white/70 hover:bg-white/[0.05] border border-transparent"
        }`}
    >
      <Icon size={14} />
      <span className="leading-none font-medium">{label}</span>
    </button>
  );
}

/* ── Version row ── */
function VersionRow({ v, onRestore, isRestoring }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-3 py-2.5 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-white/80 text-xs font-medium truncate">{v.savedBy || "Unknown"}</p>
          <p className="text-white/30 text-[10px] mt-0.5">
            {new Date(v.createdAt).toLocaleString([], {
              month: "short", day: "numeric",
              hour: "2-digit", minute: "2-digit"
            })}
          </p>
        </div>
        <AnimatePresence>
          {(hovered || isRestoring) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={onRestore}
              disabled={isRestoring}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg
                bg-blue-600/20 border border-blue-500/30 text-blue-400
                hover:bg-blue-600/30 transition-all disabled:opacity-50 flex-shrink-0"
            >
              {isRestoring
                ? <Loader2 size={10} className="animate-spin" />
                : <RotateCcw size={10} />
              }
              Restore
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


const DocumentEditor = ({ socket, projectId, documentId }) => {
  const editorInstance = useRef(null);
  const isReady = useRef(false);
  const isReceiving = useRef(false);

  const [saveStatus, setSaveStatus] = useState("idle");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [activeBlocks, setActiveBlocks] = useState(0);
  const [confirmRestore, setConfirmRestore] = useState(null);

  /* ── Count words from EditorJS blocks ── */
  function countFromBlocks(blocks = []) {
    let text = "";
    blocks.forEach((b) => {
      if (b.data?.text) text += " " + b.data.text;
      if (b.data?.items) b.data.items.forEach((it) => { text += " " + (it?.content || it || ""); });
      if (b.data?.code) text += " " + b.data.code;
      if (b.data?.caption) text += " " + b.data.caption;
    });
    const clean = text.replace(/<[^>]+>/g, "").trim();
    setCharCount(clean.length);
    setWordCount(clean ? clean.split(/\s+/).filter(Boolean).length : 0);
    setActiveBlocks(blocks.length);
  }

  /* ── Debounced socket emit & save ── */
  const emitUpdate = useDebounce(async (edApi) => {
    if (!isReady.current || !edApi) return;
    try {
      setSaveStatus("saving");
      const data = await edApi.saver.save();
      socket.emit("document:update", { projectId, documentId, data });
      countFromBlocks(data.blocks);
      setSaveStatus("idle");
    } catch {
      setSaveStatus("error");
    }
  }, 800);

  /* ── Editor init ── */
  useEffect(() => {
    if (editorInstance.current) return;

    editorInstance.current = new EditorJS({
      holder: "editorjs",
      autofocus: true,
      tools: {
        header: { class: Header, inlineToolbar: true, config: { levels: [1, 2, 3], defaultLevel: 2 } },
        list: { class: List, inlineToolbar: true, config: { defaultStyle: "unordered" } },
        checklist: { class: Checklist, inlineToolbar: true },
        quote: { class: Quote, inlineToolbar: true, config: { quotePlaceholder: "Enter a quote", captionPlaceholder: "Quote's author" } },
        code: { class: Code },
        delimiter: Delimiter,
        inlineCode: { class: InlineCode, shortcut: "CMD+SHIFT+M" },
        marker: { class: Marker, shortcut: "CMD+SHIFT+H" },
        table: { class: Table, inlineToolbar: true, config: { rows: 2, cols: 3 } },
        image: { class: SimpleImage, inlineToolbar: true },
      },
      placeholder: "Start writing… Press Tab or click + to add blocks",
      onReady: () => {
        isReady.current = true;
        socket.emit("document:fetch", { projectId, documentId });
      },
      onChange: (edApi) => {
        if (!isReady.current || isReceiving.current) return;
        emitUpdate(edApi);
      },
    });

    return () => {
      if (editorInstance.current?.destroy && isReady.current) {
        editorInstance.current.destroy();
        editorInstance.current = null;
        isReady.current = false;
      }
    };
  }, []);

  /* ── Socket events ── */
  useEffect(() => {
    if (!socket) return;

    socket.on("document:loaded", (content) => {
      if (editorInstance.current && isReady.current && content) {
        isReceiving.current = true;
        editorInstance.current.render(content).then(() => {
          countFromBlocks(content.blocks || []);
          isReceiving.current = false;
        }).catch(() => { isReceiving.current = false; });
      }
    });

    socket.on("document:updated", (data) => {
      if (editorInstance.current && isReady.current) {
        isReceiving.current = true;
        editorInstance.current.render(data).then(() => {
          countFromBlocks(data.blocks || []);
          isReceiving.current = false;
        }).catch(() => { isReceiving.current = false; });
      }
    });

    return () => {
      socket.off("document:loaded");
      socket.off("document:updated");
    };
  }, [socket]);

  /* ── Manual save (Ctrl+S) ── */
  useEffect(() => {
    const handleKeydown = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isReady.current || !editorInstance.current) return;
        setSaveStatus("saving");
        try {
          const data = await editorInstance.current.save();
          socket.emit("document:update", { projectId, documentId, data });
          setSaveStatus("idle");
        } catch {
          setSaveStatus("error");
        }
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [socket, projectId, documentId]);

  /* ── Fetch versions ── */
  async function fetchVersions() {
    setLoadingVersions(true);
    try {
      const res = await api.get(`/projects/${projectId}/document/versions`);
      setVersions(res.data);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }

  /* ── Restore version ── */
  async function handleRestore(v) {
    setConfirmRestore(null);
    setRestoring(v.id);
    try {
      await api.post(`/projects/${projectId}/document/versions/${v.id}/restore`);
      if (editorInstance.current && isReady.current) {
        isReceiving.current = true;
        await editorInstance.current.render(v.content);
        countFromBlocks(v.content?.blocks || []);
        isReceiving.current = false;
      }
      setShowHistory(false);
    } catch {
      /* silent */
    } finally {
      setRestoring(null);
    }
  }

  /* ── Insert block shortcuts ── */
  function insertBlock(type) {
    if (!editorInstance.current || !isReady.current) return;
    editorInstance.current.blocks.insert(type);
    editorInstance.current.caret.focus();
  }

  /* ═══ RENDER ═══ */
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: 480 }}>

      {/* ── Top toolbar bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2
        border-b border-white/[0.06] bg-[#0d1117]">

        {/* Left: title + status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <FileText size={13} className="text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-white/85">Document</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <SaveStatus status={saveStatus} />
        </div>

        {/* Right: stats + history toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-white/25 font-mono">
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{charCount} chars</span>
            <span>·</span>
            <span>{activeBlocks} blocks</span>
          </div>

          <button
            onClick={() => {
              setShowHistory((h) => {
                if (!h) fetchVersions();
                return !h;
              });
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
              ${showHistory
                ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400"
                : "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20"
              }`}
          >
            {showHistory ? <PanelRightClose size={12} /> : <History size={12} />}
            <span>History</span>
          </button>
        </div>
      </div>

      {/* ── Block type shortcuts strip ── */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-1.5
        border-b border-white/[0.04] bg-[#0b0f1a] overflow-x-auto">
        <span className="text-[10px] text-white/20 font-mono mr-1 flex-shrink-0">Insert:</span>
        {[
          { type: "header", label: "Heading", icon: Type },
          { type: "paragraph", label: "Text", icon: AlignLeft },
          { type: "list", label: "List", icon: ListIcon },
          { type: "checklist", label: "Tasks", icon: CheckCircle2 },
          { type: "quote", label: "Quote", icon: QuoteIcon },
          { type: "code", label: "Code", icon: Code2 },
          { type: "table", label: "Table", icon: Table2 },
          { type: "image", label: "Image", icon: Image },
          { type: "delimiter", label: "Divider", icon: Minus },
        ].map((t) => (
          <ToolBtn key={t.type} label={t.label} icon={t.icon} onClick={() => insertBlock(t.type)} />
        ))}
        <div className="flex-shrink-0 ml-auto flex items-center gap-1 text-[10px] text-white/15 font-mono hidden md:flex">
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]">Ctrl+S</kbd>
          <span>save</span>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex overflow-hidden bg-[#0b0f1a]">

        {/* Editor pane */}
        <div className="flex-1 overflow-y-auto">
          {/* Paper-like wrapper */}
          <div className="max-w-3xl mx-auto py-10 px-6 md:px-16 min-h-full">
            <div
              id="editorjs"
              className="prose-custom  text-white/85 min-h-[400px]
                [&_.ce-block]:py-0.5
                [&_.ce-toolbar__actions]:opacity-100
                [&_.ce-toolbar__plus]:text-white/30
                [&_.ce-toolbar__plus:hover]:text-white
                [&_.cdx-block]:text-white/85
                [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-2
                [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white/90 [&_h2]:mb-2
                [&_h3]:text-xl [&_h3]:font-medium [&_h3]:text-white/80 [&_h3]:mb-1.5
                [&_.cdx-quote__text]:text-white/70 [&_.cdx-quote__text]:border-l-4
                [&_.cdx-quote__text]:border-indigo-500 [&_.cdx-quote__text]:pl-4
                [&_.cdx-quote__text]:italic
                [&_.ce-code__textarea]:bg-[#161b22] [&_.ce-code__textarea]:text-emerald-400
                [&_.ce-code__textarea]:font-mono [&_.ce-code__textarea]:text-sm
                [&_.ce-code__textarea]:border [&_.ce-code__textarea]:border-white/10
                [&_.ce-code__textarea]:rounded-lg [&_.ce-code__textarea]:p-4
                [&_.cdx-delimiter]:text-white/20
              "
            />
          </div>
        </div>

        {/* History panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-shrink-0 overflow-hidden border-l border-white/[0.06] bg-[#0d1117] flex flex-col"
              style={{ width: 256 }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <History size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-white/70">Version History</span>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-white/20 hover:text-white/60 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingVersions ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={20} className="animate-spin text-indigo-400/50" />
                    <p className="text-xs text-white/25">Loading history…</p>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Clock size={16} className="text-white/20" />
                    </div>
                    <p className="text-xs text-white/25 text-center leading-relaxed">
                      No saved versions yet.
                      <br />
                      <span className="text-white/15">Snapshots are saved every 10 edits.</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    {versions.map((v) => (
                      <VersionRow
                        key={v.id}
                        v={v}
                        isRestoring={restoring === v.id}
                        onRestore={() => setConfirmRestore(v)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="px-3 py-2 border-t border-white/[0.06]">
                <p className="text-[10px] text-white/20 text-center">
                  {versions.length} snapshot{versions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5
        border-t border-white/[0.04] bg-[#0d1117]">
        <div className="flex items-center gap-3 text-[10px] text-white/20 font-mono">
          <span>Editor.js v2</span>
          <span>·</span>
          <span>Real-time collaborative</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/20">
          <span>Auto-saved</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
        </div>
      </div>

      {/* ── Restore confirmation modal ── */}
      <AnimatePresence>
        {confirmRestore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-[#161b22] border border-white/10 rounded-2xl p-5 shadow-2xl max-w-sm w-full mx-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <RotateCcw size={16} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">Restore version?</p>
                  <p className="text-xs text-white/40">Current content will be replaced</p>
                </div>
              </div>
              <p className="text-xs text-white/50 mb-4 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.05]">
                Saved by <span className="text-white/70 font-medium">{confirmRestore.savedBy}</span>{" "}
                on {new Date(confirmRestore.createdAt).toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmRestore(null)}
                  className="flex-1 py-2 text-sm rounded-xl border border-white/10 text-white/50 hover:text-white/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRestore(confirmRestore)}
                  className="flex-1 py-2 text-sm rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white font-medium transition-colors"
                >
                  Restore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentEditor;
