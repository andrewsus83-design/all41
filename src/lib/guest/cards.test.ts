import { describe, expect, it } from "vitest";
import { invitationCards } from "@/app/i/[token]/action-cards";
import type { GuestFeatures } from "./features";
import { parsePublicEvent } from "./records";

const event = parsePublicEvent({
  slug: "annual-gala",
  name: "Annual Gala",
  type: "corporate",
  timezone: "Asia/Jakarta",
  starts_at: "2026-12-05T11:00:00+00:00",
  ends_at: "2026-12-05T15:30:00+00:00",
  venue_name: null,
  venue_address: null,
  theme: { preset: "gala", font: "classic" },
})!;

const token = "a".repeat(64);
const none: GuestFeatures = { photos: false, quizLive: false, hunt: null, playKey: null };
const ids = (features: GuestFeatures, ended = false) => invitationCards({ token, event, ended, features }).map((card) => card.id);

describe("the cards on an invitation", () => {
  it("offers only the calendar when the host has switched nothing on", () => {
    expect(ids(none)).toEqual(["calendar"]);
  });

  it("offers each feature only when it is on", () => {
    expect(ids({ ...none, photos: true })).toEqual(["calendar", "photos", "album"]);
    expect(ids({ ...none, quizLive: true })).toEqual(["calendar", "quiz"]);
    expect(ids({ ...none, hunt: { claimed: 1, total: 4 } })).toEqual(["calendar", "hunt"]);
    expect(ids({ photos: true, quizLive: true, hunt: { claimed: 0, total: 3 }, playKey: "k" })).toEqual([
      "calendar",
      "quiz",
      "hunt",
      "photos",
      "album",
    ]);
  });

  it("links each card to the guest's own pages", () => {
    const cards = invitationCards({ token, event, ended: false, features: { photos: true, quizLive: true, hunt: { claimed: 2, total: 5 }, playKey: "k" } });
    expect(Object.fromEntries(cards.map((card) => [card.id, card.href]))).toEqual({
      calendar: "/e/annual-gala/calendar.ics",
      quiz: `/i/${token}/play`,
      hunt: `/i/${token}/hunt`,
      photos: `/i/${token}/photos`,
      album: `/i/${token}/album`,
    });
    expect(cards.find((card) => card.id === "hunt")?.description).toContain("2 of 5");
  });

  it("keeps the photos and drops what only makes sense before or during the event once it is over", () => {
    expect(ids({ photos: true, quizLive: true, hunt: { claimed: 1, total: 3 }, playKey: "k" }, true)).toEqual(["photos", "album"]);
  });
});
