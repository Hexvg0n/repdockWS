import type { Db } from "mongodb";

let indexesPromise: Promise<void> | null = null;

export function ensureW2CIndexes(db: Db) {
  if (indexesPromise) {
    return indexesPromise;
  }

  indexesPromise = Promise.all([
    db.collection("w2c_products").createIndex({ "metadata.gender": 1, "metadata.category": 1 }),
    db.collection("w2c_products").createIndex({
      "metadata.gender": 1,
      "metadata.clicks.week": -1,
      "metadata.purchases": -1,
      "metadata.clicks.allTime": -1,
      rating: -1,
      "metadata.addedAt": -1,
      _id: -1,
    }),
    db.collection("w2c_products").createIndex({ "metadata.gender": 1, "metadata.addedAt": -1, _id: -1 }),
    db.collection("w2c_products").createIndex({ "metadata.gender": 1, priceCny: 1, "metadata.addedAt": -1, _id: -1 }),
    db.collection("w2c_products").createIndex({ "metadata.gender": 1, priceCny: -1, "metadata.addedAt": -1, _id: -1 }),
    db.collection("w2c_products").createIndex({
      "metadata.gender": 1,
      rating: -1,
      "metadata.clicks.allTime": -1,
      "metadata.addedAt": -1,
      _id: -1,
    }),
    db.collection("w2c_products").createIndex({ name: "text", "metadata.brand": "text", "metadata.category": "text" }),
    db.collection("w2c_categories").createIndex({ slug: 1 }, { unique: true }),
    db.collection("w2c_categories").createIndex({ name: 1 }),
    db
      .collection("w2c_interactions")
      .createIndex({ productId: 1, anonymousId: 1, type: 1 }, { unique: true }),
    db.collection("w2c_interactions").createIndex({ productId: 1, type: 1 }),
    db.collection("w2c_favorites").createIndex({ userId: 1, productId: 1 }, { unique: true }),
    db.collection("w2c_favorites").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("outfits").createIndex({ status: 1, createdAt: -1 }),
    db.collection("outfits").createIndex({ title: "text", description: "text", createdBy: "text" }),
    db.collection("outfit_views").createIndex({ outfitId: 1, anonymousId: 1 }, { unique: true }),
    db.collection("outfit_views").createIndex({ outfitId: 1 }),
    db.collection("tiktok_items").createIndex({ status: 1, createdAt: -1 }),
    db.collection("tiktok_items").createIndex({
      title: "text",
      description: "text",
      createdBy: "text",
      "products.name": "text",
      "products.metadata.brand": "text",
      "products.metadata.category": "text",
    }),
    db.collection("tiktok_item_views").createIndex({ itemId: 1, anonymousId: 1 }, { unique: true }),
    db.collection("tiktok_item_views").createIndex({ itemId: 1 }),
  ])
    .then(() => undefined)
    .catch((error) => {
      indexesPromise = null;
      throw error;
    });

  return indexesPromise;
}
