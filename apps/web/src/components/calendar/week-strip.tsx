import { Card, CardHint } from "@/components/ui/card";
import { Money } from "@/components/ui/money";

export function WeekStrip({ tasksRun, spent }: { tasksRun: number; spent: number }) {
  return (
    <Card className="flex items-center gap-10 py-5">
      <div className="space-y-1">
        <CardHint>This week</CardHint>
        <p className="text-sm text-fg-faint">Monday to Sunday</p>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-semibold num">{tasksRun}</p>
        <CardHint>{tasksRun === 1 ? "task run" : "tasks run"}</CardHint>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-semibold"><Money usd={spent} /></p>
        <CardHint>spent</CardHint>
      </div>
    </Card>
  );
}
