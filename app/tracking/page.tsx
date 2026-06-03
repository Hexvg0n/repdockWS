import { NavbarDemo } from "@/components/NavbarDemo";
import { TrackingTool } from "@/components/TrackingTool";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parcel Tracking",
  description: "Track parcels and translate shipping updates inside RepDock.",
};

export default function TrackingPage() {
  return (
    <>
      <NavbarDemo />
      <TrackingTool />
    </>
  );
}
