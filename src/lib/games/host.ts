import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { huntHostBoardSchema, quizStateSchema, type HuntHostBoard, type QuizState } from "./schemas";

// What the team (owners and staff) reads for the games pages. Everything goes
// through the signed-in client, so row level security decides what comes back.

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`);
}

export interface QuizQuestionRecord {
  id: string;
  position: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
  basePoints: number;
}

export interface QuizSummary {
  id: string;
  title: string;
  questionCount: number;
  /** A quiz that has live or finished sessions is locked until its results are cleared. */
  played: boolean;
}

const questionRow = z
  .object({
    id: z.string(),
    position: z.number().int(),
    prompt: z.string(),
    options: z.array(z.string()),
    correct_index: z.number().int(),
    time_limit_seconds: z.number().int(),
    base_points: z.number().int(),
  })
  .transform(
    (row): QuizQuestionRecord => ({
      id: row.id,
      position: row.position,
      prompt: row.prompt,
      options: row.options,
      correctIndex: row.correct_index,
      timeLimit: row.time_limit_seconds,
      basePoints: row.base_points,
    }),
  );

const QUESTION_COLUMNS = "id, position, prompt, options, correct_index, time_limit_seconds, base_points";

export async function listQuizzes(eventId: string): Promise<QuizSummary[]> {
  const supabase = await createClient();
  const [quizzes, questions, sessions] = await Promise.all([
    supabase.from("a41_quizzes").select("id, title").eq("event_id", eventId).order("created_at", { ascending: true }),
    supabase.from("a41_quiz_questions").select("quiz_id").eq("event_id", eventId),
    supabase.from("a41_quiz_sessions").select("quiz_id").eq("event_id", eventId),
  ]);
  if (quizzes.error) fail("the quizzes", quizzes.error);
  if (questions.error) fail("the questions", questions.error);
  if (sessions.error) fail("the quiz sessions", sessions.error);

  const counts = new Map<string, number>();
  for (const row of questions.data ?? []) counts.set(row.quiz_id, (counts.get(row.quiz_id) ?? 0) + 1);
  const played = new Set((sessions.data ?? []).map((row) => row.quiz_id));
  return (quizzes.data ?? []).map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    questionCount: counts.get(quiz.id) ?? 0,
    played: played.has(quiz.id),
  }));
}

/** One quiz of the event with its questions in order, or null when it does not exist or is not visible. */
export async function getQuiz(eventId: string, quizId: string) {
  if (!z.uuid().safeParse(quizId).success) return null;
  const supabase = await createClient();
  const { data: quiz, error } = await supabase.from("a41_quizzes").select("id, title").eq("id", quizId).eq("event_id", eventId).maybeSingle();
  if (error) fail("the quiz", error);
  if (!quiz) return null;

  const [questions, sessions] = await Promise.all([
    supabase.from("a41_quiz_questions").select(QUESTION_COLUMNS).eq("quiz_id", quizId).order("position", { ascending: true }),
    supabase.from("a41_quiz_sessions").select("id, phase").eq("quiz_id", quizId),
  ]);
  if (questions.error) fail("the questions", questions.error);
  if (sessions.error) fail("the quiz sessions", sessions.error);
  return {
    id: quiz.id,
    title: quiz.title,
    questions: (questions.data ?? []).map((row) => questionRow.parse(row)),
    sessionCount: (sessions.data ?? []).length,
    live: (sessions.data ?? []).some((row) => row.phase !== "finished"),
  };
}

/** The address guests use for this event's games. Created the first time it is asked for. */
export async function getPlayKey(eventId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("a41_game_key", { p_event: eventId });
  if (error || typeof data !== "string") fail("the game address", error ?? { message: "no key" });
  return data;
}

/** The live quiz as the big screen shows it: the same state phones get, read straight from the database. */
export async function getHostQuizState(eventId: string): Promise<QuizState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("a41_quiz_host_state", { p_event: eventId });
  if (error) fail("the quiz", error);
  return quizStateSchema.parse(data);
}

export async function getHuntHostBoard(eventId: string): Promise<HuntHostBoard> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("a41_hunt_host_board", { p_event: eventId });
  if (error) fail("the hunt", error);
  return huntHostBoardSchema.parse(data);
}
