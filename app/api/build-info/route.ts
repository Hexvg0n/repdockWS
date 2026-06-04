import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const featureMarkers = {
  adminSidebar: "fixed-sidebar-logo-box-v2",
  productRouteLoading: "catalog-overlay-plus-product-suspense-v2",
  w2cDefaultSort: "newest",
  w2cGenderNeutral: true,
};

export function GET() {
  const body = {
    app: "repdock",
    branch: readGit(["rev-parse", "--abbrev-ref", "HEAD"]),
    buildId: readBuildId(),
    commit: readGit(["rev-parse", "--short", "HEAD"]),
    featureMarkers,
    nodeEnv: process.env.NODE_ENV ?? null,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-RepDock-Commit": body.commit ?? "unknown",
      "X-RepDock-W2C-Sort": featureMarkers.w2cDefaultSort,
    },
  });
}

function readGit(args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function readBuildId() {
  try {
    return readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return null;
  }
}
