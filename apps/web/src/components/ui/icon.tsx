import Image from "next/image";
import { cn } from "@/lib/cn";

/** The all41 icon set (flat line-art, design-system palette). Files live in /public/icons. */
export const ICON_NAMES = [
  "add",
  "arrow-right",
  "bar-chart",
  "bell",
  "book",
  "brain",
  "briefcase",
  "calendar",
  "chat",
  "check",
  "checklist",
  "clock",
  "close",
  "coins",
  "compass",
  "contract",
  "copy",
  "cpu",
  "credit-card",
  "database",
  "delete",
  "document",
  "download",
  "edit",
  "email",
  "filter",
  "flag",
  "folder",
  "gauge",
  "growth",
  "handshake",
  "heart",
  "home",
  "id-card",
  "idea",
  "lock",
  "megaphone",
  "menu",
  "microphone",
  "pen",
  "photo",
  "pie-chart",
  "price-tag",
  "refresh",
  "robot",
  "rocket",
  "search",
  "seo",
  "settings",
  "share",
  "sparkle",
  "star",
  "table",
  "target",
  "team",
  "telescope",
  "thumbs-up",
  "trend-up",
  "trophy",
  "upload",
  "user",
  "video",
  "wallet",
  "workflow"
] as const;
export type IconName = (typeof ICON_NAMES)[number];

/** A design-system icon. Decorative by default; pass `alt` when it carries meaning. */
export function Icon({ name, size = 24, className, alt }: { name: IconName | string; size?: number; className?: string; alt?: string }) {
  return (
    <Image
      src={`/icons/${name}.webp`}
      width={size}
      height={size}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      className={cn("inline-block select-none", className)}
    />
  );
}
