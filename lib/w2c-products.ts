import { ObjectId, type Filter } from "mongodb";

import { convertLink } from "@/lib/converter";
import type { W2CProduct } from "@/types/w2c";

type MongoBackedProduct = W2CProduct & {
  _id?: ObjectId;
};

const agentLinkKeys = {
  ACBUY: "acbuy",
  BBDBUY: "bbdbuy",
  BOONBUY: "boonbuy",
  KAKOBUY: "kakobuy",
  USFANS: "usfans",
} as const;

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
    links: normalizeW2CProductLinks(plainProduct.links),
    metadata: {
      ...plainProduct.metadata,
      clicks: { ...plainProduct.metadata.clicks },
      purchases: plainProduct.metadata.purchases ?? 0,
    },
  };
}

function normalizeW2CProductLinks(links: W2CProduct["links"]): W2CProduct["links"] {
  const conversion = convertLink(links.original);
  const convertedByKey = new Map(conversion.convertedLinks.map((link) => [link.key, link.url]));
  const normalizedLinks = { ...links };

  for (const [agent, converterKey] of Object.entries(agentLinkKeys) as Array<
    [keyof typeof agentLinkKeys, (typeof agentLinkKeys)[keyof typeof agentLinkKeys]]
  >) {
    const currentLink = normalizedLinks[agent];
    const convertedLink = convertedByKey.get(converterKey);

    if (!currentLink || currentLink === links.original) {
      normalizedLinks[agent] = convertedLink;
    }
  }

  return normalizedLinks;
}
