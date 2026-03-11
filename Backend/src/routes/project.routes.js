import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireProjectRole } from "../middlewares/role.middleware.js";

import {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject
} from "../controllers/project.controller.js";

import {
  createInvite,
  getProjectInvites,
  acceptInvite,
  rejectInvite
} from "../controllers/invite.controller.js";

import { getDocumentVersions, restoreDocumentVersion } from "../controllers/document.controller.js";

const router = express.Router();

/* -------- PROJECTS -------- */
router.post("/", authMiddleware, createProject);
router.get("/", authMiddleware, getMyProjects);
router.get("/:projectId", authMiddleware, getProjectById);

router.put("/:projectId", authMiddleware, requireProjectRole("ADMIN"), updateProject);
router.delete("/:projectId", authMiddleware, requireProjectRole("ADMIN"), deleteProject);

/* -------- DOCUMENT VERSIONS -------- */
router.get("/:projectId/document/versions", authMiddleware, getDocumentVersions);
router.post("/:projectId/document/versions/:versionId/restore", authMiddleware, restoreDocumentVersion);

/* -------- INVITES -------- */
// Admin: send invite / view all invites for a project
router.post("/:projectId/invite", authMiddleware, requireProjectRole("ADMIN"), createInvite);
router.get("/:projectId/invites", authMiddleware, requireProjectRole("ADMIN"), getProjectInvites);

// Invitee: accept or reject
router.post("/invite/:inviteId/accept", authMiddleware, acceptInvite);
router.post("/invite/:inviteId/reject", authMiddleware, rejectInvite);

export default router;
