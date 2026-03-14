import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createProxyMiddleware } from "http-proxy-middleware";
import Docker from "dockerode";

import app from "./app.js";
import { connectMongo } from "./utils/mongo.js";
import { initRedis } from "./utils/redis.js";
import { prisma } from "./utils/prisma.js";

import { socketAuthMiddleware } from "./sockets/socketAuth.js";
import { registerSocketHandlers } from "./sockets/socketHandler.js";
import { codespacePorts } from "./services/docker.service.js";

dotenv.config();

const docker = new Docker();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  destroyUpgrade: false
});

/* -------- Socket.IO -------- */
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

/* -------- Debug requests -------- */
app.use((req, res, next) => {
  console.log("REQUEST HIT:", req.method, req.url);
  next();
});

/* -------- CODESPACE PROXY -------- */
const codespaceProxy = createProxyMiddleware({
  changeOrigin: true,
  ws: true,
  xfwd: true,
  secure: false,
  logLevel: "debug",

  router: async (req) => {
    const url = req.originalUrl || req.url;
    const match = url.match(/^\/codespace\/([^/?]+)/);
    const projectId = match ? match[1] : null;

    if (!projectId) return "http://localhost:8080";

    let port = codespacePorts.get(projectId);

    if (!port) {
      try {
        const container = docker.getContainer(`codespace_${projectId}`);
        const data = await container.inspect();
        port = data.NetworkSettings.Ports["8080/tcp"][0].HostPort;
        codespacePorts.set(projectId, port);
      } catch (err) {
        console.error("Missing container for:", projectId);
        return "http://localhost:8080";
      }
    }

    return `http://localhost:${port}`;
  },

  pathRewrite: (path, req) => {
    const url = req.originalUrl || req.url || path;
    const match = url.match(/^\/codespace\/([^/?]+)/);
    const projectId = match ? match[1] : null;

    if (!projectId) return path;

    // Remove the exact projectId prefix from the request path so code-server sees it as /
    let newPath = path;
    const prefix1 = `/codespace/${projectId}`;
    const prefix2 = `/${projectId}`;

    if (newPath.startsWith(prefix1)) {
      newPath = newPath.substring(prefix1.length);
    } else if (newPath.startsWith(prefix2)) {
      newPath = newPath.substring(prefix2.length);
    }

    if (!newPath.startsWith("/")) {
      newPath = "/" + newPath;
    }
    
    return newPath;
  }
});

/* Attach proxy */
app.use("/codespace", codespaceProxy);

/* -------- SERVER START -------- */
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected");

    try {
      await connectMongo();
    } catch {
      console.warn("⚠️ MongoDB not available");
    }

    try {
      await initRedis();
    } catch {
      console.warn("⚠️ Redis not available");
    }

    server.listen(PORT, () => {
      console.log(`🚀 Backend running at http://localhost:${PORT}`);
    });

    /* WebSocket support for code-server */
    server.on("upgrade", async (req, socket, head) => {
      // WS Requests from code-server don't always have the prefix in req.url
      // but they DO have the referer header: http://localhost:3000/codespace/{projectId}/...
      const referer = req.headers.referer || "";
      let projectId = null;

      if (req.url.startsWith("/codespace/")) {
          const match = req.url.match(/^\/codespace\/([^/?]+)/);
          projectId = match ? match[1] : null;
      } else if (referer.includes("/codespace/")) {
          const match = referer.match(/\/codespace\/([^/?]+)/);
          projectId = match ? match[1] : null;
      } else {
         // Ignore socket.io and other websockets
         return;
      }

      if (!projectId) {
        socket.destroy();
        return;
      }

      let port = codespacePorts.get(projectId);

      if (!port) {
        try {
          const container = docker.getContainer(`codespace_${projectId}`);
          const data = await container.inspect();

          port = data.NetworkSettings.Ports["8080/tcp"][0].HostPort;
          codespacePorts.set(projectId, port);
        } catch (err) {
          console.error("Upgrade error:", err);
          socket.destroy();
          return;
        }
      }

      const target = `http://localhost:${port}`;
      codespaceProxy.upgrade(req, socket, head, { target });
    });

  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
}

start();