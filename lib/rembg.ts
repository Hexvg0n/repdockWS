import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

export type ProcessedImage = {
  cleanup: () => Promise<void>;
  inputPath: string;
  outputPath: string;
};

const maxDownloadedImageSize = 12 * 1024 * 1024;
const imageDownloadTimeoutMs = 10_000;

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
  await assertPublicHostname(url.hostname);

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(imageDownloadTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    throw new Error("URL does not point to an image");
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > maxDownloadedImageSize) {
    throw new Error("Image is too large. Max size is 12MB.");
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength > maxDownloadedImageSize) {
      throw new Error("Image is too large. Max size is 12MB.");
    }

    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxDownloadedImageSize) {
      throw new Error("Image is too large. Max size is 12MB.");
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, totalBytes);
}

async function assertPublicHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.endsWith(".local")
  ) {
    throw new Error("Image URL host is not allowed");
  }

  const directIpVersion = net.isIP(normalizedHostname);
  const addresses =
    directIpVersion > 0
      ? [{ address: normalizedHostname }]
      : await lookup(normalizedHostname, { all: true, verbatim: true });

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Image URL host is not allowed");
  }
}

function isPrivateAddress(address: string) {
  if (address.startsWith("::ffff:")) {
    return isPrivateAddress(address.slice(7));
  }

  if (address === "::1" || address.toLowerCase().startsWith("fe80:")) {
    return true;
  }

  if (/^f[cd][0-9a-f]{2}:/i.test(address)) {
    return true;
  }

  if (net.isIP(address) !== 4) {
    return false;
  }

  const [first = 0, second = 0] = address.split(".").map(Number);

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
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
