import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
    getCodespaceStatus,
    startProjectCodespace,
    stopProjectCodespace
} from "../controllers/codespace.controller.js";

const router = Router();

router.get("/:projectId/status", authMiddleware, getCodespaceStatus);
router.post("/:projectId/start", authMiddleware, startProjectCodespace);
router.post("/:projectId/stop", authMiddleware, stopProjectCodespace);

export default router;
