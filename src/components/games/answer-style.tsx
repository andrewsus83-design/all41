import { Circle, Diamond, Square, Triangle } from "lucide-react";
import type { ComponentType } from "react";

/**
 * The four answer colors of the quiz. Each also has its own shape, so a guest who cannot tell
 * the colors apart can still tell the answers apart. Colors are the brand's: pink-red, cyan, amber and green.
 */
export const ANSWER_STYLES: { name: string; tile: string; solid: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }[] = [
  { name: "Red triangle", tile: "bg-danger text-black", solid: "bg-danger", icon: Triangle },
  { name: "Cyan diamond", tile: "bg-neon-cyan text-black", solid: "bg-neon-cyan", icon: Diamond },
  { name: "Amber circle", tile: "bg-warning text-black", solid: "bg-warning", icon: Circle },
  { name: "Green square", tile: "bg-success text-black", solid: "bg-success", icon: Square },
];
