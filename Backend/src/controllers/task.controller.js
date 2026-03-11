import { prisma } from "../utils/prisma.js";

/* -------- LIST TASKS FOR A PROJECT -------- */
export async function getTasks(req, res) {
    try {
        const { projectId } = req.params;

        const tasks = await prisma.task.findMany({
            where: { projectId },
            orderBy: { createdAt: "asc" }
        });

        res.json(tasks);
    } catch (err) {
        console.error("[getTasks]", err);
        res.status(500).json({ message: "Failed to fetch tasks", error: err.message });
    }
}

/* -------- CREATE TASK -------- */
export async function createTask(req, res) {
    try {
        const { projectId } = req.params;
        const { title, status = "TODO" } = req.body;

        if (!title?.trim()) {
            return res.status(400).json({ message: "Task title is required" });
        }

        const validStatuses = ["TODO", "IN_PROGRESS", "DONE"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
        }

        const task = await prisma.task.create({
            data: {
                title: title.trim(),
                status,
                projectId
            }
        });

        res.status(201).json(task);
    } catch (err) {
        console.error("[createTask]", err);
        res.status(500).json({ message: "Failed to create task", error: err.message });
    }
}

/* -------- UPDATE TASK (title and/or status) -------- */
export async function updateTask(req, res) {
    try {
        const { taskId } = req.params;
        const { title, status } = req.body;

        const validStatuses = ["TODO", "IN_PROGRESS", "DONE"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
        }

        // Build update data — only include fields that were sent
        const data = {};
        if (title !== undefined) data.title = title.trim();
        if (status !== undefined) data.status = status;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: "Nothing to update" });
        }

        const task = await prisma.task.update({
            where: { id: taskId },
            data
        });

        res.json(task);
    } catch (err) {
        if (err.code === "P2025") {
            return res.status(404).json({ message: "Task not found" });
        }
        console.error("[updateTask]", err);
        res.status(500).json({ message: "Failed to update task", error: err.message });
    }
}

/* -------- DELETE TASK -------- */
export async function deleteTask(req, res) {
    try {
        const { taskId } = req.params;

        await prisma.task.delete({ where: { id: taskId } });

        res.json({ message: "Task deleted" });
    } catch (err) {
        if (err.code === "P2025") {
            return res.status(404).json({ message: "Task not found" });
        }
        console.error("[deleteTask]", err);
        res.status(500).json({ message: "Failed to delete task", error: err.message });
    }
}
