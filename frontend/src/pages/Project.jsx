import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { connectSocket } from "../services/socket";
import { motion } from "framer-motion";

import NavbarProject from "../components/Navbarproject";
import ChatBox from "../components/ChatBox";
import KanbanBoard from "../components/KanbanBoard";
import DocumentEditor from "../components/DocumentEditor";
import Whiteboard from "../components/Whiteboard";
import Codespace from "../components/Codespace";

const TABS = [
  { id: "kanban",     label: "Kanban",     icon: "⬜" },
  { id: "chat",       label: "Chat",       icon: "💬" },
  { id: "document",   label: "Document",   icon: "📄" },
  { id: "whiteboard", label: "Whiteboard", icon: "🎨" },
  { id: "codespace",  label: "Codespace",  icon: "⌨️"  },
];

/* ── Black grid background style ── */
const GRID_BG = {
  background: "#000000",
  backgroundImage: `
    linear-gradient(to right, rgba(75, 85, 99, 0.4) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(75, 85, 99, 0.4) 1px, transparent 1px)
  `,
  backgroundSize: "40px 40px",
};

const NAV_H    = 56; // px — navbar height
const TABBAR_H = 45; // px — tab bar height

export default function Project() {
  const { projectId } = useParams();
  const [socket, setSocket]       = useState(null);
  const [activeTab, setActiveTab] = useState("kanban");

  useEffect(() => {
    const s = connectSocket();
    s.emit("project:join", projectId);
    setSocket(s);
    return () => { s.disconnect(); };
  }, [projectId]);

  /* height available for tab content */
  const contentH = `calc(100vh - ${NAV_H}px - ${TABBAR_H}px)`;

  return (
    <div className="min-h-screen w-full relative text-white overflow-hidden" style={GRID_BG}>

      {/* ── Navbar ── */}
      <NavbarProject projectId={projectId} />

      {/* ── Tab bar ── */}
      <div
        className="flex items-end border-b border-white/[0.07] px-2 relative z-20"
        style={{ height: TABBAR_H, background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
      >
        {TABS.map(({ id, label, icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-1.5 px-4 h-full text-[13px]
                font-medium transition-all select-none
                ${active
                  ? id === "codespace"
                    ? "text-[#007acc]"
                    : "text-[#00ff9d]"
                  : "text-white/35 hover:text-white/70"
                }`}
              style={{
                fontFamily: id === "codespace"
                  ? "'Menlo','Monaco','Consolas',monospace"
                  : "inherit",
              }}
            >
              <span style={{ fontSize: 13 }}>{icon}</span>
              {label}

              {/* Active underline */}
              {active && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{
                    background: id === "codespace" ? "#007acc" : "#00ff9d",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div
        className="relative z-10 overflow-hidden"
        style={{ height: contentH }}
      >
        {activeTab === "kanban" && (
          <div className="h-full overflow-y-auto p-5">
            <KanbanBoard projectId={projectId} />
          </div>
        )}

        {activeTab === "chat" && socket && (
          <div className="h-full">
            <ChatBox socket={socket} projectId={projectId} />
          </div>
        )}

        {activeTab === "document" && socket && (
          <div className="h-full">
            <DocumentEditor socket={socket} projectId={projectId} documentId={projectId} />
          </div>
        )}

        {activeTab === "whiteboard" && socket && (
          <div className="h-full">
            <Whiteboard socket={socket} projectId={projectId} />
          </div>
        )}

        {activeTab === "codespace" && (
          <div className="h-full">
            <Codespace projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}