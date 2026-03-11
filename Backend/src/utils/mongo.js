import mongoose from "mongoose";

export async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in .env");

  await mongoose.connect(uri);
  console.log("✅ MongoDB (Mongoose) connected");
}

export function getMongoDb() {
  return mongoose.connection.db;
}