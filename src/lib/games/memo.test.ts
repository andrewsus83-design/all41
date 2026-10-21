import { describe, expect, it } from "vitest";
import { SingleFlightCache } from "./memo";

function clock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("SingleFlightCache", () => {
  it("runs one load for any number of callers at the same moment", async () => {
    const time = clock();
    const cache = new SingleFlightCache<number>(1000, 10, time.now);
    let loads = 0;
    const load = async () => {
      loads += 1;
      await Promise.resolve();
      return loads;
    };
    const answers = await Promise.all(Array.from({ length: 500 }, () => cache.get("a", load)));
    expect(loads).toBe(1);
    expect(new Set(answers)).toEqual(new Set([1]));
  });

  it("keeps the value for the ttl and loads again after it", async () => {
    const time = clock();
    const cache = new SingleFlightCache<number>(1000, 10, time.now);
    let loads = 0;
    const load = async () => ++loads;
    expect(await cache.get("a", load)).toBe(1);
    time.advance(999);
    expect(await cache.get("a", load)).toBe(1);
    time.advance(2);
    expect(await cache.get("a", load)).toBe(2);
  });

  it("keeps keys apart, and a null answer is an answer too", async () => {
    const cache = new SingleFlightCache<string | null>(1000, 10, clock().now);
    expect(await cache.get("a", async () => "x")).toBe("x");
    expect(await cache.get("b", async () => null)).toBeNull();
    expect(await cache.get("b", async () => "never loaded")).toBeNull();
  });

  it("never keeps a failure: everybody waiting sees it, the next call tries again", async () => {
    const cache = new SingleFlightCache<number>(1000, 10, clock().now);
    let calls = 0;
    const failing = async () => {
      calls += 1;
      throw new Error("down");
    };
    const results = await Promise.allSettled([cache.get("a", failing), cache.get("a", failing)]);
    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(calls).toBe(1);
    expect(await cache.get("a", async () => 7)).toBe(7);
  });

  it("holds at most maxEntries keys, the oldest go first", async () => {
    const time = clock();
    const cache = new SingleFlightCache<number>(10_000, 3, time.now);
    let loads = 0;
    for (const key of ["a", "b", "c", "d"]) {
      await cache.get(key, async () => ++loads);
      time.advance(1);
    }
    expect(loads).toBe(4);
    await cache.get("d", async () => ++loads); // still cached
    expect(loads).toBe(4);
    await cache.get("a", async () => ++loads); // was evicted, loads again
    expect(loads).toBe(5);
  });
});
