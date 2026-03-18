
import { prisma } from "../utils/prisma.js";
import { getCache, setCache, clearCacheByPrefix } from "../utils/redisProject.js";
/* -------- CREATE PROJECT -------- */
export async function createProject(req, res) {
  try {
    const { name, githubRepo = "", image = null } = req.body;
    const userId = req.user.id;

    if (!name) return res.status(400).json({ message: "Project name is required" });

    const project = await prisma.project.create({
      data: {
        name,
        githubRepo,
        image,
        adminId: userId,
        memberships: {
          create: { userId, role: "ADMIN" }
        }
      },
      include: { admin: { select: { id: true, name: true, email: true } } }
    });
    await clearCacheByPrefix(`user:${userId}:projects`);  
    res.status(201).json(project);
  } catch (err) {
    console.error("[createProject]", err);
    res.status(500).json({ message: "Failed to create project", error: err.message });
  }
}

/* -------- GET ALL USER PROJECTS -------- */
export async function getMyProjects(req, res) {
  try {
    const userId = req.user.id;
    const cacheKey = `user:${userId}:projects`;

    // 1️⃣ Check Redis cache
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log("Serving from Redis");
      
      return res.json(cached);
    }

    // 2️⃣ Query database
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            admin: { select: { id: true, name: true, email: true } },
            _count: { select: { memberships: true, tasks: true } }
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    });

    const projects = memberships.map(m => ({
      ...m.project,
      role: m.role
    }));

    // 3️⃣ Save to Redis
    await setCache(cacheKey, projects, 3600);

    res.json(projects);

  } catch (err) {
    console.error("[getMyProjects]", err);
    res.status(500).json({ message: "Failed to fetch projects", error: err.message });
  }
}

/* -------- GET SINGLE PROJECT -------- */
export async function getProjectById(req, res) {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });

    if (!membership) return res.status(403).json({ message: "Not a member of this project" });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        _count: { select: { tasks: true } }
      }
    });

    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json({ ...project, role: membership.role });
  } catch (err) {
    console.error("[getProjectById]", err);
    res.status(500).json({ message: "Failed to fetch project", error: err.message });
  }
}

/* -------- UPDATE PROJECT -------- */
export async function updateProject(req, res) {
  try {
    const { projectId } = req.params;
    const { name, image, githubRepo } = req.body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name, image, githubRepo }
    });
    await clearCacheByPrefix("user:");

    res.json(project);
  } catch (err) {
    console.error("[updateProject]", err);
    res.status(500).json({ message: "Failed to update project", error: err.message });
  }
}

/* -------- DELETE PROJECT -------- */
export async function deleteProject(req, res) {
  try {
    const { projectId } = req.params;

    // Delete dependents first to respect foreign key constraints
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.document.deleteMany({ where: { projectId } });
    await prisma.invite.deleteMany({ where: { projectId } });
    await prisma.membership.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await clearCacheByPrefix("user:");
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("[deleteProject]", err);
    res.status(500).json({ message: "Failed to delete project", error: err.message });
  }
}