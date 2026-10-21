/**
 * Points for a correct quiz answer: the full base for an instant answer,
 * falling in a straight line to half the base at the deadline.
 *
 * The database computes this when an answer arrives (a41_private.quiz_points);
 * this copy only explains the rule on screen. A test keeps the two equal, which
 * is why it uses whole numbers and no floating point.
 */
export function quizPoints(base: number, elapsedMs: number, limitSeconds: number): number {
  const limitMs = limitSeconds * 1000;
  const elapsed = Math.min(Math.max(Math.trunc(elapsedMs), 0), limitMs);
  return Math.floor((base * (2 * limitMs - elapsed) + limitMs) / (2 * limitMs));
}

/** The least a correct answer can earn, for the "100 to 200 points" hint on a question. */
export const minimumQuizPoints = (base: number) => Math.floor((base + 1) / 2);
