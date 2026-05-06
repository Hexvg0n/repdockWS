import { NextResponse } from "next/server";

import { getCurrencyRates } from "@/lib/currency-rates";

export const dynamic = "force-dynamic";

export async function GET() {
  const rates = await getCurrencyRates();

  return NextResponse.json(rates, {
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}
