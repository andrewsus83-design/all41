import { CalendarPlus, Camera, ChevronRight, Gamepad2, Images, QrCode, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { GuestFeatures } from "@/lib/guest/features";
import { calendarPath } from "@/lib/guest/links";
import type { PublicEvent } from "@/lib/guest/records";

/** One thing a guest can do from their invitation: a card that opens a page. */
export interface ActionCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Gold is the platform's action color. Cyan is for live moments: games, the photo wall. */
  tone?: "gold" | "cyan";
  /** True when the link is a file, such as a calendar entry, rather than a page. */
  download?: boolean;
}

/**
 * The cards the invitation shows under the pass, in the order on screen. A card appears only when the host has
 * switched its feature on. `ended` is true once the event is over: cards that only make sense before or during
 * the event (the calendar entry, the live quiz, the hunt) are left out then, while the photos stay open.
 */
export function invitationCards({
  token,
  event,
  ended,
  features,
}: {
  token: string;
  event: PublicEvent;
  ended: boolean;
  features: GuestFeatures;
}): ActionCard[] {
  const cards: ActionCard[] = [];

  if (!ended) {
    cards.push({
      id: "calendar",
      title: "Add to calendar",
      description: "Save the date in your phone's calendar.",
      href: calendarPath(event.slug),
      icon: CalendarPlus,
      download: true,
    });
  }

  if (features.quizLive && !ended) {
    cards.push({
      id: "quiz",
      title: "Play the live quiz",
      description: "It is on now. Join from your phone.",
      href: `/i/${token}/play`,
      icon: Gamepad2,
      tone: "cyan",
    });
  }

  if (features.hunt && !ended) {
    cards.push({
      id: "hunt",
      title: "Scavenger hunt",
      description: `Find the codes around the venue. You have found ${features.hunt.claimed} of ${features.hunt.total}.`,
      href: `/i/${token}/hunt`,
      icon: QrCode,
      tone: "cyan",
    });
  }

  if (features.photos) {
    cards.push({
      id: "photos",
      title: "Share your photos",
      description: "Take a photo and it can appear on the big screen.",
      href: `/i/${token}/photos`,
      icon: Camera,
      tone: "cyan",
    });
    cards.push({
      id: "album",
      title: "Shared album",
      description: "Every photo guests have shared. Download your favorites.",
      href: `/i/${token}/album`,
      icon: Images,
    });
  }

  return cards;
}

export function ActionCards({ cards }: { cards: ActionCard[] }) {
  if (cards.length === 0) return null;

  return (
    <ul className="space-y-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const cyan = card.tone === "cyan";
        return (
          <li key={card.id}>
            <Card className={`scale-on-click relative flex items-center gap-4 p-4 pr-5 ${cyan ? "border-neon-cyan/30 shadow-neon" : ""}`}>
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${cyan ? "bg-neon-cyan/15 text-neon-cyan" : "bg-gold/10 text-gold"}`}
                aria-hidden="true"
              >
                <Icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-semibold">
                  <a href={card.href} download={card.download || undefined} className="after:absolute after:inset-0 after:rounded-[2rem]">
                    {card.title}
                  </a>
                </h3>
                <p className="text-sm text-muted">{card.description}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-subtle" aria-hidden="true" />
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
