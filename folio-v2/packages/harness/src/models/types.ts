import type { z } from 'zod';
import type {
  ChatMessage,
  CompletionChunk,
  ModelCapabilityProfile,
  ProviderId,
  ToolDefinition,
} from '@folio/shared-types';

export type { ProviderId };

export interface CompleteParams {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  /** When set, the adapter should request native JSON mode (if supported). */
  responseSchema?: z.ZodType<unknown>;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Unified model interface — the harness never branches on provider identity.
 * Spec §4.2. Pure Node/TS, no UI/Electron coupling.
 */
export interface ModelAdapter {
  readonly id: ProviderId;
  readonly model: string;
  readonly capabilities: ModelCapabilityProfile;
  complete(params: CompleteParams): AsyncIterable<CompletionChunk>;
}

export interface AdapterConfig {
  id: ProviderId;
  model: string;
  baseUrl: string;
  apiKey?: string;
  capabilities: ModelCapabilityProfile;
  /** Extra headers (e.g. OpenRouter HTTP-Referer / X-Title) */
  headers?: Record<string, string>;
  requestTimeoutMs?: number;
}
