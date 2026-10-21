import { describe, expect, it } from "vitest";
import { classifyGameError } from "./errors";
import { missionSchema, questionSchema, quizTitleSchema } from "./forms";
import { extractMissionCode, joinUrl, missionUrl } from "./links";
import { minimumQuizPoints, quizPoints } from "./scoring";

const question = (overrides: Record<string, string> = {}) => ({
  prompt: "Capital of Indonesia?",
  option1: "Surabaya",
  option2: "Jakarta",
  option3: "",
  option4: "",
  correct: "2",
  timeLimit: "20",
  basePoints: "1000",
  ...overrides,
});

describe("quiz points", () => {
  it("fall from the base to half of it over the time limit", () => {
    expect(quizPoints(1000, 0, 20)).toBe(1000);
    expect(quizPoints(1000, 10_000, 20)).toBe(750);
    expect(quizPoints(1000, 20_000, 20)).toBe(500);
    expect(quizPoints(1000, 99_000, 20)).toBe(500);
    expect(quizPoints(1000, -5, 20)).toBe(1000);
    expect(minimumQuizPoints(1000)).toBe(500);
    expect(minimumQuizPoints(101)).toBe(51);
  });
});

describe("question form", () => {
  it("turns the boxes into a list of answers and a correct index", () => {
    const parsed = questionSchema.parse(question());
    expect(parsed).toEqual({ prompt: "Capital of Indonesia?", options: ["Surabaya", "Jakarta"], correctIndex: 1, timeLimit: 20, basePoints: 1000 });
  });

  it("drops empty boxes and moves the correct answer with its text", () => {
    const parsed = questionSchema.parse(question({ option1: "", option2: "Bandung", option3: "", option4: "Jakarta", correct: "4" }));
    expect(parsed.options).toEqual(["Bandung", "Jakarta"]);
    expect(parsed.correctIndex).toBe(1);
  });

  it("needs two answers and a correct one that is filled in", () => {
    const fewer = questionSchema.safeParse(question({ option2: "" }));
    expect(fewer.success).toBe(false);
    const pointsAtEmpty = questionSchema.safeParse(question({ option3: "Bandung", correct: "4" }));
    expect(pointsAtEmpty.success).toBe(false);
    expect(questionSchema.safeParse(question({ correct: "5" })).success).toBe(false);
    expect(questionSchema.safeParse(question({ correct: "" })).success).toBe(false);
  });

  it("keeps the time limit between 10 and 60 seconds and the points between 100 and 10,000", () => {
    for (const timeLimit of ["9", "61", "abc", "", "-5"]) expect(questionSchema.safeParse(question({ timeLimit })).success, timeLimit).toBe(false);
    for (const timeLimit of ["10", "60"]) expect(questionSchema.safeParse(question({ timeLimit })).success, timeLimit).toBe(true);
    for (const basePoints of ["99", "10001", "1.5"]) expect(questionSchema.safeParse(question({ basePoints })).success, basePoints).toBe(false);
  });

  it("limits the lengths of the texts", () => {
    expect(questionSchema.safeParse(question({ prompt: "x".repeat(301) })).success).toBe(false);
    expect(questionSchema.safeParse(question({ prompt: "   " })).success).toBe(false);
    expect(questionSchema.safeParse(question({ option1: "x".repeat(121) })).success).toBe(false);
  });
});

describe("quiz and mission forms", () => {
  it("want a quiz title", () => {
    expect(quizTitleSchema.safeParse({ title: "  " }).success).toBe(false);
    expect(quizTitleSchema.parse({ title: " Trivia " }).title).toBe("Trivia");
  });

  it("read a mission with an optional hint and code", () => {
    expect(missionSchema.parse({ title: "Selfie", hint: "", points: "100", code: "" })).toEqual({ title: "Selfie", hint: null, points: 100, code: null });
    expect(missionSchema.parse({ title: "Selfie", hint: " Near the stage ", points: "250", code: "gala-2026" })).toEqual({
      title: "Selfie",
      hint: "Near the stage",
      points: 250,
      code: "GALA2026",
    });
  });

  it("reject bad points and codes that are too short", () => {
    for (const points of ["0", "1001", "ten"]) expect(missionSchema.safeParse({ title: "x", hint: "", points, code: "" }).success, points).toBe(false);
    expect(missionSchema.safeParse({ title: "x", hint: "", points: "10", code: "abc" }).success).toBe(false);
    expect(missionSchema.safeParse({ title: "", hint: "", points: "10", code: "" }).success).toBe(false);
  });
});

describe("mission links", () => {
  const key = "a".repeat(32);

  it("end with the code, so the scanner and the phone camera both work", () => {
    expect(missionUrl(key, "GALA2026")).toMatch(new RegExp(`/hunt/${key}/GALA2026$`));
    expect(joinUrl(key)).toMatch(new RegExp(`/play/${key}$`));
  });

  it("find the code in a link, a bare code or something typed", () => {
    expect(extractMissionCode(missionUrl(key, "GALA2026"))).toBe("GALA2026");
    expect(extractMissionCode("https://example.test/hunt/abc/gala2026/")).toBe("GALA2026");
    expect(extractMissionCode(" gala-2026 ")).toBe("GALA2026");
    expect(extractMissionCode("MASCOT01")).toBe("MASCOT01");
  });

  it("find nothing in what is not a code", () => {
    expect(extractMissionCode("")).toBeNull();
    expect(extractMissionCode("   ")).toBeNull();
    expect(extractMissionCode("hi")).toBeNull();
    // an invitation QR is 64 characters long
    expect(extractMissionCode(`https://example.test/i/${"a".repeat(64)}`)).toBeNull();
    expect(extractMissionCode("x".repeat(25))).toBeNull();
  });
});

describe("game errors", () => {
  it("name the rules a host can break", () => {
    expect(classifyGameError({ code: "23514", message: "quiz_in_use" })).toBe("quiz_in_use");
    expect(classifyGameError({ code: "23514", message: "session_already_live" })).toBe("session_already_live");
    expect(classifyGameError({ code: "23514", message: "something else" })).toBe("unknown");
    expect(classifyGameError({ code: "42501", message: "forbidden" })).toBe("forbidden");
    expect(classifyGameError({ code: "23505", message: 'duplicate key value violates unique constraint "a41_hunt_missions_event_code_key"' })).toBe("duplicate_code");
    expect(classifyGameError({ code: "23505", message: 'duplicate key value violates unique constraint "other"' })).toBe("unknown");
    expect(classifyGameError({})).toBe("unknown");
  });
});
