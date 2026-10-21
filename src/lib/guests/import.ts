import { guestSchema, type GuestInput } from "./input";

/** One import adds at most this many guests, so a request stays small and the preview stays quick. */
export const MAX_IMPORT_ROWS = 1000;

export type GuestColumn = "name" | "email" | "phone" | "tags" | "tableNo";

/** Headers people really use, including Indonesian ones, as lowercase words. */
const HEADER_ALIASES: Record<GuestColumn, readonly string[]> = {
  name: ["name", "full name", "fullname", "guest", "guest name", "nama", "nama lengkap", "nama tamu"],
  email: ["email", "e mail", "email address", "mail", "surel"],
  phone: ["phone", "phone number", "mobile", "mobile number", "whatsapp", "wa", "hp", "no hp", "nomor hp", "telepon", "telp"],
  tags: ["tags", "tag", "group", "category", "kategori", "grup", "department", "division", "divisi"],
  tableNo: ["table", "table no", "table number", "meja", "no meja", "nomor meja"],
};

/** Without a header row, columns are read in this order. */
const DEFAULT_ORDER: readonly GuestColumn[] = ["name", "email", "phone", "tags", "tableNo"];

const normalizeHeader = (cell: string) => cell.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

function columnFor(header: string): GuestColumn | null {
  const key = normalizeHeader(header);
  for (const column of DEFAULT_ORDER) {
    if (HEADER_ALIASES[column].includes(key)) return column;
  }
  return null;
}

export type ColumnMap = Partial<Record<GuestColumn, number>>;

export interface DetectedColumns {
  hasHeader: boolean;
  columns: ColumnMap;
  /** Headers that matched nothing and are left out. */
  ignored: string[];
}

export function detectColumns(firstRow: readonly string[]): DetectedColumns {
  const columns: ColumnMap = {};
  const ignored: string[] = [];
  firstRow.forEach((cell, index) => {
    const column = columnFor(cell);
    if (column && columns[column] === undefined) columns[column] = index;
    else if (cell.trim()) ignored.push(cell.trim());
  });

  // A header row names at least the guest, their email or their phone.
  if (columns.name !== undefined || columns.email !== undefined || columns.phone !== undefined) {
    return { hasHeader: true, columns, ignored };
  }

  const positional: ColumnMap = {};
  DEFAULT_ORDER.forEach((column, index) => {
    if (index < firstRow.length) positional[column] = index;
  });
  return { hasHeader: false, columns: positional, ignored: [] };
}

export interface ExistingGuests {
  emails: ReadonlySet<string>;
  phones: ReadonlySet<string>;
}

export type DuplicateOf = { source: "event" | "file"; field: "email" | "phone" };

/**
 * Splits guests into those that can be added and those that repeat an email or
 * phone already on the list, or earlier in the same batch. The first one wins.
 */
export function dedupeGuests(guests: readonly GuestInput[], existing: ExistingGuests) {
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const ready: GuestInput[] = [];
  const duplicates: { guest: GuestInput; duplicateOf: DuplicateOf }[] = [];

  const findDuplicate = (guest: GuestInput): DuplicateOf | null => {
    if (guest.email) {
      if (existing.emails.has(guest.email)) return { source: "event", field: "email" };
      if (seenEmails.has(guest.email)) return { source: "file", field: "email" };
    }
    if (guest.phone) {
      if (existing.phones.has(guest.phone)) return { source: "event", field: "phone" };
      if (seenPhones.has(guest.phone)) return { source: "file", field: "phone" };
    }
    return null;
  };

  for (const guest of guests) {
    const duplicateOf = findDuplicate(guest);
    if (duplicateOf) {
      duplicates.push({ guest, duplicateOf });
      continue;
    }
    if (guest.email) seenEmails.add(guest.email);
    if (guest.phone) seenPhones.add(guest.phone);
    ready.push(guest);
  }
  return { ready, duplicates };
}

export type ImportRow =
  | { line: number; status: "ready"; guest: GuestInput }
  | { line: number; status: "duplicate"; guest: GuestInput; duplicateOf: DuplicateOf }
  | { line: number; status: "invalid"; name: string; errors: string[] };

export interface ImportPreview extends DetectedColumns {
  rows: ImportRow[];
  counts: { total: number; ready: number; duplicates: number; invalid: number };
}

/** Reads the rows of a spreadsheet into guests, checking every row and finding duplicates. */
export function prepareImport(rows: readonly (readonly string[])[], existing: ExistingGuests): ImportPreview {
  const detected = rows.length > 0 ? detectColumns(rows[0]) : { hasHeader: false, columns: {}, ignored: [] };
  const dataRows = detected.hasHeader ? rows.slice(1) : rows;
  const firstLine = detected.hasHeader ? 2 : 1;

  const cell = (row: readonly string[], column: GuestColumn) => {
    const index = detected.columns[column];
    return index === undefined ? "" : (row[index] ?? "");
  };

  const parsed: { line: number; guest: GuestInput }[] = [];
  const results: ImportRow[] = [];

  dataRows.forEach((row, offset) => {
    const line = firstLine + offset;
    const result = guestSchema.safeParse({
      name: cell(row, "name"),
      email: cell(row, "email"),
      phone: cell(row, "phone"),
      tags: cell(row, "tags"),
      tableNo: cell(row, "tableNo"),
    });
    if (result.success) parsed.push({ line, guest: result.data });
    else results.push({ line, status: "invalid", name: cell(row, "name").trim(), errors: result.error.issues.map((issue) => issue.message) });
  });

  const { ready, duplicates } = dedupeGuests(parsed.map((p) => p.guest), existing);
  const lineOf = new Map(parsed.map((p) => [p.guest, p.line]));
  for (const guest of ready) results.push({ line: lineOf.get(guest) ?? 0, status: "ready", guest });
  for (const { guest, duplicateOf } of duplicates) {
    results.push({ line: lineOf.get(guest) ?? 0, status: "duplicate", guest, duplicateOf });
  }
  results.sort((a, b) => a.line - b.line);

  return {
    ...detected,
    rows: results,
    counts: {
      total: results.length,
      ready: ready.length,
      duplicates: duplicates.length,
      invalid: results.length - ready.length - duplicates.length,
    },
  };
}
