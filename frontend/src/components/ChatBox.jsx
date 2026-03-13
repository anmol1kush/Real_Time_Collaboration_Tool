import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, Loader2, SmilePlus } from "lucide-react";
import { useAuth } from "../auth/authContext";

/* ── Utility: generate consistent avatar color from name ── */
function avatarColor(name = "") {
  const palette = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#06b6d4", "#f97316", "#6366f1",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/* ── Utility: format timestamp ── */
function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ── Avatar bubble ── */
function Avatar({ name }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none"
      style={{ background: avatarColor(name) }}
    >
      {initials}
    </div>
  );
}

/* ── Single message bubble ── */
function MessageBubble({ msg, isMine, showAvatar, showName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar — only show for first message in a group */}
      <div className="w-8 flex-shrink-0">
        {showAvatar && !isMine && <Avatar name={msg.senderName} />}
      </div>

      <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMine ? "items-end" : "items-start"}`}>
        {showName && !isMine && (
          <span className="text-[11px] font-semibold px-1" style={{ color: avatarColor(msg.senderName) }}>
            {msg.senderName}
          </span>
        )}

        <div
          className={`relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md
            ${isMine
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-[#1e2433] border border-white/[0.07] text-white/90 rounded-bl-sm"
            }`}
        >
          {/* Text message */}
          {(msg.content?.value || msg.content?.text || (typeof msg.content === "string" && msg.content)) && (
            <p className="break-words whitespace-pre-wrap">
              {msg.content?.value || msg.content?.text || msg.content}
            </p>
          )}

          {/* Image message */}
          {msg.content?.msgType === "image" && msg.content?.url && (
            <img
              src={msg.content.url}
              alt="shared"
              className="rounded-lg max-w-[220px] max-h-[180px] object-cover mt-1"
            />
          )}
        </div>

        <span className="text-[10px] text-white/25 px-1">
          {formatTime(msg.timestamp || msg.createdAt)}
        </span>
      </div>

      {/* Right spacer for other's messages */}
      {!isMine && <div className="w-8 flex-shrink-0" />}
    </motion.div>
  );
}

/* ── Main ChatBox ── */
export default function ChatBox({ socket, projectId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  /* ── Socket listeners ── */
  useEffect(() => {
    if (!socket) return;

    setConnected(socket.connected);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("project:history", (history) => {
      setMessages(Array.isArray(history) ? history : []);
    });

    socket.on("project:message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("project:history");
      socket.off("project:message");
    };
  }, [socket]);

  /* ── Auto scroll ── */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send ── */
  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    socket.emit("project:message", { projectId, message: trimmed });
    setText("");
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ── Group messages by sender (suppress repetitive avatars/names) ── */
  const grouped = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const isSameSender = prev && prev.senderName === msg.senderName;
    const isMine = user && (msg.senderId === user.id || msg.senderName === user.name);
    return { msg, isMine, showAvatar: !isSameSender, showName: !isSameSender };
  });

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0d1117]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <MessageSquare size={14} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">Project Chat</p>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}
              />
              <span className="text-[10px] text-white/35">
                {connected ? "Connected" : "Reconnecting…"}
              </span>
            </div>
          </div>
        </div>
        <span className="text-[11px] text-white/20 font-mono bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
          {messages.length} msgs
        </span>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-[#0b0f1a] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <MessageSquare size={22} className="text-blue-400/50" />
            </div>
            <div className="text-center">
              <p className="text-white/30 text-sm font-medium">No messages yet</p>
              <p className="text-white/15 text-xs mt-1">Be the first to say something!</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {grouped.map(({ msg, isMine, showAvatar, showName }, i) => (
              <MessageBubble
                key={msg.id || i}
                msg={msg}
                isMine={isMine}
                showAvatar={showAvatar}
                showName={showName}
              />
            ))}
          </AnimatePresence>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="px-3 py-3 border-t border-white/[0.06] bg-[#0d1117]">
        <div className="flex items-end gap-2 bg-[#161b22] border border-white/[0.08] rounded-2xl px-3 py-2
          focus-within:border-blue-500/50 transition-colors duration-200">

          {/* Textarea grows with content */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // Auto resize
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/20
              resize-none outline-none leading-relaxed py-0.5 max-h-[120px] overflow-y-auto"
            style={{ height: "auto" }}
          />

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl
              bg-blue-600 text-white transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              hover:bg-blue-500 active:bg-blue-700 mb-0.5"
          >
            {sending
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />
            }
          </motion.button>
        </div>

        <p className="text-[10px] text-white/15 text-center mt-1.5">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}