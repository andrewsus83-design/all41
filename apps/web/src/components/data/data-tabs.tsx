"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { dataHref, TABS, type DataTab } from "./nav";

export function DataTabs({ tab, folder, q, showSearch }: { tab: DataTab; folder?: string; q: string; showSearch: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  if (seenQ !== q) { setSeenQ(q); setText(q); }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.replace(dataHref({ tab, folder, q: v.trim() })), 250);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <nav className="flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={dataHref({ tab: t.id, folder })}
            className={cn("squircle rounded-2 px-5 h-11 inline-flex items-center font-title font-medium transition", tab === t.id ? "bg-fg text-bg" : "text-fg-muted hover:text-fg hover:bg-bg-elev-2")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {showSearch && (
        <input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by name"
          className="ml-auto w-64 max-w-full h-11 bg-bg-elev border border-line rounded-2 px-4 outline-none focus:border-amber placeholder:text-fg-faint"
        />
      )}
    </div>
  );
}
