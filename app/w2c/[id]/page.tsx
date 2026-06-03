import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NavbarDemo } from "@/components/NavbarDemo";
import { W2CProductDetail } from "@/components/W2CProductDetail";
import { getBBDBuyProductDetails } from "@/lib/bbdbuy-product";
import { getMongoClient } from "@/lib/mongodb";
import { buildW2CProductFilter, normalizeW2CProduct } from "@/lib/w2c-products";
import type { W2CProduct } from "@/types/w2c";

type W2CProductPageProps = {
  params: Promise<{ id: string }>;
};

async function loadW2CProduct(id: string) {
  const mongoClient = getMongoClient();

  if (!mongoClient) {
    return null;
  }

  const client = await mongoClient;
  const db = client.db(process.env.MONGODB_DB ?? "repdock");
  return db.collection<W2CProduct>("w2c_products").findOne(buildW2CProductFilter(id));
}

export async function generateMetadata({ params }: W2CProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await loadW2CProduct(id);

  if (!product) {
    return {
      title: "W2C Product",
      description: "View product details, QC photos and agent links on RepDock.",
    };
  }

  const normalizedProduct = normalizeW2CProduct(product);
  const description = `${normalizedProduct.metadata.brand || "W2C"} item with QC shortcuts, product details and agent links on RepDock.`;

  return {
    title: normalizedProduct.name,
    description,
    openGraph: {
      title: normalizedProduct.name,
      description,
      images: [{ url: normalizedProduct.image, alt: normalizedProduct.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: normalizedProduct.name,
      description,
      images: [normalizedProduct.image],
    },
  };
}

export default async function W2CProductPage({
  params,
}: W2CProductPageProps) {
  const { id } = await params;
  const product = await loadW2CProduct(id);

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
