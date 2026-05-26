import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";
import { mutateJsonFile, readJsonFile } from "@/lib/json-file-store";

export const runtime = "nodejs";

const templatesPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "panel_templates.json");
const validKinds = new Set(["embed", "components-v2"]);

type TemplateStore = Record<string, Record<string, unknown>>;

async function requireAdmin() {
  const session = await getAdminSession();
  return session ? null : new NextResponse("Unauthorized", { status: 401 });
}

async function readTemplates(): Promise<TemplateStore> {
  return readJsonFile<TemplateStore>(templatesPath, {});
}

function getKind(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") || "";
  return validKinds.has(kind) ? kind : null;
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const kind = getKind(request);
  if (!kind) {
    return NextResponse.json({ error: "Invalid template kind" }, { status: 400 });
  }

  const store = await readTemplates();
  return NextResponse.json({ templates: store[kind] || {} });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const kind = getKind(request);
  if (!kind) {
    return NextResponse.json({ error: "Invalid template kind" }, { status: 400 });
  }

  const { name, payload } = (await request.json()) as { name?: unknown; payload?: unknown };

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }

  await mutateJsonFile<TemplateStore, void>(templatesPath, {}, (store) => {
    const next = { ...store, [kind]: { ...(store[kind] ?? {}) } };
    next[kind][name] = {
      payload,
      updatedAt: new Date().toISOString(),
    };

    return { next, result: undefined };
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const kind = getKind(request);
  if (!kind) {
    return NextResponse.json({ error: "Invalid template kind" }, { status: 400 });
  }

  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }

  await mutateJsonFile<TemplateStore, void>(templatesPath, {}, (store) => {
    const next = { ...store, [kind]: { ...(store[kind] ?? {}) } };
    delete next[kind][name];

    return { next, result: undefined };
  });

  return NextResponse.json({ success: true });
}
