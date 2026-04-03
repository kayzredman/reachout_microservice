import { Injectable, Logger } from '@nestjs/common';

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

interface ResilientFetchOptions extends RequestInit {
  /** Max retry attempts (default: 3) */
  retries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
}

/**
 * HTTP client with circuit breaker + exponential backoff retry.
 * Use for all service-to-service REST calls.
 */
@Injectable()
export class ResilientHttpService {
  private readonly logger = new Logger('ResilientHttp');
  private circuits = new Map<string, CircuitState>();

  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIMEOUT = 30_000; // 30s before half-open

  private getCircuit(host: string): CircuitState {
    if (!this.circuits.has(host)) {
      this.circuits.set(host, { failures: 0, lastFailure: 0, state: 'closed' });
    }
    return this.circuits.get(host)!;
  }

  private extractHost(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  }

  async fetch(url: string, options: ResilientFetchOptions = {}): Promise<Response> {
    const { retries = 3, baseDelay = 1000, timeout = 10_000, ...fetchOpts } = options;
    const host = this.extractHost(url);
    const circuit = this.getCircuit(host);

    // Check circuit state
    if (circuit.state === 'open') {
      if (Date.now() - circuit.lastFailure > this.RECOVERY_TIMEOUT) {
        circuit.state = 'half-open';
        this.logger.log(`Circuit half-open for ${host}, allowing probe request`);
      } else {
        throw new Error(`Circuit breaker OPEN for ${host} — service unavailable`);
      }
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOpts,
          signal: controller.signal,
        });

        clearTimeout(timer);

        // Success — reset circuit
        if (circuit.state === 'half-open' || circuit.failures > 0) {
          circuit.failures = 0;
          circuit.state = 'closed';
          this.logger.log(`Circuit closed for ${host}`);
        }

        return response;
      } catch (err: any) {
        lastError = err;

        // Record failure
        circuit.failures++;
        circuit.lastFailure = Date.now();

        if (circuit.failures >= this.FAILURE_THRESHOLD) {
          circuit.state = 'open';
          this.logger.warn(
            `Circuit OPEN for ${host} after ${circuit.failures} failures`,
          );
        }

        if (attempt < retries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
          this.logger.warn(
            `Request to ${host} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${Math.round(delay)}ms: ${err.message}`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError ?? new Error(`Request to ${host} failed after ${retries + 1} attempts`);
  }

  /** Convenience: GET JSON from a service */
  async getJson<T = any>(url: string, options: ResilientFetchOptions = {}): Promise<T> {
    const res = await this.fetch(url, { ...options, method: 'GET' });
    if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
    return res.json() as Promise<T>;
  }

  /** Convenience: POST JSON to a service */
  async postJson<T = any>(
    url: string,
    body: unknown,
    options: ResilientFetchOptions = {},
  ): Promise<T> {
    const res = await this.fetch(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers as any },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${url} returned ${res.status}`);
    return res.json() as Promise<T>;
  }
}
