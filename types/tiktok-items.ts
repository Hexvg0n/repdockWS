import type { W2CGender, W2CProduct } from "@/types/w2c";

export type TikTokItemStatus = "approved" | "pending" | "rejected";

export type TikTokAttachedProduct = {
  productId: string;
  name: string;
  image: string;
  priceCny: number;
  links: W2CProduct["links"];
  metadata: {
    brand: string;
    category: string;
    gender: W2CGender;
    season: string;
  };
};

export type TikTokItemPost = {
  id: string;
  title: string;
  description: string;
  tiktokUrl: string;
  coverImage: string;
  createdAt: string;
  createdBy: string;
  createdByAvatarUrl: string;
  status: TikTokItemStatus;
  products: TikTokAttachedProduct[];
  stats: {
    views: number;
  };
};

export type TikTokItemsResponse = {
  items: TikTokItemPost[];
  nextCursor: number | null;
  total: number;
};

export type TikTokProductSearchResponse = {
  products: W2CProduct[];
};
