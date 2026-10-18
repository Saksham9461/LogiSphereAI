export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerOpenError extends Error {
  constructor(message = 'Gemini AI Circuit Breaker is OPEN due to repeated failures') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of consecutive qualifying failures to trip circuit
  cooldownMs?: number; // Time in milliseconds before transitioning from OPEN to HALF_OPEN
}

export interface CircuitBreakerStats {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  totalTrips: number;
  cooldownMs: number;
  remainingCooldownMs: number;
}

/**
 * Lightweight Circuit Breaker for Gemini API.
 * Prevents downstream thundering herds and cascading latency when Gemini is unavailable.
 */
export class AiCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private totalTrips = 0;
  private failureThreshold: number;
  private cooldownMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000;
  }

  /**
   * Check if execution is allowed.
   * Throws CircuitBreakerOpenError if the circuit is OPEN and cooldown has not elapsed.
   */
  canExecute(): boolean {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (this.lastFailureTime && now - this.lastFailureTime >= this.cooldownMs) {
        // Cooldown has elapsed -> transition to HALF_OPEN for a single probe
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Record a successful request. Resets failure counters and closes circuit if in HALF_OPEN.
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  /**
   * Record a qualifying failure.
   * Only qualifying failures (5xx, timeouts, quota exhaustion) should be recorded.
   */
  recordFailure(isQualifying = true): void {
    if (!isQualifying) return;

    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Probe failed -> trip right back to OPEN
      this.state = 'OPEN';
      this.totalTrips++;
    } else if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.totalTrips++;
    }
  }

  /**
   * Trip the circuit immediately (e.g., when daily quota exhaustion is confirmed).
   */
  tripNow(reason = 'Confirmed quota exhaustion'): void {
    this.consecutiveFailures = this.failureThreshold;
    this.lastFailureTime = Date.now();
    this.state = 'OPEN';
    this.totalTrips++;
  }

  /**
   * Current circuit state
   */
  getState(): CircuitState {
    // Dynamically check if cooldown passed
    if (this.state === 'OPEN' && this.lastFailureTime && Date.now() - this.lastFailureTime >= this.cooldownMs) {
      return 'HALF_OPEN';
    }
    return this.state;
  }

  /**
   * Get operational metrics
   */
  getStats(): CircuitBreakerStats {
    const now = Date.now();
    const currentState = this.getState();
    const remainingCooldown =
      currentState === 'OPEN' && this.lastFailureTime
        ? Math.max(0, this.cooldownMs - (now - this.lastFailureTime))
        : 0;

    return {
      state: currentState,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      totalTrips: this.totalTrips,
      cooldownMs: this.cooldownMs,
      remainingCooldownMs: remainingCooldown,
    };
  }

  /**
   * Reset the circuit breaker to closed state (useful for tests or admin override).
   */
  reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.totalTrips = 0;
  }
}

export const aiCircuitBreaker = new AiCircuitBreaker();
