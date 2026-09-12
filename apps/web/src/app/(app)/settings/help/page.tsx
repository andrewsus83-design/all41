import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ } from "@/content/faq";

export const metadata = { title: "Help" };

const STEPS = [
  { n: 1, title: "Pick an app", body: "Go to My Apps and choose one — say, a morning briefing or a competitor check. Answer three or four questions in plain words. That is the whole setup." },
  { n: 2, title: "Let it run", body: "It runs once, or on the schedule you chose, and the result lands where you asked: chat, email or your dashboard. You see the price before every run." },
  { n: 3, title: "Think about it", body: "Open AI. Pick the app, and ask what the last runs mean or how to make it more useful. That room only talks about your apps and their results, so it stays sharp and cheap." },
];

const COST_FAQ = FAQ.find((f) => f.id === "cost");
const DATA_FAQ = FAQ.find((f) => f.id === "data");
const REST = FAQ.filter((f) => f.id !== "cost" && f.id !== "data");

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <Card className="space-y-6">
        <div className="space-y-1">
          <CardTitle>Getting started</CardTitle>
          <CardHint>Three steps. No settings to learn.</CardHint>
        </div>
        <ol className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <li key={s.n} className="space-y-2 rounded-3 border border-line bg-bg p-5 squircle">
              <p className="num text-xs text-fg-faint">{s.n}</p>
              <p className="font-title font-medium">{s.title}</p>
              <p className="text-sm text-fg-muted leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>What does a task cost</CardTitle>
          <p className="text-sm text-fg-muted leading-relaxed">{COST_FAQ?.a}</p>
          <p className="text-sm text-fg-muted leading-relaxed">The price is the real AI cost plus a fixed mark-up and a small platform fee. Failed runs are not charged. Your balance is always at the top of the screen; top up under Billing.</p>
        </Card>
        <Card className="space-y-3">
          <CardTitle>Where my data lives</CardTitle>
          <p className="text-sm text-fg-muted leading-relaxed">{DATA_FAQ?.a}</p>
          <p className="text-sm text-fg-muted leading-relaxed">Files, sheets, notes and results stay in your account and are used to answer your own questions only. Keys for the AI services are ours; you never handle them.</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Common questions</CardTitle>
          <CardHint>The same answers we give everyone.</CardHint>
        </div>
        <FaqAccordion items={REST} />
      </Card>

      <p className="text-sm text-fg-muted">Still stuck? Email hello@all41.app — a person reads it.</p>
    </div>
  );
}
