import { Injectable, Logger } from '@nestjs/common';
import { AiCacheService } from './ai-cache.service';

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  max_tokens: number;
  stream: boolean;
  messages: ChatMessage[];
}

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

const CACHE_TTL: Record<string, number> = {
  extraction: 30 * 60_000,
  roleDetection: 30 * 60_000,
  quality: 10 * 60_000,
  redFlag: 10 * 60_000,
  atsScoring: 5 * 60_000,
  portfolio: 10 * 60_000,
  review: 10 * 60_000,
  bulletRewriter: 60 * 60_000,
  coverLetter: 0,
};

const DEFAULT_CHAT_TTL = 10 * 60_000;

const CIRCUIT_BREAKER_TTL = 30_000;

/** Daily token budget for OpenRouter free tier */
const DAILY_TOKEN_BUDGET = parseInt(process.env.OPENROUTER_DAILY_BUDGET || '500000', 10);

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private cooldowns = new Map<string, number>();
  /** dateString (YYYY-MM-DD) → total tokens used that day */
  private dailyUsage = new Map<string, number>();

  constructor(private cache: AiCacheService) {}

  private isOnCooldown(key: string): boolean {
    const until = this.cooldowns.get(key);
    if (!until) return false;
    if (Date.now() >= until) {
      this.cooldowns.delete(key);
      return false;
    }
    return true;
  }

  private setCooldown(key: string, ttl: number): void {
    this.cooldowns.set(key, Date.now() + ttl);
  }

  /** Whether Ollama is configured as the primary provider */
  private get ollamaConfigured(): boolean {
    return !!process.env.OLLAMA_BASE_URL;
  }

  private get ollamaBaseUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  }

  private get ollamaDefaultModel(): string {
    return process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2';
  }

  private get openrouterBaseUrl(): string {
    return process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  }

  private get openrouterDefaultModel(): string {
    return process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free';
  }

  private get openrouterFallbackModel(): string {
    return process.env.OPENROUTER_FALLBACK_MODEL || 'google/gemma-4-31b-it:free';
  }

  private get maxTokens(): number {
    const val = Number(process.env.OPENROUTER_MAX_TOKENS);
    return Number.isFinite(val) && val >= 0 ? val : 1024;
  }

  private get openrouterApiKey(): string {
    return process.env.OPENROUTER_API_KEY || '';
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private checkDailyBudget(): void {
    const used = this.dailyUsage.get(this.todayKey()) || 0;
    if (used >= DAILY_TOKEN_BUDGET) {
      this.logger.warn(`Daily token budget exhausted (${used}/${DAILY_TOKEN_BUDGET})`);
      throw new Error(`Token budget exceeded: ${used}/${DAILY_TOKEN_BUDGET} tokens used today. Try again tomorrow.`);
    }
    if (used > DAILY_TOKEN_BUDGET * 0.8) {
      this.logger.warn(`Daily token budget at ${Math.round(used / DAILY_TOKEN_BUDGET * 100)}% (${used}/${DAILY_TOKEN_BUDGET})`);
    }
  }

  private recordUsage(tokens: number): void {
    const today = this.todayKey();
    const used = this.dailyUsage.get(today) || 0;
    this.dailyUsage.set(today, used + tokens);
    this.logger.log(`Token usage: ${used + tokens}/${DAILY_TOKEN_BUDGET} today`);
  }

  private promptCategory(system: string): string {
    if (system.includes('resume parsing expert')) return 'extraction';
    if (system.includes('career analyst')) return 'roleDetection';
    if (system.includes('resume design expert')) return 'quality';
    if (system.includes('expert recruiter') && system.includes('identify issues')) return 'redFlag';
    if (system.includes('ATS') && system.includes('Seniority')) return 'atsScoring';
    if (system.includes('senior recruiter') && system.includes('career coach')) return 'review';
    if (system.includes('resume writer')) return 'bulletRewriter';
    if (system.includes('cover letter writer')) return 'coverLetter';
    if (system.includes('senior technical recruiter') && system.includes('portfolio')) return 'portfolio';
    return 'default';
  }

  private ttlFor(system: string): number {
    return CACHE_TTL[this.promptCategory(system)] ?? DEFAULT_CHAT_TTL;
  }

  async chat(
    system: string,
    user: string,
    model?: string,
  ): Promise<Record<string, unknown>> {
    const resolvedModel = model || (this.ollamaConfigured ? this.ollamaDefaultModel : this.openrouterDefaultModel);
    const cacheKey = this.cache.makeKey(system, user, resolvedModel);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for chat request');
      return cached;
    }

    const inFlight = this.cache.getPending(cacheKey);
    if (inFlight) {
      this.logger.debug('Dedup: waiting for in-flight request');
      return inFlight;
    }

    const promise = this.callAi(system, user, model);
    this.cache.setPending(cacheKey, promise);

    try {
      const result = await promise;
      const ttl = this.ttlFor(system);
      if (ttl > 0) this.cache.set(cacheKey, result, ttl);
      return result;
    } finally {
      this.cache.deletePending(cacheKey);
    }
  }

  async stream(
    system: string,
    user: string,
    model?: string,
  ): Promise<ReadableStream<Uint8Array>> {
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    const selectedModel = model || (this.ollamaConfigured ? this.ollamaDefaultModel : this.openrouterDefaultModel);

    if (this.ollamaConfigured) {
      return this.streamFromProvider(this.ollamaBaseUrl, selectedModel, messages, false);
    }

    return this.streamFromProvider(this.openrouterBaseUrl, selectedModel, messages, true);
  }

  private async streamFromProvider(
    baseUrl: string,
    model: string,
    messages: ChatMessage[],
    isOpenRouter: boolean,
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isOpenRouter) {
      headers['Authorization'] = `Bearer ${this.openrouterApiKey}`;
      headers['HTTP-Referer'] = 'https://folio.app';
      headers['X-Title'] = 'Folio &';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: this.maxTokens,
        stream: true,
        messages,
      } as OpenRouterRequest),
    });

    if (!res.ok || !res.body) {
      throw new Error(`${isOpenRouter ? 'OpenRouter' : 'Ollama'} stream error: ${res.status}`);
    }

    return res.body;
  }

  private async callAi(
    system: string,
    user: string,
    model?: string,
  ): Promise<Record<string, unknown>> {
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    const raw = await this.callWithRetry(messages, model);
    return this.parseJson(raw);
  }

  private providerKey(provider: string, model: string): string {
    return `${provider}:${model}`;
  }

  private async tryProvider(
    provider: 'ollama' | 'openrouter',
    model: string,
    messages: ChatMessage[],
  ): Promise<string | null> {
    const key = this.providerKey(provider, model);

    if (this.isOnCooldown(key)) {
      this.logger.debug(`Skipping ${provider}/${model} (circuit open)`);
      return null;
    }

    try {
      if (provider === 'ollama') {
        return await this.callOllama(model, messages);
      }
      return await this.callOpenRouter(model, messages);
    } catch (err) {
      const msg = (err as Error)?.message || String(err);
      const is429 = msg.includes('429');
      if (is429) {
        this.setCooldown(key, CIRCUIT_BREAKER_TTL);
        this.logger.warn(`${provider}/${model} rate-limited, circuit open for 30s`);
      }
      if (!is429) this.logger.warn(`${provider}/${model} error: ${msg}`);
      return null;
    }
  }

  private async callWithRetry(
    messages: ChatMessage[],
    model?: string,
  ): Promise<string> {
    const usesOllama = this.ollamaConfigured;

    const primaryProvider = usesOllama ? 'ollama' : 'openrouter';
    const primaryModel = model || (usesOllama ? this.ollamaDefaultModel : this.openrouterDefaultModel);
    const fallbackModel = this.openrouterFallbackModel;

    for (let attempt = 1; attempt <= 3; attempt++) {
      // Try primary provider
      const r1 = await this.tryProvider(primaryProvider, primaryModel, messages);
      if (r1 !== null) return r1;

      // If Ollama is primary, try OpenRouter as fallback
      if (usesOllama) {
        const r2 = await this.tryProvider('openrouter', this.openrouterDefaultModel, messages);
        if (r2 !== null) return r2;
      }

      // Try OpenRouter fallback model
      const r3 = await this.tryProvider('openrouter', fallbackModel, messages);
      if (r3 !== null) return r3;

      if (attempt < 3) {
        const delay = 3000 + Math.random() * 2000;
        this.logger.debug(`Retry ${attempt + 1}/3 after ${Math.round(delay)}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw new Error('AI service is currently unavailable. All providers exhausted. Please try again later.');
  }

  private async callOpenRouter(
    model: string,
    messages: ChatMessage[],
  ): Promise<string> {
    const url = `${this.openrouterBaseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const finish = () => clearTimeout(timeout);

    try {
      this.checkDailyBudget();

      const res = await fetch(url, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openrouterApiKey}`,
          'HTTP-Referer': 'https://folio.app',
          'X-Title': 'Folio &',
        },
        body: JSON.stringify({
          model,
          max_tokens: this.maxTokens,
          stream: false,
          messages,
        } as OpenRouterRequest),
      });

      finish();

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          throw new Error(`429 rate limited${retryAfter ? `:${retryAfter}` : ''}${body ? ` — ${body.slice(0, 100)}` : ''}`);
        }
        throw new Error(`OpenRouter API error: ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`);
      }

      const data = (await res.json()) as OpenRouterResponse;

      if (data.usage) {
        this.logger.log(
          `OpenRouter tokens — prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}, total: ${data.usage.total_tokens} (model: ${model})`,
        );
        this.recordUsage(data.usage.total_tokens || 0);
      }

      return data.choices[0]?.message?.content || '';
    } catch (e) {
      finish();
      throw e;
    }
  }

  private async callOllama(
    model: string,
    messages: ChatMessage[],
  ): Promise<string> {
    const url = `${this.ollamaBaseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const finish = () => clearTimeout(timeout);

    try {
      this.logger.log(`Calling Ollama ${model} at ${this.ollamaBaseUrl}`);

      const res = await fetch(url, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: this.maxTokens,
          stream: false,
          messages,
        } as OpenRouterRequest),
      });

      finish();

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Ollama API error: ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`);
      }

      const data = (await res.json()) as OpenRouterResponse;

      this.logger.log(`Ollama ${model} response received`);

      return data.choices[0]?.message?.content || '';
    } catch (e) {
      finish();
      throw e;
    }
  }

  private parseJson(raw: string): Record<string, unknown> {
    if (!raw) return {};

    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const start = cleaned.indexOf('{');
    if (start === -1) {
      this.logger.debug(`parseJson: no '{' found in response`);
      return {};
    }

    const tryParse = (str: string): Record<string, unknown> | null => {
      try {
        const parsed = JSON.parse(str);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch (e) {
        this.logger.debug(`parseJson: JSON.parse failed — ${(e as Error).message.slice(0, 80)}`);
      }
      return null;
    };

    let depth = 0;
    let end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }

    if (end !== -1) {
      const parsed = tryParse(cleaned.slice(start, end));
      if (parsed) return parsed;
    }

    // Truncation recovery — close unclosed structures from innermost to outermost
    let truncated = cleaned.slice(start);
    // Close unclosed string values (count only non-escaped quotes)
    const structuralQuotes = truncated.match(/[^\\]"/g) || [];
    const leadingQuote = truncated.startsWith('"') ? ['"'] : [];
    const quoteCount = leadingQuote.length + structuralQuotes.length;
    if (quoteCount % 2 !== 0) truncated += '"';
    // Close trailing unclosed values (e.g. after colon or comma with no value)
    truncated = truncated.replace(/:\s*$/g, ': null');
    truncated = truncated.replace(/,\s*$/g, '');
    // Walk backwards through structure to close in correct order
    let braceDepth = 0;
    let bracketDepth = 0;
    const closers: string[] = [];
    for (let i = 0; i < truncated.length; i++) {
      const ch = truncated[i];
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
      else if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
    }
    for (let i = 0; i < bracketDepth; i++) closers.push(']');
    for (let i = 0; i < braceDepth; i++) closers.push('}');
    truncated += closers.join('');

    const parsed = tryParse(truncated);
    if (parsed) {
      this.logger.debug(`parseJson: recovered truncated JSON`);
      return parsed;
    }

    // Progressive fallback: trim from the end, trying at each structural position
    // This handles cases where recovery added wrong closers or content beyond the truncation point is garbled
    const body = cleaned.slice(start);
    for (let i = body.length - 1; i > 0; i--) {
      const ch = body[i];
      if (ch === '}' || ch === ']' || ch === '"' || /\d/.test(ch) || (ch === 'e' && (body.substring(i - 3, i + 1) === 'true' || body.substring(i - 4, i + 1) === 'false')) || (ch === 'l' && body.substring(i - 3, i + 1) === 'null')) {
        const parsed = tryParse(body.substring(0, i + 1));
        if (parsed) {
          this.logger.debug(`parseJson: recovered via progressive fallback (length: ${i + 1})`);
          return parsed;
        }
      }
    }

    this.logger.debug(`parseJson: JSON.parse failed`);
    return {};
  }
}
