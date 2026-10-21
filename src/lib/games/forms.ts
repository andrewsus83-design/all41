import { z } from "zod";
import { normalizeMissionCode } from "./links";

// What the dashboard forms send, checked before the database checks it again.

export const quizTitleSchema = z.object({
  title: z.string().trim().min(1, "Give the quiz a title.").max(120, "Keep the title under 120 characters."),
});

const OPTION_FIELDS = ["option1", "option2", "option3", "option4"] as const;

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `Enter a whole number for ${label}.`)
    .transform(Number)
    .pipe(z.number().min(min, `${label} is at least ${min}.`).max(max, `${label} is at most ${max}.`));

/**
 * A question as the form sends it: four optional answer boxes and the number of the correct one.
 * Empty boxes are dropped, and the correct answer follows its text to its new place.
 */
export const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, "Write the question.").max(300, "Keep the question under 300 characters."),
    option1: z.string().trim().max(120, "Keep each answer under 120 characters.").default(""),
    option2: z.string().trim().max(120, "Keep each answer under 120 characters.").default(""),
    option3: z.string().trim().max(120, "Keep each answer under 120 characters.").default(""),
    option4: z.string().trim().max(120, "Keep each answer under 120 characters.").default(""),
    correct: z.enum(["1", "2", "3", "4"], "Mark the correct answer."),
    timeLimit: wholeNumber("the time limit", 10, 60),
    basePoints: wholeNumber("the points", 100, 10000),
  })
  .transform((value, context) => {
    const filled = OPTION_FIELDS.map((field, index) => ({ text: value[field], index })).filter((option) => option.text !== "");
    if (filled.length < 2) {
      context.addIssue({ code: "custom", path: ["option2"], message: "Give at least two answers." });
      return z.NEVER;
    }
    const correctIndex = filled.findIndex((option) => option.index === Number(value.correct) - 1);
    if (correctIndex === -1) {
      context.addIssue({ code: "custom", path: ["correct"], message: "The correct answer must be one of the answers you filled in." });
      return z.NEVER;
    }
    return {
      prompt: value.prompt,
      options: filled.map((option) => option.text),
      correctIndex,
      timeLimit: value.timeLimit,
      basePoints: value.basePoints,
    };
  });
export type QuestionInput = z.output<typeof questionSchema>;

export const missionSchema = z.object({
  title: z.string().trim().min(1, "Name the mission.").max(80, "Keep the name under 80 characters."),
  hint: z
    .string()
    .trim()
    .max(200, "Keep the hint under 200 characters.")
    .transform((hint) => hint || null),
  points: wholeNumber("the points", 1, 1000),
  code: z
    .string()
    .trim()
    .transform(normalizeMissionCode)
    .refine((code) => code === "" || /^[A-Z0-9]{6,24}$/.test(code), "A code is 6 to 24 letters and digits.")
    .transform((code) => code || null),
});
export type MissionInput = z.output<typeof missionSchema>;
