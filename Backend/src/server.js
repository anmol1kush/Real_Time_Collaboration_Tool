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
import { codespaceUrls } from "./services/docker.service.js";

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

/* -------- CODESPACE PROXY (must be registered BEFORE other middleware) -------- */
const codespaceProxy = createProxyMiddleware({
  target: "http://127.0.0.1:8080",   // required by http-proxy-middleware v3 (router overrides this)
  changeOrigin: true,
  ws: false,  // WebSocket upgrades handled manually below (using http-proxy directly)
  xfwd: true,
  secure: false,
  logger: console,

  router: async (req) => {
    // originalUrl always has the full path (Express 5 strips mount path from req.url)
    const url = req.originalUrl || req.url;
    const match = url.match(/^\/codespace\/([^/?]+)/);
    const projectId = match ? match[1] : null;

    if (!projectId) return "http://127.0.0.1:8080";

    let targetUrl = codespaceUrls.get(projectId);

    if (!targetUrl) {
      targetUrl = "http://127.0.0.1:8080"; // Fallback URL
      // If we are dynamically fetching, we should reconstruct based on isDocker, but handled earlier
    }

    console.log(`[codespace-proxy] routing ${projectId} → ${targetUrl}`);
    return targetUrl;
  },

  pathRewrite: (path, req) => {
    // In Express 5 with app.use("/codespace", proxy), req.url is stripped of /codespace
    // but req.originalUrl keeps the full path. Use originalUrl for prefix matching.
    const fullUrl = req.originalUrl || path;
    const match = fullUrl.match(/^\/codespace\/([^/?]+)(.*)/);

    if (!match) return path;

    // Everything after /codespace/{projectId} is the real path for code-server
    let newPath = match[2] || "/";
    if (!newPath.startsWith("/")) {
      newPath = "/" + newPath;
    }

    console.log(`[codespace-proxy] pathRewrite: ${fullUrl} → ${newPath}`);
    return newPath;
  }
});

/* Attach proxy BEFORE other middleware so /codespace/* requests are caught first */
app.use("/codespace", codespaceProxy);

/* -------- Diagnostic: test WebSocket connectivity to a codespace container -------- */
app.get("/api/codespace/:projectId/ws-test", (req, res) => {
  const { projectId } = req.params;
  const targetUrl = codespaceUrls.get(projectId);
  if (!targetUrl) {
    return res.status(404).json({ error: "No cached URL for this project" });
  }

  const urlObj = new URL(targetUrl);

  // Try a raw HTTP upgrade request to code-server
  const testReq = http.request({
    hostname: urlObj.hostname,
    port: urlObj.port || 80,
    path: "/",
    method: "GET",
    headers: {
      "Connection": "Upgrade",
      "Upgrade": "websocket",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Key": "dGVzdA==",  // base64("test")
      "Host": urlObj.host,
    },
  });

  const timeout = setTimeout(() => {
    testReq.destroy();
    res.status(504).json({ error: "Timeout - no response from code-server" });
  }, 5000);

  testReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    clearTimeout(timeout);
    proxySocket.destroy();
    res.json({
      success: true,
      message: "WebSocket upgrade succeeded!",
      statusCode: 101,
      headers: proxyRes.headers,
      port: port,
    });
  });

  testReq.on("response", (proxyRes) => {
    clearTimeout(timeout);
    let body = "";
    proxyRes.on("data", (chunk) => body += chunk);
    proxyRes.on("end", () => {
      res.json({
        success: false,
        message: `Got HTTP ${proxyRes.statusCode} instead of 101`,
        statusCode: proxyRes.statusCode,
        headers: proxyRes.headers,
        body: body.substring(0, 500),
        targetUrl,
      });
    });
  });

  testReq.on("error", (err) => {
    clearTimeout(timeout);
    res.status(500).json({ error: err.message, targetUrl });
  });

  testReq.end();
});

/* -------- Debug requests -------- */
// app.use((req, res, next) => {
//   console.log("REQUEST HIT:", req.method, req.url);
//   next();
// });

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

    /* WebSocket support for code-server (raw socket proxy for maximum reliability) */
    server.on("upgrade", (req, socket, head) => {
      console.log(`\n🔌🔌🔌 [UPGRADE EVENT] url=${req.url} head=${head.length}bytes 🔌🔌🔌\n`);
      // Prevent socket errors from crashing the server
      socket.on("error", (err) => {
        console.error("[ws-upgrade] Client socket error:", err.message);
      });

      const referer = req.headers.referer || "";
      let projectId = null;

      if (req.url.startsWith("/codespace/")) {
        const match = req.url.match(/^\/codespace\/([^/?]+)/);
        projectId = match ? match[1] : null;
      } else if (referer.includes("/codespace/")) {
        const match = referer.match(/\/codespace\/([^/?]+)/);
        projectId = match ? match[1] : null;
      } else {
        // Not a codespace WebSocket — let Socket.IO or others handle it
        return;
      }

      if (!projectId) {
        socket.destroy();
        return;
      }

      let targetUrl = codespaceUrls.get(projectId);

      if (!targetUrl) {
        console.error("[ws-upgrade] No cached URL for:", projectId);
        socket.destroy();
        return;
      }

      const urlObj = new URL(targetUrl);

      // Rewrite the URL to strip /codespace/{projectId} prefix
      const originalUrl = req.url;
      const prefix = `/codespace/${projectId}`;
      let targetPath = req.url;
      if (targetPath.startsWith(prefix)) {
        targetPath = targetPath.substring(prefix.length) || "/";
      }

      console.log(`[ws-upgrade] ${originalUrl} → ${targetPath} (${targetUrl})`);

      // Build headers for the upstream request — forward everything from the client
      const upstreamHeaders = { ...req.headers };
      upstreamHeaders.host = urlObj.host;
      upstreamHeaders.origin = `http://${urlObj.host}`;

      // Make a raw HTTP upgrade request to code-server
      const proxyReq = http.request({
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: targetPath,
        method: "GET",
        headers: upstreamHeaders,
      });

      proxyReq.on("error", (err) => {
        console.error("[ws-upgrade] Upstream request error:", err.message);
        socket.destroy();
      });

      proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
        proxySocket.on("error", (err) => {
          console.error("[ws-upgrade] Upstream socket error:", err.message);
        });

        // Construct the 101 Switching Protocols response
        let responseHead = "HTTP/1.1 101 Switching Protocols\r\n";
        const resHeaders = proxyRes.headers;
        for (const key of Object.keys(resHeaders)) {
          const val = resHeaders[key];
          if (Array.isArray(val)) {
            for (const v of val) {
              responseHead += `${key}: ${v}\r\n`;
            }
          } else {
            responseHead += `${key}: ${val}\r\n`;
          }
        }
        responseHead += "\r\n";

        // Send the 101 response + any buffered head data back to the client
        socket.write(responseHead);
        if (proxyHead && proxyHead.length > 0) {
          socket.write(proxyHead);
        }

        console.log(`[ws-upgrade] ✅ WebSocket established for ${projectId} on ${targetUrl}`);

        // Pipe bidirectionally: client ↔ code-server
        proxySocket.pipe(socket);
        socket.pipe(proxySocket);

        // Cleanup on close
        proxySocket.on("end", () => socket.end());
        socket.on("end", () => proxySocket.end());
        proxySocket.on("close", () => socket.destroy());
        socket.on("close", () => proxySocket.destroy());
      });

      proxyReq.on("response", (res) => {
        // If code-server responded with a normal HTTP response instead of 101,
        // something went wrong — log it and close
        console.error(`[ws-upgrade] Got HTTP ${res.statusCode} instead of 101 upgrade`);
        socket.destroy();
      });

      // Send the head data (buffered bytes from the initial request) and end the request
      if (head && head.length > 0) {
        proxyReq.write(head);
      }
      proxyReq.end();
    });

  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
}

start();