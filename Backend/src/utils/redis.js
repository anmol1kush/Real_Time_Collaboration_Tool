import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL
});

export async function initRedis() {
  if (!redis.isOpen) {
    await redis.connect();
    console.log(" Redis (Docker) connected");
  }
}



