interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  isRateLimited(identifier: string, limit = 60, windowMs = 60000): boolean {
    const now = Date.now();
    const tracker = this.rateLimitMap.get(identifier);

    if (!tracker || now > tracker.resetTime) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (tracker.count >= limit) {
      return true;
    }

    tracker.count++;
    return false;
  }
}

export const cache = new MemoryCache();