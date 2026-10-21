import type { DbError } from "@/lib/db-errors";

/**
 * The failures a host can cause and fix while setting up or running games.
 * The names are the rule names the migration raises; a test against the real
 * schema keeps them equal.
 */
export type GameFailure =
  | "quiz_in_use"
  | "quiz_has_no_questions"
  | "quiz_limit"
  | "quiz_too_long"
  | "invalid_options"
  | "session_already_live"
  | "invalid_transition"
  | "stale_question"
  | "mission_limit"
  | "duplicate_code"
  | "forbidden"
  | "unknown";

const RULES = new Set<GameFailure>([
  "quiz_in_use",
  "quiz_has_no_questions",
  "quiz_limit",
  "quiz_too_long",
  "invalid_options",
  "session_already_live",
  "invalid_transition",
  "stale_question",
  "mission_limit",
]);

export function classifyGameError(error: DbError): GameFailure {
  const message = error.message ?? "";
  switch (error.code) {
    case "23505":
      return /a41_hunt_missions_event_code_key/.test(message) ? "duplicate_code" : "unknown";
    case "23514":
      return RULES.has(message as GameFailure) ? (message as GameFailure) : "unknown";
    case "42501":
      return "forbidden";
    default:
      return "unknown";
  }
}

export const GAME_FAILURE_MESSAGES: Record<GameFailure, string> = {
  quiz_in_use: "This quiz has already been played, so its questions are locked. Clear its results first, or make a new quiz.",
  quiz_has_no_questions: "Add at least one question before going live.",
  quiz_limit: "An event can have up to 10 quizzes.",
  quiz_too_long: "A quiz can have up to 50 questions.",
  invalid_options: "Every answer needs 1 to 120 characters.",
  session_already_live: "A quiz is already live for this event. Finish it first.",
  invalid_transition: "That does not fit where the quiz is right now. The screen has been refreshed.",
  stale_question: "The quiz had already moved on. The screen has been refreshed.",
  mission_limit: "A hunt can have up to 50 missions.",
  duplicate_code: "Another mission of this event already uses that code.",
  forbidden: "You are not allowed to do that.",
  unknown: "Something went wrong on our side. Please try again.",
};
