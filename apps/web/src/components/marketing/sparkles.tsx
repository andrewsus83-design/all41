/** A few palette-colored sparkles that gently twinkle — accent only, never busy. Decorative. */
const SPARKS: Array<{ top: string; left: string; size: number; color: string; delay: number }> = [
  { top: "8%", left: "14%", size: 26, color: "var(--coral-solid)", delay: 0 },
  { top: "26%", left: "84%", size: 20, color: "var(--violet-solid)", delay: 1.1 },
  { top: "54%", left: "9%", size: 18, color: "var(--amber-solid)", delay: 2.0 },
  { top: "16%", left: "72%", size: 15, color: "var(--sky-solid)", delay: 0.6 },
  { top: "70%", left: "88%", size: 22, color: "var(--green-solid)", delay: 1.6 },
  { top: "40%", left: "26%", size: 13, color: "var(--amber-solid)", delay: 2.6 },
];

export function Sparkles() {
  return (
    <div className="hidden md:block absolute inset-0 -z-[5] pointer-events-none" aria-hidden>
      {SPARKS.map((s, i) => (
        <svg
          key={i}
          className="twinkle absolute"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, color: s.color, animationDelay: `${s.delay}s` }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0c1.1 7 4 9.9 12 12-8 2.1-10.9 5-12 12-1.1-7-4-9.9-12-12 8-2.1 10.9-5 12-12Z" />
        </svg>
      ))}
    </div>
  );
}
