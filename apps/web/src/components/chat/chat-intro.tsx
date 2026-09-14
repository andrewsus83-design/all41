"use client";
import { Button } from "@/components/ui/button";

const USE_CASES = [
  "Journaling", "Build a website", "Content pipeline", "Clip a video",
  "Get found on Google", "Watch competitors", "Write a proposal", "Research anything",
];

/** One-screen intro shown once (skippable). Explains how this chat is different, then hands off to the live chat. */
export function ChatIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-[72vh] max-w-3xl mx-auto flex flex-col items-center justify-center text-center gap-8 py-10 scene-in">
      <span className="grid place-items-center size-16 rounded-full bg-amber-soft text-amber font-title font-bold text-3xl shadow-sm">a</span>

      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Not another chatbot.</h1>
        <p className="text-lg text-fg-muted leading-relaxed text-pretty">
          Most AI chats just <span className="italic">talk</span>. all41 <span className="text-fg font-medium">does the work</span> — armed with the right models, real tools and skills, and it already knows <span className="text-fg font-medium">your context</span>, so you get a finished result, not a wall of text. And it <span className="text-fg font-medium">remembers you</span> — every run gets sharper and cheaper.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Your personal assistant — for anything</p>
        <div className="flex flex-wrap gap-2 justify-center max-w-xl">
          {USE_CASES.map((u) => (
            <span key={u} className="squircle rounded-full border border-line bg-bg-elev px-3.5 py-1.5 text-sm text-fg-muted">{u}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button phase="green" size="lg" className="glow-coral" onClick={onStart}>Mulai chat →</Button>
        <button type="button" onClick={onStart} className="text-sm text-fg-muted hover:text-fg transition">Skip</button>
      </div>

      <p className="text-xs text-fg-faint">You only pay when it actually runs. Nothing to cancel.</p>
    </div>
  );
}
