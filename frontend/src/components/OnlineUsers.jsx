import { useEffect, useState } from "react";

export default function OnlineUsers({ socket }) {
  const [online, setOnline] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Ask server for current presence immediately on mount
    socket.emit("presence:get");

    // Server emits an array of online user IDs
    socket.on("presence:update", (ids) => {
      setOnline(Array.isArray(ids) ? ids : []);
    });

    return () => {
      socket.off("presence:update");
    };
  }, [socket]);

  return (
    <div className="text-sm text-green-400">
      Online users: {online.length}
    </div>
  );
}