const DELIMITERS = [",", ";", "\t", "|"] as const;

/** Picks the delimiter used on the first line. Excel in some locales exports with ";". */
function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  // On a tie the earlier delimiter wins, so a file without any delimiter reads as comma separated.
  return DELIMITERS.reduce((best, d) => ((counts.get(d) ?? 0) > (counts.get(best) ?? 0) ? d : best), DELIMITERS[0]);
}

/**
 * Splits CSV text into rows of cells. Handles quoted cells, doubled quotes,
 * CRLF line ends and a leading byte order mark, and skips blank lines.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Stops a spreadsheet from running a cell as a formula. Guests type their own
 * names and messages, so an export must not trust them. A plain signed number,
 * such as a phone number in E.164 form, is left alone.
 */
function neutralizeFormula(value: string): string {
  if (/^[=@\t\r]/.test(value)) return `'${value}`;
  if (/^[+-]/.test(value) && !/^[+-]\d+$/.test(value)) return `'${value}`;
  return value;
}

export type CsvCell = string | number | null | undefined;

export function toCsv(rows: readonly (readonly CsvCell[])[]): string {
  const line = (cells: readonly CsvCell[]) =>
    cells
      .map((cell) => {
        const value = neutralizeFormula(cell === null || cell === undefined ? "" : String(cell));
        return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
      })
      .join(",");
  return `${rows.map(line).join("\r\n")}\r\n`;
}
