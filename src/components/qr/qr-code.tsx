import { create } from "qrcode";

/**
 * A QR code drawn as an inline SVG, so it needs no client JavaScript and prints
 * sharply. Dark modules on a white quiet zone read on any theme and any phone.
 */
export function QrCode({ value, size = 192, label }: { value: string; size?: number; label: string }) {
  const { modules } = create(value, { errorCorrectionLevel: "M" });
  const quietZone = 2;
  const span = modules.size + quietZone * 2;

  let path = "";
  for (let row = 0; row < modules.size; row++) {
    for (let column = 0; column < modules.size; column++) {
      if (modules.data[row * modules.size + column]) path += `M${column + quietZone} ${row + quietZone}h1v1h-1z`;
    }
  }

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${span} ${span}`} width={size} height={size} shapeRendering="crispEdges">
      <rect width={span} height={span} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
