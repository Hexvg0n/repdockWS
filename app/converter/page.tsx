import { ConverterTool } from "@/components/ConverterTool";
import { NavbarDemo } from "@/components/NavbarDemo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Link Converter",
  description: "Convert shopping links into supported agent links for RepDock workflows.",
};

export default function ConverterPage() {
  return (
    <>
      <NavbarDemo />
      <ConverterTool />
    </>
  );
}
