"use client";

import { isVideoUrl } from "@/lib/media";

export function PropertyMediaPreview({
  src,
  alt,
  className,
  fallbackSrc,
  videoClassName,
  showControls = false,
  forceKind,
}: {
  src?: string | null;
  alt: string;
  className: string;
  fallbackSrc?: string;
  videoClassName?: string;
  showControls?: boolean;
  forceKind?: "image" | "video";
}) {
  const mediaSrc = src?.trim() || fallbackSrc?.trim() || "";
  const shouldRenderVideo =
    forceKind === "video" || (forceKind !== "image" && isVideoUrl(mediaSrc));

  if (!mediaSrc) {
    return <div className={className} />;
  }

  if (shouldRenderVideo) {
    return (
      <video
        src={mediaSrc}
        className={videoClassName || className}
        controls={showControls}
        playsInline
        preload="metadata"
        muted={!showControls}
      />
    );
  }

  return (
    <img
      src={mediaSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(event) => {
        if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
          event.currentTarget.src = fallbackSrc;
        }
      }}
    />
  );
}
