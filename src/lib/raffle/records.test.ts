import { describe, expect, it } from "vitest";
import { unseenDraw, winnersOf, type RaffleLogEntry, type RafflePrize, type StageState, type StageWinner } from "./records";

const prize = (id: string, quantity: number, awarded: number): RafflePrize => ({ id, name: `Prize ${id}`, quantity, awarded, sortOrder: 0 });

const winner = (drawId: string, prizeId: string, name: string): StageWinner => ({
  drawId,
  prizeId,
  prizeName: `Prize ${prizeId}`,
  name,
  tableNo: "7",
  drawnAt: "2026-12-05T12:00:00Z",
});

const entry = (id: string, status: "won" | "forfeited"): RaffleLogEntry => ({
  id,
  status,
  prizeId: "p1",
  prizeName: "Prize p1",
  guestName: `Guest ${id}`,
  guestTableNo: null,
  drawnAt: "2026-12-05T12:00:00Z",
  drawnBy: null,
  resolvedAt: status === "forfeited" ? "2026-12-05T12:05:00Z" : null,
  resolvedBy: null,
});

describe("winnersOf", () => {
  it("lists draws that took the prize and leaves out the absent ones, in the order of the log", () => {
    expect(winnersOf([entry("c", "won"), entry("b", "forfeited"), entry("a", "won")]).map((w) => w.drawId)).toEqual(["c", "a"]);
  });
});

describe("unseenDraw", () => {
  const state = (winners: StageWinner[], prizes = [prize("p1", 3, winners.length)]): StageState => ({ prizes, remaining: 40, winners });

  it("finds the draw whose answer was lost, so the screen reveals it instead of drawing again", () => {
    const missed = unseenDraw(["a"], state([winner("b", "p1", "Dewi"), winner("a", "p1", "Budi")]));
    expect(missed).toMatchObject({
      drawId: "b",
      winner: { name: "Dewi", tableNo: "7", tags: [] },
      prize: { id: "p1", quantity: 3, awarded: 2 },
      remaining: 40,
      decoys: [],
    });
  });

  it("finds nothing when the screen already knows every winner, because the request never arrived", () => {
    expect(unseenDraw(["a", "b"], state([winner("b", "p1", "Dewi"), winner("a", "p1", "Budi")]))).toBeUndefined();
  });

  it("takes the newest when more than one was missed", () => {
    expect(unseenDraw([], state([winner("c", "p1", "Citra"), winner("b", "p1", "Dewi")]))?.drawId).toBe("c");
  });

  it("does not invent a draw for a prize that is gone", () => {
    expect(unseenDraw([], state([winner("x", "gone", "Eko")]))).toBeUndefined();
  });
});
