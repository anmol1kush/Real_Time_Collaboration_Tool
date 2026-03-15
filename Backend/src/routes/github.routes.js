import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  connectGitHub,
  githubCallback,
  githubStatus,
  disconnectGitHub,
} from "../controllers/github.controller.js";

const router = Router();

// Public — starts OAuth flow (JWT passed via query param instead of header)
router.get("/connect", connectGitHub);

// Public — GitHub redirects here after user authorises
router.get("/callback", githubCallback);

// Protected — check if user has GitHub connected
router.get("/status", authMiddleware, githubStatus);

// Protected — remove GitHub token
router.post("/disconnect", authMiddleware, disconnectGitHub);

export default router;
