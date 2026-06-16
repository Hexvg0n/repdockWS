import { CalculatorTool } from "@/components/CalculatorTool";
import { NavbarDemo } from "@/components/NavbarDemo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Calculator",
  description: "Compare RepDock agent shipping lines, billable weight, route fees and delivery time.",
};

export default function CalculatorPage() {
  return (
    <>
      <NavbarDemo />
      <CalculatorTool />
    </>
  );
}
