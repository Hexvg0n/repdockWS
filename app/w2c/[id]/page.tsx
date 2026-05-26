import { notFound } from "next/navigation";

import { NavbarDemo } from "@/components/NavbarDemo";
import { W2CProductDetail } from "@/components/W2CProductDetail";
import { getBBDBuyProductDetails } from "@/lib/bbdbuy-product";
import { getMongoClient } from "@/lib/mongodb";
import { buildW2CProductFilter, normalizeW2CProduct } from "@/lib/w2c-products";
import type { W2CProduct } from "@/types/w2c";

export default async function W2CProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mongoClient = getMongoClient();

  if (!mongoClient) {
    notFound();
  }

  const client = await mongoClient;
  const db = client.db(process.env.MONGODB_DB ?? "repdock");
  const product = await db.collection<W2CProduct>("w2c_products").findOne(buildW2CProductFilter(id));

  if (!product) {
    notFound();
  }

  const normalizedProduct = normalizeW2CProduct(product);
  const bbdbuyDetails = await getBBDBuyProductDetails(normalizedProduct);

  return (
    <>
      <NavbarDemo />
      <W2CProductDetail bbdbuyDetails={bbdbuyDetails} product={normalizedProduct} />
    </>
  );
}
