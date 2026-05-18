export type OutfitStatus = "approved" | "pending" | "rejected";

export type OutfitItem = {
  id: string;
  image: string;
  link: string;
  priceCny: number;
  title: string;
};

export type Outfit = {
  id: string;
  title: string;
  description: string;
  image: string;
  createdAt: string;
  createdBy: string;
  createdByAvatarUrl: string;
  status: OutfitStatus;
  items: OutfitItem[];
  stats: {
    likes: number;
    views: number;
  };
};

export type OutfitsResponse = {
  outfits: Outfit[];
  nextCursor: number | null;
  total: number;
};
