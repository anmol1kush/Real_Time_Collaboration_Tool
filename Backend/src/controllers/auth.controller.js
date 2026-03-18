import bcrypt from "bcrypt";
import { prisma } from "../utils/prisma.js";
import { generateToken } from "../utils/jwt.js";
import { getOnlineUsers } from "../utils/redisUser.js";
/* -------- REGISTER -------- */
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        image: null,
        password: hashedPassword
      }
    });

    const token = generateToken({ userId: user.id });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("[register] Error:", err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
}

/* -------- LOGIN -------- */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({ userId: user.id });

    res.json({ token, user });
  } catch (err) {
    console.error("[login] Error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

/* -------- CURRENT USER -------- */
export async function getMe(req, res) {
  res.json(req.user);
}

export async function fetchOnlineUsers(req, res) {
    try {
        const onlineUserIds = await getOnlineUsers();
        res.json({ onlineUsers: onlineUserIds });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch online presence" });
    }
}