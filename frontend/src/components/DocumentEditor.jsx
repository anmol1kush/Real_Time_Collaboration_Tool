import { useEffect, useRef, useState } from "react";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import { Clock, RotateCcw, ChevronRight, Loader2 } from "lucide-react";
import api from "../services/api";

const DocumentEditor = ({ socket, projectId, documentId }) => {
  const editorInstance = useRef(null);
  const isReady = useRef(false);
  const isReceiving = useRef(false);

  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoring, setRestoring] = useState(null);

  /* ---- Editor init ---- */
  useEffect(() => {
    if (editorInstance.current) return;

    editorInstance.current = new EditorJS({
      holder: "editorjs",
      tools: { header: Header, list: List, checklist: Checklist },
      placeholder: "Start typing your document here...",
      onReady: () => {
        isReady.current = true;
        socket.emit("document:fetch", { projectId, documentId });
      },
      onChange: async (api) => {
        if (!isReady.current || isReceiving.current) return;
        const data = await api.saver.save();
        socket.emit("document:update", { projectId, documentId, data });
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

  /* ---- Socket events ---- */
  useEffect(() => {
    if (!socket) return;
    socket.on("document:loaded", (content) => {
      if (editorInstance.current && isReady.current && content) {
        isReceiving.current = true;
        editorInstance.current.render(content).finally(() => { isReceiving.current = false; });
      }
    });
    socket.on("document:updated", (data) => {
      if (editorInstance.current && isReady.current) {
        isReceiving.current = true;
        editorInstance.current.render(data).finally(() => { isReceiving.current = false; });
      }
    });
    return () => { socket.off("document:loaded"); socket.off("document:updated"); };
  }, [socket]);

  /* ---- Version history ---- */
  async function fetchVersions() {
    setLoadingVersions(true);
    try {
      const res = await api.get(`/projects/${projectId}/document/versions`);
      setVersions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function handleRestore(versionId, content) {
    if (!window.confirm("Restore this version? Current content will be overwritten.")) return;
    setRestoring(versionId);
    try {
      await api.post(`/projects/${projectId}/document/versions/${versionId}/restore`);
      if (editorInstance.current && isReady.current) {
        isReceiving.current = true;
        await editorInstance.current.render(content);
        isReceiving.current = false;
      }
      setShowHistory(false);
    } catch (err) {
      alert("Failed to restore version");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Editor area */}
      <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-zinc-600 text-xs ml-3 tracking-widest">DOCUMENT</span>
          </div>
          <button
            onClick={() => { setShowHistory(h => !h); if (!showHistory) fetchVersions(); }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#00ff9d] transition-colors"
          >
            <Clock size={12} /> History
          </button>
        </div>
        <div className="p-6">
          <div id="editorjs" className="prose prose-invert max-w-none min-h-[400px] text-white" />
        </div>
      </div>

      {/* Version history panel */}
      {showHistory && (
        <div className="w-64 flex-shrink-0 border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">Versions</span>
            <button onClick={() => setShowHistory(false)} className="text-zinc-600 hover:text-white text-xs">✕</button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-44px)]">
            {loadingVersions ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-zinc-600" size={18} /></div>
            ) : versions.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-8 px-4">No versions saved yet.<br />Every 10 edits a snapshot is saved.</p>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {versions.map(v => (
                  <div key={v.id} className="p-3 hover:bg-zinc-900 transition-colors group">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate">{v.savedBy}</p>
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                          {new Date(v.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestore(v.id, v.content)}
                        disabled={restoring === v.id}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[#00ff9d] hover:text-white transition-all"
                        title="Restore this version"
                      >
                        {restoring === v.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;

