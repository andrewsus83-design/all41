import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";

export default function PreviewPage() {
  return (
    <main className="max-w-4xl mx-auto p-12 space-y-12">
      <header className="space-y-2">
        <h1 className="text-5xl font-semibold">all41 design system</h1>
        <p className="reflect text-fg-muted">What decision does this help you make?</p>
      </header>
      <section className="space-y-4">
        <h2 className="text-2xl">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button phase="red" size="lg">Stop & Think</Button>
          <Button phase="amber">Prepare</Button>
          <Button phase="green" size="sm">Go & Track</Button>
          <Button>Neutral</Button>
          <Button phase="ghost">Ghost</Button>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl">Badges</h2>
        <div className="flex gap-3">
          <Badge tone="red">think</Badge>
          <Badge tone="amber">prepare</Badge>
          <Badge tone="green">go</Badge>
          <Badge>neutral</Badge>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl">Inputs</h2>
        <Input placeholder="Who’s the competitor to track?" />
        <Textarea placeholder="Any constraints?" />
      </section>
      <section className="grid grid-cols-2 gap-6">
        <Card>
          <CardTitle>Credit balance</CardTitle>
          <p className="text-4xl mt-2"><Money usd={12.4} /></p>
          <CardHint>This task: <Money usd={0.0312} /></CardHint>
        </Card>
        <Card>
          <CardTitle>Radii</CardTitle>
          <div className="flex gap-3 mt-4">
            {[1, 2, 3, 4, 5, 6].map((r) => (
              <div key={r} className={`squircle bg-bg-elev-2 border border-line-strong size-14 rounded-${r}`} />
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
