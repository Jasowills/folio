/**
 * Cross-package shared types for Folio v2.
 * UI-agnostic: safe to import from harness, Electron main, or renderer.
 */

export type ProviderId =
  | 'ollama'
  | 'opencode'
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'folio-cloud';

export type CapabilityTier = 'basic' | 'full';

export interface ModelCapabilityProfile {
  /** Reliable native tool-calling (function calling) */
  supportsTools: boolean;
  /** Reliable native JSON/structured-output mode */
  supportsJsonSchema: boolean;
  /** Max input tokens the adapter will send */
  contextWindow: number;
  /** Simplified UI badge: 'basic' disables multi-step agentic flows */
  tier: CapabilityTier;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Present on tool-result messages */
  toolCallId?: string;
  /** Present on assistant messages that invoked tools */
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's input */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface CompletionChunk {
  /** Incremental text delta (undefined for tool-only chunks) */
  text?: string;
  /** Tool calls issued by the model in this chunk */
  toolCalls?: ToolCall[];
  /** True when this is the final chunk of the turn */
  done: boolean;
}
