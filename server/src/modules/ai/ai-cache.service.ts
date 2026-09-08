import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

interface CacheEntry {
  data: Record<string, unknown>;
  expiresAt: number;
}

@Injectable()
export class AiCacheService {
  private store = new Map<string, CacheEntry>();
  private pending = new Map<string, Promise<Record<string, unknown>>>();

  makeKey(system: string, user: string, model: string): string {
    return createHash('sha256')
      .update(`sys:${system}|usr:${user}|mod:${model}`)
      .digest('hex');
  }

  get(key: string): Record<string, unknown> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: Record<string, unknown>, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  getPending(key: string): Promise<Record<string, unknown>> | undefined {
    return this.pending.get(key);
  }

  setPending(key: string, promise: Promise<Record<string, unknown>>): void {
    this.pending.set(key, promise);
  }

  deletePending(key: string): void {
    this.pending.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.pending.clear();
  }
}
