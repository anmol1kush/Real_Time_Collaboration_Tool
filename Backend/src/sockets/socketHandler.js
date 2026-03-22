import { Chat } from "../models/chat.model.js";
import { prisma } from "../utils/prisma.js";
import {
  getOnlineUsers,
  setUserOffline,
  setUserOnline
} from "../utils/redisUser.js";

export function registerSocketHandlers(io, socket) {
  const user = socket.user;

  /* -------- USER CONNECT -------- */
  setUserOnline(user.id, socket.id).then(async () => {
    console.log(`🟢 ${user.name} connected`);

    // Broadcast updated online users
    const onlineUsers = await getOnlineUsers();
    io.emit("presence:update", onlineUsers);
  });

  /* -------- USER DISCONNECT -------- */
  socket.on("disconnect", async () => {
    await setUserOffline(user.id);
    console.log(`🔴 ${user.name} disconnected`);

    // Broadcast updated online users
    const onlineUsers = await getOnlineUsers();
    io.emit("presence:update", onlineUsers);
  });

  /* -------- JOIN PROJECT ROOM -------- */
  socket.on("project:join", async (projectId) => {
    socket.join(projectId);

    // Send chat history
    try {
      const chat = await Chat.findOne({ projectId });
      if (chat) socket.emit("project:history", chat.messages);
    } catch (err) {
      console.warn("Chat history unavailable (MongoDB offline?)");
    }

    // Send current online users to the joining socket
    try {
      const onlineUsers = await getOnlineUsers();
      socket.emit("presence:update", onlineUsers);
    } catch (err) {
      console.warn("Could not fetch online users on join");
    }
  });

  /* -------- PRESENCE: GET (on-demand) -------- */
  socket.on("presence:get", async () => {
    try {
      const onlineUsers = await getOnlineUsers();
      socket.emit("presence:update", onlineUsers);
    } catch (err) {
      console.warn("Could not fetch online users");
    }
  });

  /* -------- KANBAN: RELAY -------- */
  socket.on("kanban:created", ({ projectId, task }) => {
    socket.to(projectId).emit("kanban:created", task);
  });

  socket.on("kanban:updated", ({ projectId, taskId, status }) => {
    socket.to(projectId).emit("kanban:updated", { taskId, status });
  });

  socket.on("kanban:deleted", ({ projectId, taskId }) => {
    socket.to(projectId).emit("kanban:deleted", { taskId });
  });

  /* -------- SEND PROJECT MESSAGE -------- */
  socket.on("project:message", async ({ projectId, message }) => {
    const payload = {
      senderId: user.id,
      senderName: user.name,
      content: { type: "text", value: message }
    };

    try {
      let chat = await Chat.findOne({ projectId });

      if (!chat) {
        chat = await Chat.create({
          projectId,
          participants: [user.id],
          messages: [payload]
        });
      } else {
        chat.messages.push(payload);
        await chat.save();
      }
    } catch (err) {
      console.warn("Chat save skipped (MongoDB offline?)");
    }

    io.to(projectId).emit("project:message", payload);
  });

  /* -------- LIVE DOCUMENT — FETCH -------- */
  socket.on("document:fetch", async ({ projectId }) => {
    try {
      const doc = await prisma.document.findFirst({
        where: { projectId }
      });

      socket.emit("document:loaded", doc ? doc.content : null);
    } catch (err) {
      console.error("[document:fetch]", err.message);
      socket.emit("document:loaded", null);
    }
  });

  /* -------- LIVE DOCUMENT — UPDATE -------- */
  const editCounters = {};

  socket.on("document:update", async ({ projectId, data }) => {
    try {
      const existing = await prisma.document.findFirst({
        where: { projectId }
      });

      let docId;

      if (existing) {
        await prisma.document.update({
          where: { id: existing.id },
          data: { content: data }
        });
        docId = existing.id;
      } else {
        const created = await prisma.document.create({
          data: { content: data, projectId }
        });
        docId = created.id;
      }

      // Versioning every 10 edits
      editCounters[docId] = (editCounters[docId] || 0) + 1;

      if (editCounters[docId] % 10 === 0) {
        await prisma.documentVersion.create({
          data: {
            content: data,
            savedBy: user.id,
            documentId: docId
          }
        });

        // Keep only last 50 versions
        const oldVersions = await prisma.documentVersion.findMany({
          where: { documentId: docId },
          orderBy: { createdAt: "desc" },
          skip: 50
        });

        if (oldVersions.length > 0) {
          await prisma.documentVersion.deleteMany({
            where: { id: { in: oldVersions.map(v => v.id) } }
          });
        }
      }
    } catch (err) {
      console.error("[document:update] save failed:", err.message);
    }

    // Broadcast to others
    socket.to(projectId).emit("document:updated", data);
  });

  /* -------- LIVE WHITEBOARD -------- */
  socket.on("whiteboard:update", ({ projectId, elements }) => {
    socket.to(projectId).emit("whiteboard:updated", elements);
  });
}