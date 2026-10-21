import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("reads plain rows and drops blank lines", () => {
    expect(parseCsv("a,b,c\n1,2,3\n\n4,5,6\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles CRLF, a lone CR and a byte order mark", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("keeps delimiters, doubled quotes and line breaks inside quoted cells", () => {
    expect(parseCsv('name,note\n"Doe, Jane","said ""hi""\nthen left"')).toEqual([
      ["name", "note"],
      ["Doe, Jane", 'said "hi"\nthen left'],
    ]);
  });

  it("keeps empty cells but drops rows that are empty all the way across", () => {
    expect(parseCsv("a,,c\n,b,\n,,\n")).toEqual([
      ["a", "", "c"],
      ["", "b", ""],
    ]);
  });

  it.each([
    ["semicolon", "name;email\nJane;jane@example.com"],
    ["tab", "name\temail\nJane\tjane@example.com"],
    ["pipe", "name|email\nJane|jane@example.com"],
  ])("detects a %s delimiter", (_label, text) => {
    expect(parseCsv(text)).toEqual([
      ["name", "email"],
      ["Jane", "jane@example.com"],
    ]);
  });

  it("does not take a delimiter inside quotes on the first line for the real one", () => {
    expect(parseCsv('"a;b;c",d\n1,2')).toEqual([
      ["a;b;c", "d"],
      ["1", "2"],
    ]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\n\n  \n")).toEqual([]);
  });
});

describe("toCsv", () => {
  it("quotes cells that need it and ends lines with CRLF", () => {
    expect(toCsv([["name", "note"], ["Doe, Jane", 'said "hi"']])).toBe('name,note\r\n"Doe, Jane","said ""hi"""\r\n');
  });

  it("writes empty cells for null and undefined", () => {
    expect(toCsv([["a", null, undefined, 4]])).toBe("a,,,4\r\n");
  });

  it.each(["=SUM(A1:A9)", "@cmd", "+1+1", "-2+3", "\tcmd", "=HYPERLINK(\"http://x\")"])(
    "neutralizes the formula %j",
    (value) => {
      expect(toCsv([[value]]).startsWith(`'`) || toCsv([[value]]).startsWith(`"'`)).toBe(true);
    },
  );

  it("leaves a plain signed number, like an E.164 phone, as it is", () => {
    expect(toCsv([["+6281234567890"]])).toBe("+6281234567890\r\n");
  });

  it("round-trips through parseCsv", () => {
    const rows = [
      ["name", "email", "note"],
      ["Doe, Jane", "jane@example.com", 'line one\nline "two"'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
