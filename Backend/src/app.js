import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes, { taskStandaloneRouter } from "./routes/task.routes.js";
import inviteRoutes from "./routes/invite.routes.js";
import codespaceRoutes from "./routes/codespace.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";

const app = express();

/* -------- Middlewares -------- */
app.use(cors());
app.use(express.json({ limit: "5mb" }));

/* -------- Routes -------- */
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/tasks", taskRoutes);
app.use("/api/tasks", taskStandaloneRouter);
app.use("/api/invites", inviteRoutes);
app.use("/api/codespace", codespaceRoutes);
app.use("/api/feedback", feedbackRoutes);

app.get("/", (_, res) => {
  res.send("RTCT API is running");
});

export default app;