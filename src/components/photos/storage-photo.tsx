import type { ComponentProps } from "react";

/**
 * A photo from the public bucket. A plain image on purpose: the files are
 * already compressed WebP at their final size, and next/image would need the
 * storage host configured and would proxy every photo through the app.
 */
export function StoragePhoto({ alt, className = "", ...props }: Omit<ComponentProps<"img">, "alt"> & { alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} loading="lazy" decoding="async" className={className} {...props} />;
}
