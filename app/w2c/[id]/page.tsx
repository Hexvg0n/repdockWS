import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconLoader2 } from "@tabler/icons-react";

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

  return (
    <>
      <NavbarDemo />
      <Suspense fallback={<W2CProductDetailFallback productName={normalizedProduct.name} />}>
        <W2CProductDetailContent product={normalizedProduct} />
      </Suspense>
    </>
  );
}

async function W2CProductDetailContent({ product }: { product: W2CProduct }) {
  const bbdbuyDetails = await getBBDBuyProductDetails(product);

  return <W2CProductDetail bbdbuyDetails={bbdbuyDetails} product={product} />;
}

function W2CProductDetailFallback({ productName }: { productName: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.025)_1px,transparent_1px)] bg-[size:120px_120px] opacity-25 [mask-image:linear-gradient(to_bottom,transparent,black_20%,transparent_65%)]" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-7">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100 shadow-2xl shadow-blue-950/20">
          <IconLoader2 className="size-4 animate-spin" />
          Ladowanie produktu
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
          <div className="grid gap-4">
            <div className="relative aspect-[1.08/1] overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black/30">
              <div className="absolute inset-6 animate-pulse rounded-[24px] bg-white/[0.055]" />
              <div className="absolute inset-x-8 bottom-8 h-3 rounded-full bg-white/[0.08]" />
            </div>
            <div className="flex gap-3 overflow-hidden">
              <div className="size-20 shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
              <div className="size-20 shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
              <div className="size-20 shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
            </div>
          </div>

          <aside className="grid gap-5 rounded-[32px] border border-white/10 bg-[#080910]/92 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl md:p-6">
            <div className="grid gap-3">
              <div className="h-4 w-32 animate-pulse rounded-full bg-blue-400/20" />
              <h1 className="line-clamp-2 font-poppins text-3xl font-medium leading-tight text-white">
                {productName}
              </h1>
              <div className="h-4 w-full animate-pulse rounded-full bg-white/[0.045]" />
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/[0.045]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]" />
              <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]" />
            </div>

            <div className="grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-4">
              <div className="h-5 w-28 animate-pulse rounded-full bg-white/[0.08]" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 animate-pulse rounded-2xl border border-white/10 bg-black/25" />
                <div className="h-12 animate-pulse rounded-2xl border border-white/10 bg-black/25" />
                <div className="h-12 animate-pulse rounded-2xl border border-white/10 bg-black/25" />
                <div className="h-12 animate-pulse rounded-2xl border border-white/10 bg-black/25" />
              </div>
            </div>

            <div className="h-12 animate-pulse rounded-2xl bg-white" />
          </aside>
        </div>
      </section>
    </main>
  );
}
