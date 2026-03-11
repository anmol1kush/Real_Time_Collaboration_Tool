import { setUserOnline, setUserOffline } from "./presence.js";
import { Chat } from "../models/chat.model.js";
import { prisma } from "../utils/prisma.js";

export function registerSocketHandlers(io, socket) {
  const user = socket.user;

  /* -------- USER CONNECT -------- */
  setUserOnline(user.id, socket.id);
  console.log(`🟢 ${user.name} connected`);

  socket.on("disconnect", async () => {
    await setUserOffline(user.id);
    console.log(`🔴 ${user.name} disconnected`);
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
        chat = await Chat.create({ projectId, participants: [user.id], messages: [payload] });
      } else {
        chat.messages.push(payload);
        await chat.save();
      }
    } catch (err) {
      console.warn("Chat save skipped (MongoDB offline?)");
    }

    io.to(projectId).emit("project:message", payload);
  });

  /* -------- LIVE DOCUMENT — FETCH (load from DB) -------- */
  socket.on("document:fetch", async ({ projectId, documentId }) => {
    try {
      const doc = await prisma.document.findFirst({
        where: { projectId }
      });

      if (doc) {
        socket.emit("document:loaded", doc.content);
      } else {
        socket.emit("document:loaded", null); // new document, start blank
      }
    } catch (err) {
      console.error("[document:fetch]", err.message);
      socket.emit("document:loaded", null);
    }
  });

  /* -------- LIVE DOCUMENT — UPDATE (save to DB + broadcast) -------- */
  const editCounters = {}; // track edits per document in memory
  socket.on("document:update", async ({ projectId, documentId, data }) => {
    try {
      // Upsert current document content
      const existing = await prisma.document.findFirst({ where: { projectId } });
      let docId;

      if (existing) {
        await prisma.document.update({ where: { id: existing.id }, data: { content: data } });
        docId = existing.id;
      } else {
        const created = await prisma.document.create({ data: { content: data, projectId } });
        docId = created.id;
      }

      // Save a version snapshot every 10 edits
      editCounters[docId] = (editCounters[docId] || 0) + 1;
      if (editCounters[docId] % 10 === 0) {
        await prisma.documentVersion.create({
          data: { content: data, savedBy: user.id, documentId: docId }
        });

        // Keep only the last 50 versions
        const versions = await prisma.documentVersion.findMany({
          where: { documentId: docId },
          orderBy: { createdAt: "desc" },
          skip: 50
        });
        if (versions.length > 0) {
          await prisma.documentVersion.deleteMany({ where: { id: { in: versions.map(v => v.id) } } });
        }
      }
    } catch (err) {
      console.error("[document:update] save failed:", err.message);
    }

    // Broadcast to all OTHER clients in the room
    socket.to(projectId).emit("document:updated", data);
  });

  /* -------- LIVE WHITEBOARD -------- */
  socket.on("whiteboard:update", ({ projectId, elements }) => {
    socket.to(projectId).emit("whiteboard:updated", elements);
  });
}