interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

/**
 * Bounded in-memory TTL cache with oldest-entry eviction.
 * Keeps advisory responses fast and avoids redundant upstream Gemini calls.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs: number, maxEntries: number) {
    this.ttlMs = ttlMs;
    this.maxEntries = Math.max(1, maxEntries);
  }

  /** Retrieves a non-expired value, deleting stale entries lazily. */
  get(key: string, now = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /** Inserts or refreshes a cached entry, evicting the oldest key if at capacity. */
  set(key: string, value: T, now = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      expiresAt: now + this.ttlMs,
      value,
    });
  }

  /** Removes all cached entries. */
  clear(): void {
    this.store.clear();
  }

  /** Returns the current number of entries held in the cache. */
  get size(): number {
    return this.store.size;
  }
}
