import type {
  ChatMessage,
  CompletionChunk,
  ToolCall,
  ToolDefinition,
} from '@folio/shared-types';
import type { AdapterConfig, CompleteParams, ModelAdapter } from './types.js';

/**
 * Base adapter speaking OpenAI-compatible POST {baseUrl}/chat/completions.
 * Covers Ollama, OpenCode (if OpenAI-compatible — confirm per spec §11),
 * OpenAI, Gemini (OpenAI-compatible endpoint), Anthropic (via its
 * OpenAI-compatible Messages shim) — with per-provider config differences.
 * Non-streaming request re-emitted as a single final chunk (streaming
 * upgrade is a later optimization; interface already supports chunks).
 */

interface OpenAIChoice {
  message?: {
    content?: string | null;
    tool_calls?: Array<{
      id?: string;
      function?: { name?: string; arguments?: string };
    }>;
  };
  finish_reason?: string;
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
  usage?: { total_tokens?: number };
  error?: { message?: string };
}

let toolCallSeq = 0;

function toOpenAITools(tools?: ToolDefinition[]) {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

function toOpenAIMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'tool' as const, content: m.content, tool_call_id: m.toolCallId };
    }
    if (m.toolCalls?.length) {
      return {
        role: 'assistant' as const,
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }
    return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
  });
}

export class OpenAICompatibleAdapter implements ModelAdapter {
  readonly id: AdapterConfig['id'];
  readonly model: string;
  readonly capabilities: AdapterConfig['capabilities'];
  private readonly config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
    this.id = config.id;
    this.model = config.model;
    this.capabilities = config.capabilities;
  }

  async *complete(params: CompleteParams): AsyncIterable<CompletionChunk> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: toOpenAIMessages(params.messages),
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.3,
    };
    const tools = this.capabilities.supportsTools
      ? toOpenAITools(params.tools)
      : undefined;
    if (tools) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    if (params.responseSchema && this.capabilities.supportsJsonSchema) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs ?? 60_000,
    );
    try {
      const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.config.apiKey
            ? { authorization: `Bearer ${this.config.apiKey}` }
            : {}),
          ...this.config.headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `Provider ${this.id} (${this.model}) HTTP ${res.status}: ${text.slice(0, 300)}`,
        );
      }
      const json = (await res.json()) as OpenAIResponse;
      if (json.error) throw new Error(`Provider ${this.id}: ${json.error.message}`);
      const msg = json.choices?.[0]?.message;
      const toolCalls: ToolCall[] | undefined = msg?.tool_calls?.map((tc) => ({
        id: tc.id ?? `call_${++toolCallSeq}`,
        name: tc.function?.name ?? '',
        arguments: tc.function?.arguments ?? '{}',
      }));
      yield {
        text: typeof msg?.content === 'string' ? msg.content : undefined,
        toolCalls,
        done: true,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
