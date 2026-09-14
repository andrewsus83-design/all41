"use client";
import { useEffect, useState } from "react";

function Sun() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function Moon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try { localStorage.setItem("all41-theme", next ? "dark" : "light"); } catch { /* private mode */ }
  };
  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title="Theme"
      className="size-10 rounded-full grid place-items-center text-fg-muted hover:text-fg hover:bg-bg-elev-2 transition">
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}
