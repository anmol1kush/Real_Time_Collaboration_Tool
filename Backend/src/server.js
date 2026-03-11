import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createProxyMiddleware } from "http-proxy-middleware";

import app from "./app.js";
import { connectMongo } from "./utils/mongo.js";
import { initRedis } from "./utils/redis.js";
import { prisma } from "./utils/prisma.js";
import { socketAuthMiddleware } from "./sockets/socketAuth.js";
import { registerSocketHandlers } from "./sockets/socketHandler.js";

dotenv.config();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

/* -------- Socket.IO Auth + Handlers -------- */
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

/* -------- CODESPACE PROXY -------- */
app.use(
  "/codespace/:projectId",
  createProxyMiddleware({
    router: async function (req) {
      const { projectId } = req.params;
      const port = await import("./services/docker.service.js").then(m => m.codespacePorts.get(projectId));
      return port ? `http://localhost:${port}` : "http://localhost:8080";
    },
    changeOrigin: true,
    ws: true,
    pathRewrite: (path, req) => path.replace(`/codespace/${req.params.projectId}`, ""),
  })
);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // PostgreSQL via Prisma
    await prisma.$connect();
    console.log("✅ PostgreSQL connected");

    // MongoDB (optional — for chat persistence)
    try {
      await connectMongo();
    } catch (mongoErr) {
      console.warn("⚠️  MongoDB not available — chat history disabled. Check Atlas IP whitelist.");
    }

    // Redis (optional — for presence tracking)
    try {
      await initRedis();
    } catch (redisErr) {
      console.warn("⚠️  Redis not available — presence features disabled. Start Redis to enable.");
    }

    server.listen(PORT, () => {
      console.log(`🚀 Backend running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err.message || err);
    process.exit(1);
  }
}

start();