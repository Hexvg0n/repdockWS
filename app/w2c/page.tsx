import { NavbarDemo } from "@/components/NavbarDemo";
import { W2CCatalog } from "@/components/W2CCatalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "W2C Finds",
  description: "Browse curated W2C products with agent links, prices, QC shortcuts and product details.",
};

export default function W2CPage() {
  return (
    <>
      <NavbarDemo />
      <W2CCatalog />
    </>
  );
}
