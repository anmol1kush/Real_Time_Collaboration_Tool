import { redis } from "./redis.js";

export async function getCache(key) {
  if (!redis.isOpen) return null;

  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(key, value, expiresInSeconds = 3600) {
  if (!redis.isOpen) return;

  await redis.setEx(key, expiresInSeconds, JSON.stringify(value));
}

export async function clearCacheByPrefix(prefix) {
  if (!redis.isOpen) return;

  const keys = [];
  for await (const key of redis.scanIterator({ MATCH: `${prefix}*` })) {
    keys.push(key);
  }

  if (keys.length) {
    await redis.del(keys);
  }
}