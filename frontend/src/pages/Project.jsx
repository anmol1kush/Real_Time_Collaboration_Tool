import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { connectSocket } from "../services/socket";

import Navbar from "../components/Navbar";
import ChatBox from "../components/ChatBox";
import KanbanBoard from "../components/KanbanBoard";
import InviteBox from "../components/InviteBox";
import OnlineUsers from "../components/OnlineUsers";
import DocumentEditor from "../components/DocumentEditor";
import Whiteboard from "../components/Whiteboard";
import Codespace from "../components/Codespace";

const TABS = [
  { id: "kanban",     label: "Kanban",      icon: "⬜" },
  { id: "chat",       label: "Chat",        icon: "💬" },
  { id: "document",   label: "Document",    icon: "📄" },
  { id: "whiteboard", label: "Whiteboard",  icon: "🎨" },
  { id: "codespace",  label: "Codespace",   icon: "⌨️"  },
];

export default function Project() {
  const { projectId } = useParams();
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState("kanban");

  useEffect(() => {
    const s = connectSocket();
    s.emit("project:join", projectId);
    setSocket(s);
    return () => { s.disconnect(); };
  }, [projectId]);

  const isCodespace = activeTab === "codespace";

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className={`p-6 ${isCodespace ? "" : "grid grid-cols-1 lg:grid-cols-4 gap-6"}`}>

        {/* LEFT / MAIN PANEL */}
        <div className={isCodespace ? "w-full" : "lg:col-span-3 space-y-6"}>
          {/* Online users (hide in codespace to save space) */}
          {socket && !isCodespace && <OnlineUsers socket={socket} />}

          {/* Tab bar */}
          <div style={{
            display: "flex", gap: 0, borderBottom: "1px solid #222",
            marginBottom: 0,
          }}>
            {TABS.map(({ id, label, icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    padding: "10px 18px",
                    background: active ? (id === "codespace" ? "#1e1e1e" : "rgba(0,255,157,0.06)") : "transparent",
                    color: active ? (id === "codespace" ? "#cccccc" : "#00ff9d") : "#555",
                    border: "none",
                    borderBottom: active
                      ? `2px solid ${id === "codespace" ? "#007acc" : "#00ff9d"}`
                      : "2px solid transparent",
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all .15s",
                    fontFamily: id === "codespace"
                      ? "'Menlo','Monaco','Consolas',monospace"
                      : "inherit",
                    display: "flex", alignItems: "center", gap: 6,
                    letterSpacing: id === "codespace" ? "0.02em" : "inherit",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#999"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#555"; }}
                >
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Content pane */}
          <div style={{
            background: isCodespace ? "transparent" : "#0a0a0a",
            borderRadius: isCodespace ? 0 : 8,
            minHeight: isCodespace ? "auto" : 500,
            padding: isCodespace ? 0 : 16,
            marginTop: isCodespace ? 0 : 0,
          }}>
            {activeTab === "kanban"     && <KanbanBoard projectId={projectId} />}
            {activeTab === "chat"       && socket && <ChatBox socket={socket} projectId={projectId} />}
            {activeTab === "document"   && socket && <DocumentEditor socket={socket} projectId={projectId} documentId={projectId} />}
            {activeTab === "whiteboard" && socket && <Whiteboard socket={socket} projectId={projectId} />}
            {activeTab === "codespace"  && <Codespace projectId={projectId} />}
          </div>
        </div>

        {/* RIGHT PANEL — hidden in codespace to give max room */}
        {!isCodespace && (
          <div className="lg:col-span-1">
            <InviteBox projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}