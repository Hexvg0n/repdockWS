import Image, { type ImageProps } from "next/image";

type SmartImageProps = Omit<ImageProps, "alt" | "height" | "src" | "width"> & {
  alt?: string;
  height?: number | `${number}`;
  src?: ImageProps["src"] | null;
  srcSet?: string;
  width?: number | `${number}`;
};

function toDimension(value: SmartImageProps["width"], fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

export default function SmartImage({
  alt = "",
  height,
  sizes,
  src,
  srcSet: _srcSet,
  unoptimized,
  width,
  ...props
}: SmartImageProps) {
  if (!src) return null;

  const normalizedSrc = typeof src === "string" ? src.trim() : src;
  const stringSrc = typeof normalizedSrc === "string" ? normalizedSrc : "";
  const shouldSkipOptimization = unoptimized ?? stringSrc.includes(".svg");

  if (props.fill) {
    return (
      <Image
        {...props}
        alt={alt}
        sizes={sizes ?? "100vw"}
        src={normalizedSrc}
        unoptimized={shouldSkipOptimization}
      />
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      height={toDimension(height, 1200)}
      sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
      src={normalizedSrc}
      unoptimized={shouldSkipOptimization}
      width={toDimension(width, 1200)}
    />
  );
}
