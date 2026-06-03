import { NavbarDemo } from "@/components/NavbarDemo";
import { QCTool } from "@/components/QCTool";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QC Photos",
  description: "Search and inspect QC photos for W2C items before buying through an agent.",
};

export default function QCPage() {
  return (
    <>
      <NavbarDemo />
      <QCTool />
    </>
  );
}
