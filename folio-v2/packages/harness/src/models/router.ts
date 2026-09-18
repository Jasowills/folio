import type { ProviderId } from '@folio/shared-types';
import type { ModelAdapter } from './types.js';

const CIRCUIT_COOLDOWN_MS = 30_000;

/**
 * Model router: capability filter → circuit-breaker skip → ordered fallback.
 * Ported from Folio Cloud's AiService callWithRetry/cooldown pattern,
 * but provider-agnostic (no hardcoded if-provider branches).
 */
export class ModelRouter {
  private cooldowns = new Map<string, number>();

  constructor(private readonly adapters: ModelAdapter[]) {}

  list(): ModelAdapter[] {
    return [...this.adapters];
  }

  get(id: ProviderId): ModelAdapter | undefined {
    return this.adapters.find((a) => a.id === id);
  }

  private key(a: ModelAdapter): string {
    return `${a.id}:${a.model}`;
  }

  private isCoolingDown(a: ModelAdapter): boolean {
    return (this.cooldowns.get(this.key(a)) ?? 0) > Date.now();
  }

  markFailed(a: ModelAdapter): void {
    this.cooldowns.set(this.key(a), Date.now() + CIRCUIT_COOLDOWN_MS);
  }

  /**
   * Ordered candidates: preferred provider first (if healthy), then the
   * rest in registration order. Callers needing tool-calling or JSON mode
   * pass requirements to filter out incapable adapters.
   */
  candidates(opts?: {
    prefer?: ProviderId;
    requireTools?: boolean;
    requireJsonSchema?: boolean;
  }): ModelAdapter[] {
    const eligible = this.adapters.filter((a) => {
      if (this.isCoolingDown(a)) return false;
      if (opts?.requireTools && !a.capabilities.supportsTools) return false;
      if (opts?.requireJsonSchema && !a.capabilities.supportsJsonSchema)
        return false;
      return true;
    });
    if (!opts?.prefer) return eligible;
    return [
      ...eligible.filter((a) => a.id === opts.prefer),
      ...eligible.filter((a) => a.id !== opts.prefer),
    ];
  }
}
