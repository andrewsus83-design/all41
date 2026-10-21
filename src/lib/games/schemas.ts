import { z } from "zod";

// The shapes the database functions return (see supabase/migrations/*_a41_games.sql).
// Phones receive the same JSON the server parsed, so the types are shared; only
// the server imports the schemas, the browser imports the types.

export const QUIZ_PHASES = ["lobby", "question", "reveal", "finished"] as const;
export type QuizPhase = (typeof QUIZ_PHASES)[number];

const standingRow = z.object({
  /** A short stable id, to find yourself on a leaderboard everybody shares. */
  id: z.string(),
  rank: z.number().int(),
  name: z.string(),
  score: z.number().int(),
});

const quizStandingRow = standingRow.extend({ correct: z.number().int() });
const huntStandingRow = standingRow.extend({ missions: z.number().int() });

const quizQuestion = z.object({
  prompt: z.string(),
  options: z.array(z.string()),
  timeLimit: z.number().int(),
  basePoints: z.number().int(),
  /** Server clock, milliseconds since 1970. */
  openedAt: z.number(),
  closesAt: z.number(),
});

const quizSession = z.object({
  id: z.string(),
  /** Grows with every change, so an older copy of the state can be ignored. */
  rev: z.number().int(),
  phase: z.enum(QUIZ_PHASES),
  quizTitle: z.string(),
  questionCount: z.number().int(),
  position: z.number().int().nullable(),
  players: z.number().int(),
  answered: z.number().int().nullable(),
  question: quizQuestion.nullable(),
  reveal: z.object({ correctIndex: z.number().int(), counts: z.array(z.number().int()) }).nullable(),
  leaderboard: z.array(quizStandingRow).nullable(),
});

/** What every phone and the big screen may know about an event's quiz. */
export const quizStateSchema = z.object({ session: quizSession.nullable() });
export type QuizState = z.output<typeof quizStateSchema>;
export type QuizSession = z.output<typeof quizSession>;
export type QuizQuestion = z.output<typeof quizQuestion>;
export type QuizStanding = z.output<typeof quizStandingRow>;

/** What one guest knows about their own game. */
export const quizMeSchema = z.object({
  id: z.string(),
  name: z.string(),
  session: z
    .object({ id: z.string(), rev: z.number().int(), phase: z.enum(QUIZ_PHASES), position: z.number().int().nullable() })
    .nullable(),
  joined: z.boolean().default(false),
  score: z.number().int().default(0),
  correct: z.number().int().default(0),
  rank: z.number().int().nullable().default(null),
  players: z.number().int().default(0),
  answer: z
    .object({
      position: z.number().int(),
      choice: z.number().int(),
      // these three arrive with the reveal
      correct: z.boolean().optional(),
      points: z.number().int().optional(),
      elapsedMs: z.number().int().optional(),
    })
    .nullable()
    .default(null),
});
export type QuizMe = z.output<typeof quizMeSchema>;

export const ANSWER_REFUSALS = ["no_session", "closed", "late", "invalid_choice", "already_answered"] as const;
export const answerResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), choice: z.number().int() }),
  z.object({ ok: z.literal(false), reason: z.enum(ANSWER_REFUSALS), choice: z.number().int().optional() }),
]);
export type AnswerResult = z.output<typeof answerResultSchema>;

export const gameGuestSchema = z.object({
  name: z.string(),
  tableNo: z.string().nullable(),
  eventName: z.string(),
  eventSlug: z.string(),
  theme: z.unknown(),
  playKey: z.string(),
});
export type GameGuest = z.output<typeof gameGuestSchema>;

const mission = z.object({
  id: z.string(),
  title: z.string(),
  hint: z.string().nullable(),
  points: z.number().int(),
  done: z.boolean(),
});

export const huntBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  total: z.number().int(),
  claimed: z.number().int(),
  rank: z.number().int().nullable(),
  missions: z.array(mission),
  leaderboard: z.array(huntStandingRow),
});
export type HuntBoard = z.output<typeof huntBoardSchema>;

export const huntLeaderboardSchema = z.object({
  missions: z.number().int(),
  leaderboard: z.array(huntStandingRow),
});
export type HuntLeaderboard = z.output<typeof huntLeaderboardSchema>;
export type HuntStanding = z.output<typeof huntStandingRow>;

export const huntClaimSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("claimed"), mission: z.string(), points: z.number().int(), total: z.number().int() }),
  z.object({ status: z.literal("already_claimed"), mission: z.string(), points: z.number().int(), total: z.number().int() }),
  z.object({ status: z.literal("wrong_code"), triesLeft: z.number().int() }),
  z.object({ status: z.literal("rate_limited"), retryAfter: z.number().int() }),
]);
export type HuntClaim = z.output<typeof huntClaimSchema>;

/** The team's view of the hunt: codes included. */
export const huntHostBoardSchema = z.object({
  missions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      hint: z.string().nullable(),
      points: z.number().int(),
      code: z.string(),
      active: z.boolean(),
      found: z.number().int(),
    }),
  ),
  players: z.number().int(),
  leaderboard: z.array(huntStandingRow.extend({ missions: z.number().int() })),
});
export type HuntHostBoard = z.output<typeof huntHostBoardSchema>;
