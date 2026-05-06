import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type ProcessedImage = {
  cleanup: () => Promise<void>;
  inputPath: string;
  outputPath: string;
};

export async function removeImageBackground(imageUrl: string): Promise<ProcessedImage> {
  const url = parseImageUrl(imageUrl);
  const buffer = await downloadImage(url);

  return removeImageBackgroundFromBuffer(buffer, getExtension(url));
}

export async function removeImageBackgroundFromBuffer(
  buffer: Buffer,
  extension = ".png",
): Promise<ProcessedImage> {
  const temporaryRoot = process.env.REPDOCK_TMP_DIR || (process.platform === "win32" ? "C:\\tmp" : "/tmp");

  await mkdir(temporaryRoot, { recursive: true });

  const directory = await mkdtemp(`${temporaryRoot}${path.sep}repdock-w2c-`);
  const inputPath = path.join(directory, `input${normalizeExtension(extension)}`);
  const outputPath = path.join(directory, "output.png");

  await writeFile(inputPath, buffer);
  await runRembg(inputPath, outputPath);

  return {
    cleanup: () => rm(directory, { force: true, recursive: true }),
    inputPath,
    outputPath,
  };
}

function parseImageUrl(imageUrl: string) {
  let url: URL;

  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("Invalid image URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Image URL must start with http or https");
  }

  return url;
}

async function downloadImage(url: URL) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    throw new Error("URL does not point to an image");
  }

  return Buffer.from(await response.arrayBuffer());
}

function getExtension(url: URL) {
  const extension = path.extname(url.pathname).toLowerCase();
  return normalizeExtension(extension);
}

export function getImageExtensionFromName(fileName: string) {
  return normalizeExtension(path.extname(fileName).toLowerCase());
}

function normalizeExtension(extension: string) {
  const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

  if (allowedExtensions.has(extension)) {
    return extension;
  }

  return ".png";
}

function runRembg(inputPath: string, outputPath: string) {
  const command = process.env.REMBG_COMMAND || "rembg";

  return new Promise<void>((resolve, reject) => {
    const processId = randomUUID();
    const child = spawn(command, ["i", inputPath, outputPath], {
      shell: process.platform === "win32",
      stdio: ["ignore", "ignore", "pipe"],
    });
    const stderr: string[] = [];

    child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
    child.on("error", () => {
      reject(new Error(`rembg command failed to start (${processId}). Install rembg or set REMBG_COMMAND.`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.join("").trim() || `rembg exited with code ${code}`));
    });
  });
}
