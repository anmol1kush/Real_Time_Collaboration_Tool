// src/sockets/presence.js
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

/* -------- CHECK IF ONE USER IS ONLINE -------- */
export async function isUserOnline(userId) {
  if (!redisAvailable()) return false;
  return await redis.exists(`online:user:${userId}`);
}

/* -------- GET ALL ONLINE USERS -------- */
export async function getOnlineUsers() {
  if (!redisAvailable()) return [];
  
  // Find all keys that match our pattern
  const keys = await redis.keys("online:user:*");
  
  // Extract just the userIds from the keys (e.g., "online:user:123" -> "123")
  const onlineUserIds = keys.map(key => key.split(":")[2]);
  
  return onlineUserIds;
}
