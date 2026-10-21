import { Badge, type BadgeTone } from "@/components/ui/badge";
import { getPackage, type PackageTier } from "@/lib/pricing";
import type { GuestStatus } from "@/lib/events/records";
import { GUEST_STATUS_LABELS } from "@/lib/events/records";

const EVENT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "success" },
  archived: { label: "Archived", tone: "neutral" },
};

export function EventStatusBadge({ status }: { status: string }) {
  const { label, tone } = EVENT_STATUS[status] ?? EVENT_STATUS.draft;
  return <Badge tone={tone}>{label}</Badge>;
}

export function PackageBadge({ tier }: { tier: PackageTier }) {
  return <Badge tone={tier === "free" ? "neutral" : "gold"}>{getPackage(tier).name}</Badge>;
}

const GUEST_TONES: Record<GuestStatus, BadgeTone> = {
  invited: "neutral",
  sent: "gold",
  opened: "cyan",
  rsvp: "warning",
  checked_in: "success",
};

export function GuestStatusBadge({ status }: { status: GuestStatus }) {
  return <Badge tone={GUEST_TONES[status]}>{GUEST_STATUS_LABELS[status]}</Badge>;
}
