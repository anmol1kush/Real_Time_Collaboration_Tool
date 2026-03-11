import { redis } from "../utils/redis.js";

const redisAvailable = () => redis?.isOpen;

/* -------- ONLINE -------- */
export async function setUserOnline(userId, socketId) {
  if (!redisAvailable()) return;
  await redis.set(`online:user:${userId}`, socketId);
}

/* -------- OFFLINE -------- */
export async function setUserOffline(userId) {
  if (!redisAvailable()) return;
  await redis.del(`online:user:${userId}`);
}

/* -------- CHECK -------- */
export async function isUserOnline(userId) {
  if (!redisAvailable()) return false;
  return await redis.exists(`online:user:${userId}`);
}