export function getWebpImageUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);

    if (!url.hostname.includes("res.cloudinary.com")) {
      return imageUrl;
    }

    const uploadMarker = "/image/upload/";
    const uploadIndex = url.pathname.indexOf(uploadMarker);

    if (uploadIndex === -1) {
      return imageUrl;
    }

    const beforeUpload = url.pathname.slice(0, uploadIndex + uploadMarker.length);
    const afterUpload = url.pathname.slice(uploadIndex + uploadMarker.length);
    const alreadyTransformed = afterUpload.split("/")[0]?.startsWith("f_");
    const transformedPath = alreadyTransformed
      ? afterUpload.replace(/^([^/]+)/, "f_webp,q_auto")
      : `f_webp,q_auto/${afterUpload}`;

    url.pathname = `${beforeUpload}${transformedPath}`;
    return url.toString();
  } catch {
    return imageUrl;
  }
}
