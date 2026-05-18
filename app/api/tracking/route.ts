import axios from "axios";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import validator from "validator";

import type { TrackingData, TrackingEvent } from "@/types/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKING_URLS = [
  "http://106.55.5.75:8082/en/trackIndex.htm",
  "http://114.132.51.252:8082/en/trackIndex.htm",
  "http://47.112.107.11:8082/en/trackIndex.htm",
  "http://39.101.71.24:8082/en/trackIndex.htm",
  "http://120.78.2.65:8082/en/trackIndex.htm",
  "http://www.hsd-ex.com:8082/trackIndex.htm",
  "http://www.gdasgyl.com:8082/en/trackIndex.htm",
  "http://120.24.176.176:8082/en/trackIndex.htm",
  "http://111.230.211.49:8082/trackIndex.htm",
  "http://111.230.15.119:8082/trackIndex.htm",
  "http://120.77.221.225:8082/trackIndex.htm",
  "http://49.234.188.236:8082/trackIndex.htm",
  "http://115.29.184.71:8082/trackIndex.htm",
] as const;

const LABEL_NORMALIZATION: Record<string, keyof Omit<TrackingData, "details" | "source">> = {
  "the last record": "lastStatus",
  "numer śledzenia": "trackingNumber",
  "numer referencyjny": "referenceNo",
  "ostatni status": "lastStatus",
  consigneename: "consigneeName",
  country: "country",
  data: "date",
  date: "date",
  kraj: "country",
  "reference no.": "referenceNo",
  "tracking number": "trackingNumber",
  trackingnumber: "trackingNumber",
};

const MAX_TRACKING_LENGTH = 64;
const REQUEST_TIMEOUT_MS = 5_000;

function normalizeLabel(label: string) {
  const normalized = label
    .toLowerCase()
    .replace(/[:：]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return LABEL_NORMALIZATION[normalized] ?? null;
}

async function translateStatus(
  status: string,
  targetLang: "PL" | "EN",
  translationCache: Map<string, string>,
) {
  const apiKey = process.env.DEEPL_API_KEY;
  const normalizedStatus = status.trim();

  if (!apiKey || !normalizedStatus || targetLang === "EN") {
    return normalizedStatus;
  }

  const cacheKey = `${targetLang}:${normalizedStatus}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.post<{ translations: Array<{ text: string }> }>(
      "https://api-free.deepl.com/v2/translate",
      { target_lang: targetLang, text: [normalizedStatus] },
      {
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
    const translated = response.data.translations[0]?.text ?? normalizedStatus;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("DeepL translation error:", error.response?.data || error.message);
    }
    return normalizedStatus;
  }
}

async function checkTrackingUrl(
  url: string,
  trackingNumber: string,
  targetLang: "PL" | "EN",
  translationCache: Map<string, string>,
): Promise<TrackingData | null> {
  try {
    const response = await axios.post<string>(
      url,
      new URLSearchParams({ documentCode: trackingNumber }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: REQUEST_TIMEOUT_MS,
      },
    );

    const $ = cheerio.load(response.data);
    const mainInfo: Partial<Record<keyof Omit<TrackingData, "details" | "source">, string>> = {};
    const labels = $("div.menu_ > ul").first().find("li");
    const values = $("div.menu_ > ul").eq(1).find("li");

    labels.each((index, element) => {
      const key = normalizeLabel($(element).text().trim());
      if (!key) return;

      mainInfo[key] = values.eq(index).text().trim();
    });

    if (!mainInfo.trackingNumber) {
      return null;
    }

    const details: TrackingEvent[] = [];
    $("table tr").each((_, row) => {
      const cells = $(row).find("td");

      if (cells.length !== 3) return;

      const date = cells.eq(0).text().trim();
      const location = cells.eq(1).text().trim();
      const status = cells.eq(2).text().trim();

      if (!date && !location && !status) return;

      details.push({
        date,
        icon: "",
        location,
        status,
      });
    });

    const translatedDetails = await Promise.all(
      details.map(async (event) => ({
        ...event,
        status: await translateStatus(event.status, targetLang, translationCache),
      })),
    );

    return {
      consigneeName: mainInfo.consigneeName || "N/A",
      country: mainInfo.country || "N/A",
      date: mainInfo.date || "N/A",
      details: translatedDetails,
      lastStatus: await translateStatus(mainInfo.lastStatus || "N/A", targetLang, translationCache),
      referenceNo: mainInfo.referenceNo || "N/A",
      source: url,
      trackingNumber: mainInfo.trackingNumber,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { language?: unknown; trackingNumber?: unknown };
    const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";

    if (
      !trackingNumber ||
      trackingNumber.length > MAX_TRACKING_LENGTH ||
      !validator.isAlphanumeric(trackingNumber.replace(/\s/g, ""))
    ) {
      return NextResponse.json({ error: "Invalid tracking number." }, { status: 400 });
    }

    const targetLang: "PL" | "EN" = body.language === "en" || body.language === "EN" ? "EN" : "PL";
    const translationCache = new Map<string, string>();
    const lookups = TRACKING_URLS.map((url) =>
      checkTrackingUrl(url, trackingNumber, targetLang, translationCache),
    );

    const results = await Promise.all(lookups);
    const validResult = results.find((result): result is TrackingData => result !== null);

    if (!validResult) {
      return NextResponse.json(
        { error: "No tracking data found. Check if the number is correct." },
        { status: 404 },
      );
    }

    return NextResponse.json(validResult);
  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json({ error: "Internal tracking server error." }, { status: 500 });
  }
}
