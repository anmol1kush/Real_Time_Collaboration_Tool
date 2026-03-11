import { prisma } from "../utils/prisma.js";

/* -------- GET DOCUMENT VERSIONS -------- */
export async function getDocumentVersions(req, res) {
    try {
        const { projectId } = req.params;

        const doc = await prisma.document.findFirst({ where: { projectId } });
        if (!doc) return res.json([]);

        const versions = await prisma.documentVersion.findMany({
            where: { documentId: doc.id },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
                document: { select: { projectId: true } }
            }
        });

        // Fetch saver names
        const userIds = [...new Set(versions.map(v => v.savedBy))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true }
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

        res.json(versions.map(v => ({
            id: v.id,
            content: v.content,
            savedBy: userMap[v.savedBy] || "Unknown",
            createdAt: v.createdAt
        })));
    } catch (err) {
        console.error("[getDocumentVersions]", err);
        res.status(500).json({ message: "Failed to fetch versions", error: err.message });
    }
}

/* -------- RESTORE A VERSION -------- */
export async function restoreDocumentVersion(req, res) {
    try {
        const { projectId, versionId } = req.params;

        const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
        if (!version) return res.status(404).json({ message: "Version not found" });

        const doc = await prisma.document.findFirst({ where: { projectId } });
        if (!doc) return res.status(404).json({ message: "Document not found" });

        await prisma.document.update({
            where: { id: doc.id },
            data: { content: version.content }
        });

        res.json({ message: "Version restored", content: version.content });
    } catch (err) {
        console.error("[restoreDocumentVersion]", err);
        res.status(500).json({ message: "Failed to restore version", error: err.message });
    }
}
