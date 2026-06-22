import mongoose from "mongoose";
import { MongoClient } from "mongodb";

let mongoClient;

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it to server/.env before starting the server.");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || "arthub"
  });

  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
  }

  return {
    mongoose,
    authDb: mongoClient.db(process.env.MONGO_DB_NAME || "arthub")
  };
}

export function getMongoClient() {
  if (!mongoClient) {
    throw new Error("Mongo client is not connected yet.");
  }

  return mongoClient;
}
