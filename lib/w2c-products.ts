import { ObjectId, type Filter } from "mongodb";

import type { W2CProduct } from "@/types/w2c";

type MongoBackedProduct = W2CProduct & {
  _id?: ObjectId;
};

export function buildW2CProductFilter(id: string): Filter<W2CProduct> {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ id }, { _id: new ObjectId(id) }],
    } as Filter<W2CProduct>;
  }

  return { id };
}

export function normalizeW2CProduct(product: MongoBackedProduct): W2CProduct {
  const { _id, ...plainProduct } = product;

  return {
    ...plainProduct,
    id: String(product.id ?? _id),
    links: { ...plainProduct.links },
    metadata: {
      ...plainProduct.metadata,
      clicks: { ...plainProduct.metadata.clicks },
      purchases: plainProduct.metadata.purchases ?? 0,
    },
  };
}
