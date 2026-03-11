import { prisma } from "../utils/prisma.js";

/* -------- CREATE INVITE -------- */
export async function createInvite(req, res) {
  try {
    const { projectId } = req.params;
    const { email } = req.body;

    if (!email?.trim()) return res.status(400).json({ message: "Email is required" });

    // Check if user is already a member
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const existing = await prisma.membership.findUnique({
        where: { userId_projectId: { userId: user.id, projectId } }
      });
      if (existing) return res.status(400).json({ message: "User is already a member" });
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await prisma.invite.findFirst({
      where: { projectId, email, status: "PENDING" }
    });
    if (existingInvite) return res.status(400).json({ message: "Invite already sent to this email" });

    const invite = await prisma.invite.create({
      data: {
        projectId,
        email: email.trim(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days
      },
      include: { project: { select: { name: true } } }
    });

    res.status(201).json(invite);
  } catch (err) {
    console.error("[createInvite]", err);
    res.status(500).json({ message: "Failed to send invite", error: err.message });
  }
}

/* -------- GET PROJECT INVITES -------- */
export async function getProjectInvites(req, res) {
  try {
    const { projectId } = req.params;

    const invites = await prisma.invite.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" }
    });

    res.json(invites);
  } catch (err) {
    console.error("[getProjectInvites]", err);
    res.status(500).json({ message: "Failed to fetch invites", error: err.message });
  }
}

/* -------- ACCEPT INVITE -------- */
export async function acceptInvite(req, res) {
  try {
    const { inviteId } = req.params;
    const userId = req.user.id;

    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
      include: { project: { select: { id: true, name: true } } }
    });

    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.status !== "PENDING") return res.status(400).json({ message: `Invite is already ${invite.status.toLowerCase()}` });
    if (new Date() > invite.expiresAt) {
      await prisma.invite.update({ where: { id: inviteId }, data: { status: "REJECTED" } });
      return res.status(400).json({ message: "Invite has expired" });
    }

    // Check if already a member
    const existing = await prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId: invite.projectId } }
    });
    if (existing) return res.status(400).json({ message: "Already a member of this project" });

    await prisma.membership.create({
      data: { userId, projectId: invite.projectId, role: "MEMBER" }
    });

    await prisma.invite.update({ where: { id: inviteId }, data: { status: "ACCEPTED" } });

    res.json({ message: `Joined project: ${invite.project.name}`, projectId: invite.projectId });
  } catch (err) {
    console.error("[acceptInvite]", err);
    res.status(500).json({ message: "Failed to accept invite", error: err.message });
  }
}

/* -------- REJECT INVITE -------- */
export async function rejectInvite(req, res) {
  try {
    const { inviteId } = req.params;

    const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.status !== "PENDING") return res.status(400).json({ message: `Invite is already ${invite.status.toLowerCase()}` });

    await prisma.invite.update({ where: { id: inviteId }, data: { status: "REJECTED" } });

    res.json({ message: "Invite rejected" });
  } catch (err) {
    console.error("[rejectInvite]", err);
    res.status(500).json({ message: "Failed to reject invite", error: err.message });
  }
}