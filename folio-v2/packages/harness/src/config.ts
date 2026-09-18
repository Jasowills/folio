import 'dotenv/config';

/** Central env access for the harness. Secrets stay local — see spec §8. */
export const config = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  ollamaModel: process.env.OLLAMA_MODEL ?? 'llama3.1:8b',
  opencodeBaseUrl: process.env.OPENCODE_BASE_URL,
  opencodeApiKey: process.env.OPENCODE_API_KEY,
  opencodeModel: process.env.OPENCODE_MODEL ?? 'opencode/big-pickle',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  dbPath: process.env.FOLIO_DB_PATH,
  defaultProvider: process.env.FOLIO_PROVIDER ?? 'ollama',
} as const;
