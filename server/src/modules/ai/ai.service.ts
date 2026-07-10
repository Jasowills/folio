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
  response_format?: { type: 'json_object' };
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
  interview: 0,
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
    return process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2:1b';
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

  private get groqConfigured(): boolean {
    return !!process.env.GROQ_API_KEY;
  }

  private get groqBaseUrl(): string {
    return process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  }

  private get groqDefaultModel(): string {
    return process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile';
  }

  private get groqFallbackModel(): string {
    return process.env.GROQ_FALLBACK_MODEL || 'mixtral-8x7b-32768';
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
    if (system.includes('resume data extraction and gap-filling')) return 'extraction';
    if (system.includes('career analyst')) return 'roleDetection';
    if (system.includes('resume design expert')) return 'quality';
    if (system.includes('expert recruiter') && system.includes('identify issues')) return 'redFlag';
    if (system.includes('ATS') && system.includes('Seniority')) return 'atsScoring';
    if (system.includes('senior recruiter') && system.includes('career coach')) return 'review';
    if (system.includes('resume writer')) return 'bulletRewriter';
    if (system.includes('cover letter writer')) return 'coverLetter';
    if (system.includes('senior technical recruiter') && system.includes('portfolio')) return 'portfolio';
    if (system.includes('interview coach') || system.includes('interview evaluator')) return 'interview';
    return 'default';
  }

  /** Higher token limit for extraction (lots of nested content) */
  private get extractionMaxTokens(): number {
    const val = Number(process.env.AI_EXTRACTION_MAX_TOKENS);
    return Number.isFinite(val) && val >= 0 ? val : 4096;
  }

  private ttlFor(system: string): number {
    return CACHE_TTL[this.promptCategory(system)] ?? DEFAULT_CHAT_TTL;
  }

  async chat(
    system: string,
    user: string,
    model?: string,
  ): Promise<Record<string, unknown>>;
  async chat(
    system: string,
    user: string,
    model: string | undefined,
    format: 'text',
  ): Promise<string>;
  async chat(
    system: string,
    user: string,
    model?: string,
    format: 'json' | 'text' = 'json',
  ): Promise<Record<string, unknown> | string> {
    const resolvedModel = model || (this.ollamaConfigured ? this.ollamaDefaultModel : this.openrouterDefaultModel);
    const cacheKey = this.cache.makeKey(system, user, resolvedModel);

    if (format === 'text') {
      const messages: ChatMessage[] = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ];
      const isValidText = (raw: string): boolean => {
        const trimmed = raw.trim()
        if (trimmed.length < 5) return false
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false
        if (/"(userId|response|text|message|interviewerResponse|role|content)"\s*:/.test(trimmed)) return false
        if (trimmed.length > 0 && trimmed[0] === '"' && trimmed.includes('":')) return false
        return true
      }
      return this.callWithRetry(messages, model, 2048, isValidText, 'text');
    }

    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for chat request');
      return cached;
    }

    const inFlight = this.cache.getPending(cacheKey);
    if (inFlight) {
      this.logger.debug('Dedup: waiting for in-flight request');
      const result = await Promise.race([
        inFlight,
        new Promise<null>((r) => setTimeout(() => r(null), 15_000)),
      ]);
      if (result) return result;
      this.logger.debug('Dedup: in-flight request timed out, making new call');
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

    const providers: Array<{ provider: 'ollama' | 'openrouter' | 'groq'; baseUrl: string; model: string }> = [];

    if (this.groqConfigured) {
      providers.push({ provider: 'groq', baseUrl: this.groqBaseUrl, model: model || this.groqDefaultModel });
    }
    if (this.ollamaConfigured) {
      providers.push({ provider: 'ollama', baseUrl: this.ollamaBaseUrl, model: model || this.ollamaDefaultModel });
    }
    providers.push({ provider: 'openrouter', baseUrl: this.openrouterBaseUrl, model: model || this.openrouterDefaultModel });

    for (const { provider, baseUrl, model: m } of providers) {
      try {
        return await this.streamFromProvider(provider, baseUrl, m, messages);
      } catch (err) {
        this.logger.warn(`Stream fallback: ${provider} failed: ${(err as Error).message}`);
      }
    }

    throw new Error('All streaming providers failed');
  }

  private async streamFromProvider(
    provider: 'ollama' | 'openrouter' | 'groq',
    baseUrl: string,
    model: string,
    messages: ChatMessage[],
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${this.openrouterApiKey}`;
      headers['HTTP-Referer'] = 'https://folio.app';
      headers['X-Title'] = 'Folio &';
    } else if (provider === 'groq') {
      headers['Authorization'] = `Bearer ${process.env.GROQ_API_KEY}`;
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
      throw new Error(`${provider} stream error: ${res.status}`);
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

    const category = this.promptCategory(system);
    const maxTokens = category === 'extraction' || category === 'interview' ? this.extractionMaxTokens : this.maxTokens;

    const raw = await this.callWithRetry(messages, model, maxTokens, (text) => {
      const parsed = this.parseJson(text);
      return Object.keys(parsed).length > 0;
    }, 'json');
    if (category === 'interview' || category === 'atsScoring') {
      this.logger.log(`[callAi] raw response (first 800 chars): ${raw.slice(0, 800)}`);
    }
    const parsed = this.parseJson(raw);
    if (category === 'atsScoring') {
      this.logger.log(`[callAi] parsed keys: ${Object.keys(parsed).join(', ')}`, parsed);
    }
    return parsed;
  }

  private providerKey(provider: string, model: string): string {
    return `${provider}:${model}`;
  }

  private async tryProvider(
    provider: 'ollama' | 'openrouter' | 'groq',
    model: string,
    messages: ChatMessage[],
    maxTokens?: number,
    format: 'json' | 'text' = 'json',
  ): Promise<string | null> {
    const key = this.providerKey(provider, model);

    if (this.isOnCooldown(key)) {
      this.logger.debug(`Skipping ${provider}/${model} (circuit open)`);
      return null;
    }

    try {
      if (provider === 'ollama') {
        return await this.callOllama(model, messages, maxTokens, format);
      }
      if (provider === 'groq') {
        return await this.callGroq(model, messages, maxTokens);
      }
      return await this.callOpenRouter(model, messages, maxTokens);
    } catch (err) {
      const msg = (err as Error)?.message || String(err);
      this.setCooldown(key, CIRCUIT_BREAKER_TTL);
      if (msg.includes('429') || msg.includes('402')) {
        this.logger.warn(`${provider}/${model} rate-limited, circuit open for 30s`);
      } else {
        this.logger.warn(`${provider}/${model} error: ${msg}`);
      }
      return null;
    }
  }

  private async callWithRetry(
    messages: ChatMessage[],
    model?: string,
    maxTokens?: number,
    validate?: (raw: string) => boolean,
    format: 'json' | 'text' = 'json',
  ): Promise<string> {
    const usesOllama = this.ollamaConfigured;
    const tokens = maxTokens ?? this.maxTokens;

    const primaryProvider = usesOllama ? 'ollama' : 'openrouter';
    const primaryModel = model || (usesOllama ? this.ollamaDefaultModel : this.openrouterDefaultModel);
    const fallbackModel = this.openrouterFallbackModel;

    const valid = (raw: string | null): raw is string =>
      raw !== null && (!validate || validate(raw));

    for (let attempt = 1; attempt <= 3; attempt++) {
      // Try primary provider
      const r1 = await this.tryProvider(primaryProvider, primaryModel, messages, tokens, format);
      if (valid(r1)) return r1;

      // If Ollama is primary, try Groq next (OpenRouter consistently 402s)
      if (usesOllama) {
        if (this.groqConfigured) {
          const r2 = await this.tryProvider('groq', this.groqDefaultModel, messages, tokens, format);
          if (valid(r2)) return r2;
          const r3 = await this.tryProvider('groq', this.groqFallbackModel, messages, tokens, format);
          if (valid(r3)) return r3;
        }
        const r4 = await this.tryProvider('openrouter', this.openrouterDefaultModel, messages, tokens, format);
        if (valid(r4)) return r4;
        const r5 = await this.tryProvider('openrouter', fallbackModel, messages, tokens, format);
        if (valid(r5)) return r5;
      } else {
        // OpenRouter is primary — try Groq before OpenRouter fallback
        const r2 = await this.tryProvider('openrouter', fallbackModel, messages, tokens, format);
        if (valid(r2)) return r2;
        if (this.groqConfigured) {
          const r3 = await this.tryProvider('groq', this.groqDefaultModel, messages, tokens, format);
          if (valid(r3)) return r3;
          const r4 = await this.tryProvider('groq', this.groqFallbackModel, messages, tokens, format);
          if (valid(r4)) return r4;
        }
      }

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
    maxTokens?: number,
  ): Promise<string> {
    const url = `${this.openrouterBaseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const finish = () => clearTimeout(timeout);

    const effectiveMaxTokens = maxTokens ?? this.maxTokens;

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
          max_tokens: effectiveMaxTokens,
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

  private async callGroq(
    model: string,
    messages: ChatMessage[],
    maxTokens?: number,
  ): Promise<string> {
      const url = `${this.groqBaseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const finish = () => clearTimeout(timeout);

    try {
      this.logger.log(`Calling Groq ${model}`);

      const res = await fetch(url, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens ?? this.maxTokens,
          stream: false,
          messages,
        }),
      });

      finish();

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 429) {
          throw new Error(`429 rate limited${body ? ` — ${body.slice(0, 100)}` : ''}`);
        }
        throw new Error(`Groq API error: ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`);
      }

      const data = (await res.json()) as OpenRouterResponse;

      this.logger.log(`Groq ${model} response received`);

      return data.choices[0]?.message?.content || '';
    } catch (e) {
      finish();
      throw e;
    }
  }

  async chatForBuilder(
    system: string,
    user: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    const builderProviders: Array<{ provider: 'groq' | 'openrouter'; model: string }> = [
      { provider: 'groq', model: this.groqDefaultModel },
      { provider: 'groq', model: this.groqFallbackModel },
      { provider: 'openrouter', model: this.groqDefaultModel },
      { provider: 'openrouter', model: this.openrouterFallbackModel },
    ];

    for (let attempt = 1; attempt <= 3; attempt++) {
      for (const { provider, model } of builderProviders) {
        if (provider === 'groq' && !this.groqConfigured) continue;
        const result = await this.tryProvider(provider, model, messages, 2048);
        if (result !== null) return result;
      }

      if (attempt < 3) {
        const delay = 3000 + Math.random() * 2000;
        this.logger.debug(`[chatForBuilder] Retry ${attempt + 1}/3 after ${Math.round(delay)}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw new Error('AI service is currently unavailable. All providers exhausted. Please try again later.');
  }

  async chatForInterview(
    system: string,
    user: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    const interviewProviders: Array<{ provider: 'groq' | 'openrouter'; model: string }> = [
      { provider: 'groq', model: this.groqDefaultModel },
      { provider: 'groq', model: this.groqFallbackModel },
      { provider: 'openrouter', model: this.openrouterFallbackModel },
    ];

    for (let attempt = 1; attempt <= 3; attempt++) {
      for (const { provider, model } of interviewProviders) {
        if (provider === 'groq' && !this.groqConfigured) continue;
        const result = await this.tryProviderForInterview(provider, model, messages);
        if (result !== null) return result;
      }

      if (attempt < 3) {
        const delay = 3000 + Math.random() * 2000;
        this.logger.debug(`[chatForInterview] Retry ${attempt + 1}/3 after ${Math.round(delay)}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw new Error('AI service is currently unavailable. All providers exhausted. Please try again later.');
  }

  private async tryProviderForInterview(
    provider: 'groq' | 'openrouter',
    model: string,
    messages: ChatMessage[],
  ): Promise<string | null> {
    const key = this.providerKey(provider, model);

    if (this.isOnCooldown(key)) {
      this.logger.debug(`Skipping ${provider}/${model} (circuit open)`);
      return null;
    }

    try {
      if (provider === 'groq') {
        return await this.callGroq(model, messages, 2048);
      }
      return await this.callOpenRouter(model, messages, 2048);
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

  private async callOllama(
    model: string,
    messages: ChatMessage[],
    maxTokens?: number,
    format: 'json' | 'text' = 'json',
  ): Promise<string> {
    const url = `${this.ollamaBaseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const finish = () => clearTimeout(timeout);

    try {
      this.logger.log(`Calling Ollama ${model} at ${this.ollamaBaseUrl}`);

      const body: Record<string, unknown> = {
        model,
        stream: false,
        messages,
        options: {
          num_predict: maxTokens ?? this.maxTokens,
          temperature: 0.3,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
        },
        keep_alive: '10m',
      };
      if (format === 'json') {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(url, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body as unknown as OpenRouterRequest),
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

    // Escape control characters that appear inside JSON string values
    // The llama3.2:1b model often emits literal newlines inside strings
    const escapeJsonStrings = (s: string): string => {
      let out = ''
      let inStr = false
      let esc = false
      for (let i = 0; i < s.length; i++) {
        const ch = s[i]
        if (esc) { esc = false; out += ch; continue }
        if (ch === '\\' && inStr) { esc = true; out += ch; continue }
        if (ch === '"') { inStr = !inStr; out += ch; continue }
        if (inStr && (ch === '\n' || ch === '\r' || ch === '\t')) { out += ' '; continue }
        out += ch
      }
      return out
    }

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

    // The 1B model sometimes wraps JSON in a JSON string (starts/ends with ")
    // e.g. "{"firstName":"Kavya"}" — unwrap it before parsing
    if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.indexOf('{') === 1) {
      const inner = cleaned.slice(1, -1);
      const parsed = tryParse(inner)
      if (parsed) return parsed
    }

    // Try every complete JSON object in the response, not just the first one
    // The 1B model sometimes concatenates multiple objects (e.g. training artifacts)
    let searchStart = start;
    while (searchStart !== -1) {
      let depth = 0;
      let end = -1;
      for (let i = searchStart; i < cleaned.length; i++) {
        if (cleaned[i] === '{') depth++;
        else if (cleaned[i] === '}') {
          depth--;
          if (depth === 0) { end = i + 1; break; }
        }
      }
      if (end !== -1) {
        const parsed = tryParse(escapeJsonStrings(cleaned.slice(searchStart, end)));
        if (parsed) return parsed;
        searchStart = cleaned.indexOf('{', end);
      } else {
        break;
      }
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

    const parsed = tryParse(escapeJsonStrings(truncated));
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
        const parsed = tryParse(escapeJsonStrings(body.substring(0, i + 1)));
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
