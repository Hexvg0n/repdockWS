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

export type W2CBBDBuySku = {
  id: string;
  propIdValueId: string;
  propNameValueName: string;
  image: string | null;
  stock: number;
  valueIdList: string[];
  priceCny: number | null;
};

export type W2CBBDBuySkuPropValue = {
  valueId: string;
  valueName: string;
  valueNameTrans: string;
};

export type W2CBBDBuySkuProp = {
  propId: string;
  propName: string;
  propNameTrans: string;
  propValueList: W2CBBDBuySkuPropValue[];
};

export type W2CBBDBuyProductDetails = {
  title: string;
  titleTrans: string;
  source: string;
  sourceProductId: string;
  productUrl: string;
  priceCny: number | null;
  postFee: string | null;
  daysToArrival: number | null;
  minNum: number | null;
  sales: number | null;
  totalStock: number;
  seller: {
    shopId: string;
    shopName: string;
    shopUrl: string;
  } | null;
  skuList: W2CBBDBuySku[];
  skuPropList: W2CBBDBuySkuProp[];
  imgList: string[];
  detailImages: string[];
  fetchedAt: string;
};
