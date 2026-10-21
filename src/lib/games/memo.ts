/**
 * A tiny in-memory cache that answers many callers with one load. Within `ttlMs` of a finished load
 * everybody gets the same value; while a load is running everybody waits for that same load. So
 * however many requests arrive in the same second, one server instance asks the database once.
 * Failures are never kept. At most `maxEntries` keys are held, the oldest go first, so random keys
 * from a stranger cannot fill the memory.
 */
export class SingleFlightCache<T> {
  private readonly slots = new Map<string, { at: number; value?: T; pending?: Promise<T> }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const slot = this.slots.get(key);
    if (slot) {
      if (slot.pending) return slot.pending;
      if (this.now() - slot.at < this.ttlMs) return Promise.resolve(slot.value as T);
    }

    const pending = load().then(
      (value) => {
        this.slots.delete(key); // re-inserted last, so the map stays ordered by age
        this.slots.set(key, { at: this.now(), value });
        this.trim();
        return value;
      },
      (error: unknown) => {
        if (this.slots.get(key)?.pending === pending) this.slots.delete(key);
        throw error;
      },
    );
    this.slots.set(key, { at: this.now(), pending });
    return pending;
  }

  private trim() {
    while (this.slots.size > this.maxEntries) {
      const oldest = this.slots.keys().next().value;
      if (oldest === undefined) break;
      this.slots.delete(oldest);
    }
  }
}
