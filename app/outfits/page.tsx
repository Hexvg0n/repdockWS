import { NavbarDemo } from "@/components/NavbarDemo";
import { OutfitsGallery } from "@/components/OutfitsGallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Outfits",
  description: "Explore community outfit posts and shop the W2C items attached to each look.",
};

export default function OutfitsPage() {
  return (
    <>
      <NavbarDemo />
      <OutfitsGallery />
    </>
  );
}
