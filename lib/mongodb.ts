import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri && process.env.NODE_ENV === "production") {
  console.warn("MONGODB_URI is not configured. Database-backed features will be empty.");
}

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient() {
  if (!uri) {
    return null;
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    clientPromise = client.connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  return clientPromise;
}

export function getMongoUnavailableMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
    return "MongoDB is unavailable. Start local MongoDB or set MONGODB_URI to a running MongoDB Atlas cluster.";
  }

  return error instanceof Error ? error.message : "MongoDB request failed.";
}
