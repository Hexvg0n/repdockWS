import type { Db } from "mongodb";

let indexesPromise: Promise<void> | null = null;

export function ensureW2CIndexes(db: Db) {
  if (indexesPromise) {
    return indexesPromise;
  }

  indexesPromise = Promise.all([
    db.collection("w2c_products").createIndex({ "metadata.gender": 1, "metadata.category": 1 }),
    db.collection("w2c_products").createIndex({ "metadata.gender": 1, "metadata.clicks.week": -1 }),
    db.collection("w2c_products").createIndex({ name: "text", "metadata.brand": "text", "metadata.category": "text" }),
    db.collection("w2c_categories").createIndex({ slug: 1 }, { unique: true }),
    db.collection("w2c_categories").createIndex({ name: 1 }),
    db
      .collection("w2c_interactions")
      .createIndex({ productId: 1, anonymousId: 1, type: 1 }, { unique: true }),
    db.collection("w2c_interactions").createIndex({ productId: 1, type: 1 }),
  ])
    .then(() => undefined)
    .catch((error) => {
      indexesPromise = null;
      throw error;
    });

  return indexesPromise;
}
