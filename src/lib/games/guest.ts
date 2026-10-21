import "server-only";

import type { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  answerResultSchema,
  gameGuestSchema,
  huntBoardSchema,
  huntClaimSchema,
  quizMeSchema,
  type AnswerResult,
  type GameGuest,
  type HuntBoard,
  type HuntClaim,
  type QuizMe,
} from "./schemas";

// What a guest does, as the guest: the anonymous role plus the invitation token.
// Every function returns null for a token that is unknown or whose event is not
// published, and the callers answer both with the same 404.

/** The invitation token is 64 hex characters; anything else never reaches the database. */
export const isTokenShaped = (token: string) => /^[0-9a-f]{64}$/.test(token);

async function call<S extends z.ZodType>(fn: string, args: Record<string, unknown>, schema: S): Promise<z.output<S> | null> {
  const { data, error } = await createAnonClient().rpc(fn, args);
  if (error) throw new Error(`Could not call ${fn}: ${error.message}`);
  return data === null || data === undefined ? null : schema.parse(data);
}

export const getGameGuest = (token: string): Promise<GameGuest | null> =>
  isTokenShaped(token) ? call("a41_game_guest", { p_token: token }, gameGuestSchema) : Promise.resolve(null);

export const joinQuiz = (token: string): Promise<QuizMe | null> =>
  isTokenShaped(token) ? call("a41_quiz_join", { p_token: token }, quizMeSchema) : Promise.resolve(null);

export const getQuizMe = (token: string): Promise<QuizMe | null> =>
  isTokenShaped(token) ? call("a41_quiz_me", { p_token: token }, quizMeSchema) : Promise.resolve(null);

export const submitQuizAnswer = (token: string, position: number, choice: number): Promise<AnswerResult | null> =>
  isTokenShaped(token)
    ? call("a41_quiz_answer", { p_token: token, p_position: position, p_choice: choice }, answerResultSchema)
    : Promise.resolve(null);

export const getHuntBoard = (token: string): Promise<HuntBoard | null> =>
  isTokenShaped(token) ? call("a41_hunt_board", { p_token: token }, huntBoardSchema) : Promise.resolve(null);

export const claimMission = (token: string, code: string): Promise<HuntClaim | null> =>
  isTokenShaped(token) ? call("a41_hunt_claim", { p_token: token, p_code: code.slice(0, 200) }, huntClaimSchema) : Promise.resolve(null);
