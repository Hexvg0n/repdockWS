import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import {
  getImageExtensionFromName,
  maxProcessableImageSize,
  removeImageBackground,
  removeImageBackgroundFromBuffer,
} from "@/lib/rembg";
import { uploadW2CImage } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let processedImage: Awaited<ReturnType<typeof removeImageBackground>> | null = null;

  try {
    const source = await readImageSource(request);

    processedImage = source.file
      ? await removeImageBackgroundFromBuffer(source.file.buffer, source.file.extension)
      : await removeImageBackground(source.imageUrl);

    const upload = await uploadW2CImage(processedImage.outputPath, source.productName);

    return NextResponse.json({
      imageUrl: upload.secure_url,
      publicId: upload.public_id,
    });
  } catch (error) {
    console.error("W2C image processing failed", error);
    return new NextResponse(error instanceof Error ? error.message : "Image processing failed", {
      status: 500,
    });
  } finally {
    await processedImage?.cleanup();
  }
}

async function readImageSource(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const image = formData.get("image");
    const productName = String(formData.get("productName") ?? "");

    if (!(image instanceof File)) {
      throw new Error("Missing image file");
    }

    if (!image.type.startsWith("image/")) {
      throw new Error("Uploaded file is not an image");
    }

    if (image.size > maxProcessableImageSize) {
      throw new Error("Image is too large. Max size is 25MB.");
    }

    return {
      file: {
        buffer: Buffer.from(await image.arrayBuffer()),
        extension: getImageExtensionFromName(image.name),
      },
      imageUrl: "",
      productName,
    };
  }

  const body = (await request.json()) as Partial<{
    imageUrl: string;
    productName: string;
  }>;

  if (!body.imageUrl?.trim()) {
    throw new Error("Missing image URL");
  }

  return {
    file: null,
    imageUrl: body.imageUrl.trim(),
    productName: body.productName,
  };
}
