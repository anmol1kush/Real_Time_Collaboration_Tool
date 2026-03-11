import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireProjectRole } from "../middlewares/role.middleware.js";
import { getTasks, createTask, updateTask, deleteTask } from "../controllers/task.controller.js";

const router = express.Router({ mergeParams: true }); // mergeParams to access :projectId from parent

/* -------- TASKS (nested under /projects/:projectId) -------- */

// GET  /api/projects/:projectId/tasks       → list all tasks
router.get("/", authMiddleware, getTasks);

// POST /api/projects/:projectId/tasks       → create task (any member)
router.post("/", authMiddleware, createTask);

/* -------- STANDALONE TASK ROUTES (/api/tasks/:taskId) -------- */
export const taskStandaloneRouter = express.Router();

// PUT  /api/tasks/:taskId    → update title/status (any member)
taskStandaloneRouter.put("/:taskId", authMiddleware, updateTask);

// DELETE /api/tasks/:taskId  → delete task (member or admin)
taskStandaloneRouter.delete("/:taskId", authMiddleware, deleteTask);

export default router;
