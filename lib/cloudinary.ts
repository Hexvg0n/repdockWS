import { v2 as cloudinary } from "cloudinary";

let configured = false;

export function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

export async function uploadW2CImage(filePath: string, productName?: string) {
  const client = getCloudinaryClient();

  if (!client) {
    throw new Error("Cloudinary is not configured");
  }

  return client.uploader.upload(filePath, {
    folder: "repdock/w2c",
    public_id: productName ? `${sanitizePublicId(productName)}-${Date.now()}` : undefined,
    resource_type: "image",
    unique_filename: true,
    overwrite: false,
  });
}

function sanitizePublicId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
