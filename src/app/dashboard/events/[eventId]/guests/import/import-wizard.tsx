"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseCsv } from "@/lib/csv";
import { MAX_IMPORT_ROWS, prepareImport, type ImportPreview, type ImportRow } from "@/lib/guests/import";
import { importGuests } from "../../../../actions";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS_SHOWN = 200;

const COLUMN_LABELS = { name: "Name", email: "Email", phone: "Phone", tags: "Tags", tableNo: "Table" } as const;

type Stage =
  | { name: "choose"; error?: string }
  | { name: "preview"; fileName: string; preview: ImportPreview; garbled: boolean }
  | { name: "done"; added: number; skipped: number };

const number = (value: number) => value.toLocaleString("en-US");

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink px-4 py-3">
      <p className={`font-display text-2xl font-semibold tabular-nums ${tone}`}>{number(value)}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function RowStatus({ row }: { row: ImportRow }) {
  if (row.status === "ready") return <Badge tone="lime">Ready</Badge>;
  if (row.status === "duplicate") {
    const where = row.duplicateOf.source === "event" ? "already on the list" : "repeated in the file";
    return <Badge tone="gold">Skipped: {row.duplicateOf.field} {where}</Badge>;
  }
  return (
    <span className="text-sm text-danger">
      <Badge tone="pink">Needs attention</Badge> <span className="ml-1">{row.errors.join(" ")}</span>
    </span>
  );
}

export function ImportWizard({
  eventId,
  guestsPath,
  existingEmails,
  existingPhones,
  remaining,
}: {
  eventId: string;
  guestsPath: string;
  existingEmails: string[];
  existingPhones: string[];
  /** How many more guests the package allows. */
  remaining: number;
}) {
  const [stage, setStage] = useState<Stage>({ name: "choose" });
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [importing, startImporting] = useTransition();
  const inputId = useId();

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setStage({ name: "choose", error: "That file is larger than 2 MB. Split it into smaller files." });
      return;
    }
    const text = await file.text();
    const rows = parseCsv(text);
    const preview = prepareImport(rows, { emails: new Set(existingEmails), phones: new Set(existingPhones) });

    if (preview.counts.total === 0) {
      setStage({ name: "choose", error: "We could not find any guests in that file. Check that it has a row per guest." });
    } else if (preview.counts.total > MAX_IMPORT_ROWS) {
      setStage({
        name: "choose",
        error: `Import up to ${number(MAX_IMPORT_ROWS)} guests at a time. This file has ${number(preview.counts.total)}. Split it and import the parts one after another.`,
      });
    } else {
      setSubmitError(undefined);
      setOnlyProblems(false);
      setStage({ name: "preview", fileName: file.name, preview, garbled: text.includes("�") });
    }
  }

  if (stage.name === "done") {
    return (
      <Card className="space-y-5 p-8">
        <div role="status" className="space-y-2">
          <h2 className="font-display text-2xl font-semibold">
            {stage.added === 0 ? "Nothing new to add" : `${number(stage.added)} ${stage.added === 1 ? "guest" : "guests"} added`}
          </h2>
          {stage.skipped > 0 && (
            <p className="text-muted">
              {number(stage.skipped)} {stage.skipped === 1 ? "row was" : "rows were"} skipped because the email or phone is already on the list.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={guestsPath} className={buttonStyles()}>
            View the guest list
          </Link>
          <Button variant="secondary" onClick={() => setStage({ name: "choose" })}>
            Import another file
          </Button>
        </div>
      </Card>
    );
  }

  if (stage.name === "choose") {
    return (
      <Card className="space-y-6 p-8">
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold">Choose a CSV file</h2>
          <p className="max-w-2xl text-muted">
            One row per guest. We look for the columns Name, Email, Phone, Tags and Table, in English or Indonesian, and show you
            what we found before anything is added. In Excel or Google Sheets, use File → Save as → CSV.
          </p>
        </div>
        <div>
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center transition-colors hover:border-neon-violet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neon-cyan"
          >
            <span className="font-medium">Click to choose a file</span>
            <span className="text-sm text-muted">CSV, up to 2 MB and {number(MAX_IMPORT_ROWS)} guests</span>
            <input
              id={inputId}
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              className="sr-only"
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {stage.error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {stage.error}
            </p>
          )}
        </div>
        <p className="text-sm text-muted">
          Not sure how it should look?{" "}
          <a href="/all41-guest-template.csv" download className="text-gold underline">
            Download the template
          </a>
          .
        </p>
      </Card>
    );
  }

  const { preview } = stage;
  const { counts } = preview;
  const tooMany = counts.ready > remaining;
  const columns = (Object.keys(preview.columns) as (keyof typeof COLUMN_LABELS)[]).map((key) => COLUMN_LABELS[key]);
  const shown = (onlyProblems ? preview.rows.filter((row) => row.status !== "ready") : preview.rows).slice(0, MAX_ROWS_SHOWN);

  const submit = () => {
    setSubmitError(undefined);
    startImporting(async () => {
      const guests = preview.rows.flatMap((row) => (row.status === "ready" ? [row.guest] : []));
      const result = await importGuests(eventId, guests);
      if (result.ok) setStage({ name: "done", added: result.added, skipped: result.skipped });
      else setSubmitError(result.error);
    });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Check before importing</h2>
            <p className="text-sm text-muted">
              {stage.fileName}. {preview.hasHeader ? "Columns found" : "No header row, so columns are read in this order"}:{" "}
              {columns.join(", ")}.
              {preview.ignored.length > 0 && ` Left out: ${preview.ignored.join(", ")}.`}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setStage({ name: "choose" })}>
            Choose another file
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Ready to add" value={counts.ready} tone="text-neon-lime" />
          <Stat label="Skipped as duplicates" value={counts.duplicates} tone="text-gold" />
          <Stat label="Need attention" value={counts.invalid} tone={counts.invalid ? "text-neon-pink" : "text-muted"} />
        </div>

        {stage.garbled && (
          <p role="alert" className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
            Some characters in the file could not be read, so a few names may look wrong. Save the sheet as &ldquo;CSV UTF-8&rdquo; and
            choose it again to fix that.
          </p>
        )}
        {tooMany && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {remaining === 0
              ? "The guest list is full, so nobody can be added."
              : `Only ${number(remaining)} more ${remaining === 1 ? "guest fits" : "guests fit"} on the list, but ${number(counts.ready)} are ready to add. Remove rows from the file, or add capacity, and choose it again.`}
          </p>
        )}
        {counts.invalid > 0 && (
          <p className="text-sm text-muted">
            Rows that need attention are not imported. Fix them in your file and import again, or add those guests by hand.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={submit} disabled={importing || counts.ready === 0 || tooMany}>
            {importing ? "Importing…" : counts.ready === 0 ? "Nothing to import" : `Import ${number(counts.ready)} ${counts.ready === 1 ? "guest" : "guests"}`}
          </Button>
          {counts.invalid + counts.duplicates > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={onlyProblems} onChange={(event) => setOnlyProblems(event.target.checked)} className="size-4 accent-[#d4af5f]" />
              Show only rows that are not ready
            </label>
          )}
        </div>
        {submitError && (
          <p role="alert" className="text-sm text-danger">
            {submitError}
          </p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Rows found in {stage.fileName}</caption>
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Row</th>
                <th scope="col" className="px-3 py-3 font-medium">Guest</th>
                <th scope="col" className="px-3 py-3 font-medium">Contact</th>
                <th scope="col" className="px-5 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((row) => (
                <tr key={row.line} className="align-top">
                  <td className="px-5 py-3 text-muted tabular-nums">{row.line}</td>
                  <td className="px-3 py-3">
                    {row.status === "invalid" ? row.name || <span className="text-muted">No name</span> : row.guest.name}
                    {row.status !== "invalid" && (row.guest.tags.length > 0 || row.guest.tableNo) && (
                      <span className="block text-xs text-muted">
                        {[...row.guest.tags, row.guest.tableNo ? `Table ${row.guest.tableNo}` : ""].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {row.status === "invalid" ? "" : [row.guest.email, row.guest.phone].filter(Boolean).join(" · ") || "None"}
                  </td>
                  <td className="px-5 py-3">
                    <RowStatus row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview.rows.length > shown.length && !onlyProblems && (
          <p className="border-t border-line px-5 py-3 text-sm text-muted">
            Showing the first {number(MAX_ROWS_SHOWN)} of {number(preview.rows.length)} rows. All ready rows are imported.
          </p>
        )}
      </Card>
    </div>
  );
}
