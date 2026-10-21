import type { QuizState } from "@/lib/games/schemas";

/** Keeps the newer of two copies of the shared state, so a slow answer from the CDN never rewinds a screen. */
export function newerQuizState(previous: QuizState | null, next: QuizState): QuizState {
  const before = previous?.session;
  const after = next.session;
  if (!before || !after || before.id !== after.id) return next;
  return after.rev >= before.rev ? next : previous!;
}
