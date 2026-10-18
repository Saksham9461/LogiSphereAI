/**
 * SingleFlight / Request Coalescing Coordinator
 *
 * Ensures that if multiple concurrent requests arrive with the exact same
 * computation key (cache miss), only ONE actual call to the Gemini provider
 * is executed. All subsequent callers await the same Promise in-flight.
 *
 * Guarantees:
 * 1. Thread-safe in Node.js event loop.
 * 2. Unregisters from in-flight registry immediately upon resolution OR rejection.
 * 3. Never permanently locks out future attempts after a failure.
 * 4. Respects tenant / user boundary because the key incorporates isolation context.
 */
export class SingleFlightCoordinator {
  private inFlight = new Map<string, Promise<any>>();
  private totalExecuted = 0;
  private totalCoalesced = 0;

  /**
   * Execute an async task or join an existing in-flight task for the given key.
   */
  async do<T>(key: string, fn: () => Promise<T>): Promise<{ result: T; wasCoalesced: boolean }> {
    const existing = this.inFlight.get(key);
    if (existing) {
      this.totalCoalesced++;
      const result = await existing;
      return { result, wasCoalesced: true };
    }

    this.totalExecuted++;
    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);

    const result = await promise;
    return { result, wasCoalesced: false };
  }

  /**
   * Current number of concurrent in-flight computations.
   */
  get inFlightCount(): number {
    return this.inFlight.size;
  }

  /**
   * Stats on coalesced requests.
   */
  getStats(): { totalExecuted: number; totalCoalesced: number; inFlightCount: number } {
    return {
      totalExecuted: this.totalExecuted,
      totalCoalesced: this.totalCoalesced,
      inFlightCount: this.inFlight.size,
    };
  }

  /**
   * Reset stats (useful for tests).
   */
  reset(): void {
    this.inFlight.clear();
    this.totalExecuted = 0;
    this.totalCoalesced = 0;
  }
}

export const singleFlight = new SingleFlightCoordinator();
