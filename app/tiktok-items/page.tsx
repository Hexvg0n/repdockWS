import { NavbarDemo } from "@/components/NavbarDemo";
import { TikTokItemsGallery } from "@/components/TikTokItemsGallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TikTok Items",
  description: "Find W2C products attached to RepDock TikTok videos.",
};

export default function TikTokItemsPage() {
  return (
    <>
      <NavbarDemo />
      <TikTokItemsGallery />
    </>
  );
}
