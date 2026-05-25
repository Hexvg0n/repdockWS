export type W2CGender = "men" | "women";

export type W2CCategory = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  createdBy: string;
};

export type W2CProduct = {
  id: string;
  name: string;
  image: string;
  priceCny: number;
  rating: number;
  links: {
    original: string;
    BBDBUY?: string;
    KAKOBUY?: string;
    USFANS?: string;
    ACBUY?: string;
  };
  metadata: {
    addedBy: string;
    clicks: {
      today: number;
      week: number;
      allTime: number;
    };
    purchases: number;
    addedAt: string;
    category: string;
    weight: number;
    gender: W2CGender;
    season: string;
    brand: string;
    sourcePlatform?: string;
    sourceProductId?: string;
  };
};

export type W2CProductsResponse = {
  products: W2CProduct[];
  nextCursor: number | null;
  total: number;
  categories: string[];
  brands: string[];
  seasons: string[];
};
