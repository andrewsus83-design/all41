import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** The plain-words explanation of how the public benchmark works. Shown in every state. */
const STEPS = [
  {
    n: "1",
    title: "One fair job, three ways",
    body: "We pick a representative SEO + GEO audit and give the identical prompt to a regular AI, to all41's app, and to a professional-grade stand-in. No path gets an easier task.",
  },
  {
    n: "2",
    title: "Judged blind",
    body: "Three independent AI judges score the outputs with the labels hidden and the order shuffled — completeness, accuracy, actionability and depth. Real people can vote later too.",
  },
  {
    n: "3",
    title: "Published as-is",
    body: "We average the scores and publish the result, win or lose. all41 never scores its own work, and we only ever compare on quality — never by copying anyone's report.",
  },
] as const;

export function BenchmarkMethod() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {STEPS.map((s) => (
        <Card key={s.n} className="space-y-3 h-full">
          <div className="flex items-center gap-3">
            <span className="num inline-flex items-center justify-center w-8 h-8 rounded-1 bg-green-soft text-green text-sm">{s.n}</span>
            <CardTitle>{s.title}</CardTitle>
          </div>
          <CardHint className="leading-relaxed">{s.body}</CardHint>
        </Card>
      ))}
      <div className="md:col-span-3">
        <Badge tone="green">We don&apos;t score ourselves</Badge>
      </div>
    </div>
  );
}
