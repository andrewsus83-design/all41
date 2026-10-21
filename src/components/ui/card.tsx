import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-[2rem] border border-line bg-panel ${className}`} {...props} />;
}
