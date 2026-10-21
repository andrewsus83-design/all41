import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QrCode } from "@/components/qr/qr-code";
import { getEvent } from "@/lib/events/queries";
import { getHuntHostBoard, getPlayKey } from "@/lib/games/host";
import { missionUrl } from "@/lib/games/links";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Print hunt QR codes" };

type Props = PageProps<"/dashboard/events/[eventId]/games/hunt/print">;

export default function HuntPrintPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-panel" aria-hidden="true" />}>
      <HuntSheet params={props.params} />
    </Suspense>
  );
}

// Only the sheet prints. Everything else on the page (the dashboard header, the tabs, these
// instructions) is hidden, and the sheet moves to the top-left corner of the paper.
const PRINT_RULES = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .print-sheet, .print-sheet * { visibility: visible !important; }
  .print-sheet { position: absolute; top: 0; left: 0; width: 100%; }
}
`;

async function HuntSheet({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();
  const [board, playKey] = await Promise.all([getHuntHostBoard(eventId), getPlayKey(eventId)]);
  const missions = board.missions.filter((mission) => mission.active);
  const base = `/dashboard/events/${eventId}/games`;

  return (
    <div className="space-y-6">
      <style>{PRINT_RULES}</style>

      <div className="space-y-4 print:hidden">
        <Link href={`${base}/hunt`} className="text-sm text-muted hover:text-fg">
          ← Scavenger hunt
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold">QR sheet</h2>
            <p className="mt-1 text-muted">
              {missions.length === 0
                ? "There are no active missions to print. Add one, or resume a paused one."
                : `${missions.length} ${missions.length === 1 ? "sticker" : "stickers"}, four to an A4 page. Cut along the dotted lines and hide each one where its mission says. The code is printed under the QR for guests whose camera does not scan.`}
            </p>
          </div>
          {missions.length > 0 && <PrintButton />}
        </div>
      </div>

      {missions.length > 0 && (
        <div className="print-sheet grid grid-cols-1 gap-[6mm] rounded-2xl bg-white p-4 text-black sm:grid-cols-2 print:rounded-none print:p-0">
          {missions.map((mission) => (
            <article key={mission.id} className="flex break-inside-avoid flex-col items-center gap-[3mm] rounded-xl border-2 border-dashed border-zinc-400 p-[6mm] text-center sm:h-[125mm] print:h-[125mm]">
              <p className="text-[3.2mm] font-bold tracking-[0.3em] text-zinc-600 uppercase">{event.name}</p>
              <div className="w-[68mm] max-w-full [&_svg]:block [&_svg]:h-auto [&_svg]:w-full">
                <QrCode value={missionUrl(playKey, mission.code)} size={260} label={`QR code for the mission ${mission.title}`} />
              </div>
              <h3 className="text-[6mm] leading-tight font-bold break-words">{mission.title}</h3>
              <p className="text-[4mm] text-zinc-700">
                Scan with your phone camera for <b>{mission.points.toLocaleString("en-US")} points</b>
              </p>
              <p className="text-[3.6mm] text-zinc-600">
                No luck scanning? Type <span className="rounded bg-zinc-100 px-[2mm] py-[0.5mm] font-mono font-bold tracking-widest text-black">{mission.code}</span>
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
