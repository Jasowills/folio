import type { z } from 'zod';
import type {
  ChatMessage,
  CompletionChunk,
  ProviderId,
  ToolDefinition,
} from '@folio/shared-types';
import type { ModelRouter } from './models/router.js';
import type { CompleteParams, ModelAdapter } from './models/types.js';

/** Max chained tool calls per user turn — prevents runaway loops (spec §4.3). */
export const MAX_TOOL_CALLS_PER_TURN = 8;
/** Structured-output repair attempts on the SAME adapter before failover. */
export const MAX_SCHEMA_REPAIRS = 2;

export interface StructuredResult<T> {
  value: T;
  adapterId: string;
  model: string;
  repairs: number;
}

/** Strip ```json fences / "{"...}" wrapping — then JSON.parse. */
export function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      text = JSON.parse(text) as string;
    } catch {
      /* keep as-is */
    }
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

function repairPromptHint(errorMessage: string): string {
  return (
    `Your last output failed schema validation: ${errorMessage}. ` +
    `Return corrected JSON only — no prose, no fences.`
  );
}

async function collect(adapter: ModelAdapter, params: CompleteParams): Promise<string> {
  let text = '';
  let toolCalls: CompletionChunk['toolCalls'];
  for await (const chunk of adapter.complete(params)) {
    if (chunk.text) text += chunk.text;
    if (chunk.toolCalls?.length) toolCalls = chunk.toolCalls;
  }
  if (toolCalls?.length) {
    throw new Error(
      `chatStructured: adapter ${adapter.id} returned tool calls instead of JSON`,
    );
  }
  return text;
}

/**
 * Structured completion with the spec §4.3 reliability layer:
 * zod-validate every output → re-prompt SAME adapter with the validation
 * error (max MAX_SCHEMA_REPAIRS) → fail over to next capable adapter.
 */
export async function chatStructured<T>(
  router: ModelRouter,
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  opts?: {
    prefer?: ProviderId;
    tools?: ToolDefinition[];
    maxTokens?: number;
  },
): Promise<StructuredResult<T>> {
  const candidates = router.candidates({
    prefer: opts?.prefer,
    requireJsonSchema: false, // JSON enforced via prompt+validation, not native mode
  });
  if (!candidates.length) {
    throw new Error('chatStructured: no healthy adapters available');
  }
  let lastError: unknown = null;
  for (const adapter of candidates) {
    let attemptMessages = messages;
    for (let repair = 0; repair <= MAX_SCHEMA_REPAIRS; repair++) {
      try {
        const raw = await collect(adapter, {
          messages: attemptMessages,
          tools: opts?.tools,
          responseSchema: schema,
          maxTokens: opts?.maxTokens,
        });
        let decoded: unknown = raw;
        try {
          decoded = extractJson(raw);
        } catch {
          /* keep raw text — schema validation will report the mismatch */
        }
        const parsed = schema.safeParse(decoded);
        if (parsed.success) {
          return { value: parsed.data, adapterId: adapter.id, model: adapter.model, repairs: repair };
        }
        lastError = parsed.error.message;
        attemptMessages = [
          ...attemptMessages,
          { role: 'assistant' as const, content: raw },
          { role: 'user' as const, content: repairPromptHint(parsed.error.message) },
        ];
      } catch (err) {
        lastError = err;
        break; // transport/tool error → fail over, don't repair-loop
      }
    }
    router.markFailed(adapter);
  }
  throw new Error(
    `chatStructured: all adapters exhausted. Last error: ${String(lastError).slice(0, 500)}`,
  );
}

/**
 * Plain-text completion with ordered fallback (no structured validation).
 */
export async function chatText(
  router: ModelRouter,
  messages: ChatMessage[],
  opts?: { prefer?: ProviderId; maxTokens?: number },
): Promise<{ text: string; adapterId: string; model: string }> {
  const candidates = router.candidates({ prefer: opts?.prefer });
  if (!candidates.length) throw new Error('chatText: no healthy adapters available');
  let lastError: unknown = null;
  for (const adapter of candidates) {
    try {
      const text = await collect(adapter, { messages, maxTokens: opts?.maxTokens });
      return { text, adapterId: adapter.id, model: adapter.model };
    } catch (err) {
      lastError = err;
      router.markFailed(adapter);
    }
  }
  throw new Error(`chatText: all adapters exhausted. Last error: ${String(lastError).slice(0, 500)}`);
}

/**
 * Capability-based feature gating (spec §4.3): multi-step agentic flows
 * (autonomous tool chains) require a 'full'-tier adapter. The UI surfaces
 * the badge so disabled flows read as intentional, not broken.
 */
export function canUseAgenticFlows(adapter: ModelAdapter): boolean {
  return adapter.capabilities.tier === 'full' && adapter.capabilities.supportsTools;
}

export function describeCapabilities(adapter: ModelAdapter): string {
  const c = adapter.capabilities;
  return `${adapter.id} · ${adapter.model} [${c.tier === 'full' ? 'full agentic' : 'basic'}]` +
    ` tools:${c.supportsTools ? 'yes' : 'no'} json:${c.supportsJsonSchema ? 'yes' : 'no'}`;
}
