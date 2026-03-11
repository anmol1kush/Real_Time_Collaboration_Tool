import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma.js";

const router = express.Router();

/* -------- GET MY PENDING INVITES -------- */
router.get("/mine", authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;

        const invites = await prisma.invite.findMany({
            where: { email: userEmail, status: "PENDING" },
            include: { project: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" }
        });

        res.json(invites);
    } catch (err) {
        console.error("[getMyInvites]", err);
        res.status(500).json({ message: "Failed to fetch invites", error: err.message });
    }
});

export default router;
