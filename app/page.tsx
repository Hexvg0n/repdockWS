import { HeroSection } from "../components/HeroSection";
import { NavbarDemo } from "../components/NavbarDemo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RepDock",
  description: "Discover W2C finds, outfits, QC photos, parcel tracking and agent tools in one clean RepDock workflow.",
};

export default function HomePage() {
  return (
    <>
      <NavbarDemo />
      <HeroSection />
    </>
  );
}
