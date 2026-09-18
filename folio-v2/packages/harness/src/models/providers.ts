import type { ModelCapabilityProfile, ProviderId } from '@folio/shared-types';
import { OpenAICompatibleAdapter } from './openai-compatible.js';
import type { ModelAdapter } from './types.js';

export interface ProviderEnv {
  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL?: string;
  OPENCODE_BASE_URL?: string;
  OPENCODE_API_KEY?: string;
  OPENCODE_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

const FULL: ModelCapabilityProfile = {
  supportsTools: true,
  supportsJsonSchema: true,
  contextWindow: 128_000,
  tier: 'full',
};

/**
 * Build one adapter per configured provider. All five speak the
 * OpenAI-compatible /chat/completions shape:
 * - Ollama serves it natively.
 * - OpenAI / Gemini (openai/gemini-2.x via compat endpoint) / Anthropic
 *   (OpenAI-compat Messages shim) / OpenCode (confirm shape per spec §11 —
 *   if it diverges, subclass OpenAICompatibleAdapter and override complete()).
 */
export function buildAdapters(env: ProviderEnv = process.env): ModelAdapter[] {
  const adapters: ModelAdapter[] = [];

  adapters.push(
    new OpenAICompatibleAdapter({
      id: 'ollama',
      model: env.OLLAMA_MODEL ?? 'llama3.1:8b',
      baseUrl: env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
      capabilities: {
        supportsTools: false,
        supportsJsonSchema: true,
        contextWindow: 8192,
        tier: 'basic',
      },
    }),
  );

  if (env.OPENCODE_BASE_URL) {
    adapters.push(
      new OpenAICompatibleAdapter({
        id: 'opencode',
        model: env.OPENCODE_MODEL ?? 'opencode/big-pickle',
        baseUrl: env.OPENCODE_BASE_URL,
        apiKey: env.OPENCODE_API_KEY,
        capabilities: { ...FULL, contextWindow: 64_000 },
      }),
    );
  }

  if (env.ANTHROPIC_API_KEY) {
    adapters.push(
      new OpenAICompatibleAdapter({
        id: 'anthropic',
        // Pin a specific model string; make it a settings-level override
        // (Anthropic renames lines — confirm at build time per spec §11).
        model: env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
        baseUrl: 'https://api.anthropic.com/v1/openai',
        apiKey: env.ANTHROPIC_API_KEY,
        capabilities: { ...FULL, contextWindow: 200_000 },
      }),
    );
  }

  if (env.OPENAI_API_KEY) {
    adapters.push(
      new OpenAICompatibleAdapter({
        id: 'openai',
        model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: env.OPENAI_API_KEY,
        capabilities: { ...FULL },
      }),
    );
  }

  if (env.GEMINI_API_KEY) {
    adapters.push(
      new OpenAICompatibleAdapter({
        id: 'gemini',
        // Confirm current family at build time (Gemini 2.x line shifts).
        model: env.GEMINI_MODEL ?? 'gemini-2.0-flash',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: env.GEMINI_API_KEY,
        capabilities: { ...FULL, contextWindow: 1_000_000 },
      }),
    );
  }

  return adapters;
}

export const PROVIDER_IDS: ProviderId[] = [
  'ollama',
  'opencode',
  'anthropic',
  'openai',
  'gemini',
];
