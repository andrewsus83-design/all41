import { describe, expect, it } from "vitest";
import {
  EMPTY_WALL,
  WALL_MOSAIC_SIZE,
  advance,
  applyFeed,
  mosaicGrid,
  mosaicOf,
  parseWallPoll,
  type WallPhoto,
} from "./wall-rotation";

const photo = (n: number): WallPhoto => ({ id: `p${n}`, path: `e/${n}.webp`, approvedAt: `2026-10-21T19:${String(n).padStart(2, "0")}:00Z` });
// The feed lists the newest first.
const feed = (...numbers: number[]) => numbers.map(photo);

describe("the wall rotation", () => {
  it("starts at the newest photo and does not treat the first look as news", () => {
    const state = applyFeed(EMPTY_WALL, feed(3, 2, 1));
    expect(state.currentId).toBe("p3");
    expect(state.fresh).toEqual([]);
  });

  it("stays empty while there is nothing to show", () => {
    const state = applyFeed(EMPTY_WALL, []);
    expect(state.currentId).toBeNull();
    expect(advance(state).currentId).toBeNull();
  });

  it("goes round the album from the newest to the oldest and starts over", () => {
    let state = applyFeed(EMPTY_WALL, feed(3, 2, 1));
    const order = [state.currentId];
    for (let i = 0; i < 3; i++) {
      state = advance(state);
      order.push(state.currentId);
    }
    expect(order).toEqual(["p3", "p2", "p1", "p3"]);
  });

  it("shows new photos first, in the order they were approved, then goes on where it was", () => {
    let state = applyFeed(EMPTY_WALL, feed(3, 2, 1));
    state = advance(state); // p2 is in the spotlight
    state = applyFeed(state, feed(5, 4, 3, 2, 1));
    expect(state.currentId).toBe("p2");
    expect(state.fresh).toEqual(["p4", "p5"]);
    state = advance(state);
    expect(state.currentId).toBe("p4");
    state = advance(state);
    expect(state.currentId).toBe("p5");
    expect(state.fresh).toEqual([]);
    state = advance(state);
    expect(state.currentId).toBe("p4");
  });

  it("does not show the same photo as new twice", () => {
    let state = applyFeed(EMPTY_WALL, feed(2, 1));
    state = applyFeed(state, feed(3, 2, 1));
    state = advance(state);
    expect(state.currentId).toBe("p3");
    state = applyFeed(state, feed(3, 2, 1));
    expect(state.fresh).toEqual([]);
  });

  it("moves on at once when the photo in the spotlight is taken down", () => {
    let state = applyFeed(EMPTY_WALL, feed(3, 2, 1));
    state = advance(state);
    expect(state.currentId).toBe("p2");
    state = applyFeed(state, feed(3, 1));
    expect(state.currentId).not.toBe("p2");
    expect(["p3", "p1"]).toContain(state.currentId);
  });

  it("forgets a new photo that was taken down before it was shown", () => {
    let state = applyFeed(EMPTY_WALL, feed(2, 1));
    state = applyFeed(state, feed(3, 2, 1));
    expect(state.fresh).toEqual(["p3"]);
    state = applyFeed(state, feed(2, 1));
    expect(state.fresh).toEqual([]);
  });

  it("starts at the newest photo when the first photos arrive after an empty start", () => {
    let state = applyFeed(EMPTY_WALL, []);
    state = applyFeed(state, feed(2, 1));
    expect(state.currentId).toBe("p2");
  });
});

describe("the mosaic", () => {
  it("shows the newest photos only", () => {
    const many = feed(...Array.from({ length: 30 }, (_, index) => 30 - index));
    const shown = mosaicOf(many);
    expect(shown).toHaveLength(WALL_MOSAIC_SIZE);
    expect(shown[0]?.id).toBe("p30");
  });

  it.each([
    [4, 2, 2, 1],
    [5, 2, 3, 2],
    [6, 2, 3, 1],
    [8, 2, 4, 1],
    [9, 3, 3, 1],
    [10, 3, 4, 3],
    [11, 3, 4, 2],
    [12, 3, 4, 1],
  ])("lays %i photos out in %i columns and %i rows, the last one spanning %i", (count, columns, rows, lastSpan) => {
    expect(mosaicGrid(count)).toEqual({ columns, rows, lastSpan });
  });

  it("fills every cell of the grid", () => {
    for (let count = 4; count <= WALL_MOSAIC_SIZE; count++) {
      const { columns, rows, lastSpan } = mosaicGrid(count);
      expect(count - 1 + lastSpan).toBe(rows * columns);
    }
  });
});

describe("reading the feed route's answer", () => {
  it("accepts a feed", () => {
    expect(parseWallPoll({ enabled: true, total: 1, photos: [{ id: "a", path: "e/a.webp", approvedAt: "2026-10-21T19:00:00Z" }] })).toEqual({
      enabled: true,
      total: 1,
      photos: [{ id: "a", path: "e/a.webp", approvedAt: "2026-10-21T19:00:00Z" }],
    });
  });

  it("refuses anything else", () => {
    expect(parseWallPoll(null)).toBeNull();
    expect(parseWallPoll("feed")).toBeNull();
    expect(parseWallPoll({ error: "not_found" })).toBeNull();
    expect(parseWallPoll({ enabled: true, total: 1, photos: [{ id: 1 }] })).toBeNull();
    expect(parseWallPoll({ enabled: "yes", total: 1, photos: [] })).toBeNull();
  });
});
