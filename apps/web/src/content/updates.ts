/** Build-in-public changelog. Newest first. Plain words. */
export type Update = { date: string; title: string; body: string };

export const UPDATES: Update[] = [
  {
    date: "2026-09-12",
    title: "We now talk to each AI service directly",
    body: "No middleman in between any more. Fewer hops, real prices, real speed numbers in our daily tests.",
  },
  {
    date: "2026-09-12",
    title: "Keys are locked in one place, on our side",
    body: "The access keys for AI services live in a locked store on our servers. They never reach your browser and you never see a key field anywhere in the product.",
  },
  {
    date: "2026-09-12",
    title: "Answers from your own files and notes, in two steps",
    body: "Your files, earlier results and notes are linked together. A question first finds the closest pieces, then follows the links one or two steps out to pull in what is connected. Every answer shows what it used.",
  },
  {
    date: "2026-09-12",
    title: "The money side checked to the cent",
    body: "Balance is checked before a run, the cost is written down before the result comes back, and the books are matched against payments. Tested end to end, including what happens when a balance runs out.",
  },
  {
    date: "2026-09-12",
    title: "3 apps at launch",
    body: "Morning Briefing, Competitor Crawler and Content Pipeline are live. Pick one, answer a few questions in chat, and it runs — now or on a schedule.",
  },
];
