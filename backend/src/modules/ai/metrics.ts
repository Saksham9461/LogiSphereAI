export interface AiMetricsSnapshot {
  totalAiOperations: number;
  cacheHits: number;
  cacheMisses: number;
  coalescedRequests: number;
  estimatedCallsSaved: number;
  geminiCallsAttempted: number;
  geminiCallsSucceeded: number;
  geminiCallsFailed: number;
  retriesExecuted: number;
  rateLimitsEncountered: number;
  quotaExhaustedCount: number;
  circuitBreakerTrips: number;
  fallbacksServed: number;
  avgLatencyMs: number;
  uptimeSeconds: number;
}

export class AiMetricsService {
  private startTime = Date.now();
  private totalAiOperations = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private coalescedRequests = 0;
  private geminiCallsAttempted = 0;
  private geminiCallsSucceeded = 0;
  private geminiCallsFailed = 0;
  private retriesExecuted = 0;
  private rateLimitsEncountered = 0;
  private quotaExhaustedCount = 0;
  private circuitBreakerTrips = 0;
  private fallbacksServed = 0;
  private totalLatencyMs = 0;
  private latencyCount = 0;

  recordOperation(isCacheHit: boolean, wasCoalesced: boolean): void {
    this.totalAiOperations++;
    if (isCacheHit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    if (wasCoalesced) {
      this.coalescedRequests++;
    }
  }

  recordGeminiAttempt(): void {
    this.geminiCallsAttempted++;
  }

  recordGeminiSuccess(latencyMs: number): void {
    this.geminiCallsSucceeded++;
    this.totalLatencyMs += latencyMs;
    this.latencyCount++;
  }

  recordGeminiFailure(isQuotaExhausted = false, isRateLimited = false): void {
    this.geminiCallsFailed++;
    if (isQuotaExhausted) {
      this.quotaExhaustedCount++;
    }
    if (isRateLimited) {
      this.rateLimitsEncountered++;
    }
  }

  recordRetry(): void {
    this.retriesExecuted++;
  }

  recordCircuitTrip(): void {
    this.circuitBreakerTrips++;
  }

  recordFallback(): void {
    this.fallbacksServed++;
  }

  getSnapshot(): AiMetricsSnapshot {
    const estimatedSaved = this.cacheHits + this.coalescedRequests;
    const avgLatency = this.latencyCount > 0 ? Math.round(this.totalLatencyMs / this.latencyCount) : 0;
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    return {
      totalAiOperations: this.totalAiOperations,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      coalescedRequests: this.coalescedRequests,
      estimatedCallsSaved: estimatedSaved,
      geminiCallsAttempted: this.geminiCallsAttempted,
      geminiCallsSucceeded: this.geminiCallsSucceeded,
      geminiCallsFailed: this.geminiCallsFailed,
      retriesExecuted: this.retriesExecuted,
      rateLimitsEncountered: this.rateLimitsEncountered,
      quotaExhaustedCount: this.quotaExhaustedCount,
      circuitBreakerTrips: this.circuitBreakerTrips,
      fallbacksServed: this.fallbacksServed,
      avgLatencyMs: avgLatency,
      uptimeSeconds: uptime,
    };
  }

  reset(): void {
    this.startTime = Date.now();
    this.totalAiOperations = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.coalescedRequests = 0;
    this.geminiCallsAttempted = 0;
    this.geminiCallsSucceeded = 0;
    this.geminiCallsFailed = 0;
    this.retriesExecuted = 0;
    this.rateLimitsEncountered = 0;
    this.quotaExhaustedCount = 0;
    this.circuitBreakerTrips = 0;
    this.fallbacksServed = 0;
    this.totalLatencyMs = 0;
    this.latencyCount = 0;
  }
}

export const aiMetrics = new AiMetricsService();
