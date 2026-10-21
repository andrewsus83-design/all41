const GRID = 25;
const FINDER = 7;

/** A fixed pseudo-random sequence, so the artwork renders the same everywhere. */
function sequence(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function buildPath(): string {
  const next = sequence(41);
  const finders = [
    [0, 0],
    [GRID - FINDER, 0],
    [0, GRID - FINDER],
  ];

  const inFinderZone = (x: number, y: number) =>
    finders.some(([fx, fy]) => x >= fx - 1 && x <= fx + FINDER && y >= fy - 1 && y <= fy + FINDER);

  const filled = new Set<string>();
  for (const [fx, fy] of finders) {
    for (let dx = 0; dx < FINDER; dx++) {
      for (let dy = 0; dy < FINDER; dy++) {
        const ring = dx === 0 || dy === 0 || dx === FINDER - 1 || dy === FINDER - 1;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        if (ring || core) filled.add(`${fx + dx},${fy + dy}`);
      }
    }
  }
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!inFinderZone(x, y) && next() < 0.48) filled.add(`${x},${y}`);
    }
  }

  return [...filled]
    .map((cell) => {
      const [x, y] = cell.split(",");
      return `M${x} ${y}h1v1h-1z`;
    })
    .join("");
}

const PATH = buildPath();

/** Decorative stand-in for a guest's QR code. It encodes nothing. */
export function QrArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${GRID} ${GRID}`} className={className} aria-hidden="true" shapeRendering="crispEdges">
      <path d={PATH} fill="currentColor" />
    </svg>
  );
}
