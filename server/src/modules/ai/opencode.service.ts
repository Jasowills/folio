import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { OpencodeClient } from '@opencode-ai/sdk/v2';

type OpencodeSDK = typeof import('@opencode-ai/sdk/v2');

interface EmbeddedServer {
  url: string;
  close(): void;
}

interface OpencodeChatOptions {
  model?: string;
}

const TEXT_DELTA_EVENTS = new Set([
  'message.part.delta',
  'session.next.text.delta',
]);

/**
 * Bridges Folio to opencode as an optional AI brain.
 *
 * Two connection modes (lazy — nothing spawns until first use):
 *   - external:  OPENCODE_BASE_URL points at a running `opencode serve` instance
 *   - embedded:  OPENCODE_ENABLED=true spawns the `opencode` binary in-process
 *
 * Prompts are sent with `tools: {}` so opencode acts as a chat-only brain that
 * reasons and returns text without touching the filesystem of the backend.
 */
@Injectable()
export class OpencodeService implements OnModuleDestroy {
  private readonly logger = new Logger(OpencodeService.name);
  private client: OpencodeClient | null = null;
  private embedded: EmbeddedServer | null = null;
  private initPromise: Promise<OpencodeClient> | null = null;
  private sdkPromise: Promise<OpencodeSDK> | null = null;

  /**
   * `@opencode-ai/sdk` ships pure ESM with import-only export conditions, so the
   * CJS-compiled build cannot `require('@opencode-ai/sdk/v2')` directly. Load it
   * lazily through a local `.mjs` shim, which Node 24 can `require()` from CJS.
   */
  private loadSdk(): Promise<OpencodeSDK> {
    this.sdkPromise ??= Promise.resolve().then(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('./opencode-sdk.mjs') as OpencodeSDK;
    });
    return this.sdkPromise;
  }

  get enabled(): boolean {
    return (
      process.env.OPENCODE_ENABLED === 'true' || !!process.env.OPENCODE_BASE_URL
    );
  }

  get baseUrl(): string | undefined {
    return process.env.OPENCODE_BASE_URL;
  }

  get configuredModel(): string | undefined {
    return process.env.OPENCODE_MODEL || undefined;
  }

  get status(): string {
    if (!this.enabled) return 'disabled';
    return this.baseUrl ? `external@${this.baseUrl}` : 'embedded';
  }

  private get directory(): string {
    return process.env.OPENCODE_WORKDIR || process.cwd();
  }

  /**
   * Relocates opencode's state dir so the embedded server never touches a
   * shared/root-owned ~/.local/state/opencode (which breaks its file locks).
   * opencode reads this via XDG_STATE_HOME.
   */
  private get stateDir(): string | undefined {
    return process.env.OPENCODE_STATE_DIR;
  }

  private unwrap<T>(result: { data?: T; error?: unknown } | T): T {
    if (
      result &&
      typeof result === 'object' &&
      ('data' in result || 'error' in result)
    ) {
      const r = result;
      if (r.error) {
        const raw = r.error as { message?: string };
        throw new Error(
          `opencode error: ${raw?.message || JSON.stringify(r.error)}`,
        );
      }
      return r.data as T;
    }
    return result as T;
  }

  private resolveModel(
    model?: string,
  ): { providerID: string; modelID: string } | undefined {
    const raw = model || this.configuredModel;
    if (!raw) return undefined;
    const idx = raw.indexOf('/');
    if (idx <= 0 || idx === raw.length - 1) return undefined;
    return { providerID: raw.slice(0, idx), modelID: raw.slice(idx + 1) };
  }

  private async getClient(): Promise<OpencodeClient> {
    if (this.client) return this.client;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.init();
    return this.initPromise;
  }

  private async init(): Promise<OpencodeClient> {
    try {
      const sdk = await this.loadSdk();
      if (this.baseUrl) {
        this.logger.log(
          `[init] connecting to opencode server at ${this.baseUrl}`,
        );
        this.client = sdk.createOpencodeClient({
          baseUrl: this.baseUrl,
          directory: this.directory,
        });
        return this.client;
      }
      this.logger.log(
        '[init] spawning embedded opencode server (opencode binary must be on PATH)',
      );
      if (this.stateDir) {
        process.env.XDG_STATE_HOME = this.stateDir;
      }
      const { client, server } = await sdk.createOpencode({
        timeout: 20_000,
        config: this.configuredModel ? { model: this.configuredModel } : {},
      });
      this.client = client;
      this.embedded = server;
      this.logger.log(
        `[init] embedded opencode server listening at ${server.url}`,
      );
      return client;
    } catch (err) {
      this.logger.error(
        `[init] opencode unavailable: ${(err as Error).message}`,
      );
      this.initPromise = null;
      throw err;
    }
  }

  /**
   * Single-shot chat completion. Returns the assistant's text.
   */
  async chat(
    system: string,
    user: string,
    opts: OpencodeChatOptions = {},
  ): Promise<string> {
    const client = await this.getClient();
    const directory = this.directory;
    const session = this.unwrap(
      await client.session.create({ directory, title: 'folio-ai' }),
    );
    const result = this.unwrap(
      await client.session.prompt({
        sessionID: session.id,
        directory,
        system,
        model: this.resolveModel(opts.model),
        tools: {},
        parts: [{ type: 'text', text: user }],
      }),
    );
    const error = (result as { info?: { error?: unknown } }).info?.error;
    if (error) {
      throw new Error(`opencode model error: ${JSON.stringify(error)}`);
    }
    const parts =
      (result as { parts?: Array<{ type?: string; text?: string }> }).parts ||
      [];
    return parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('\n')
      .trim();
  }

  /**
   * Streaming chat completion. Emits SSE chunks shaped like the rest of
   * Folio's providers: `data: {"token":"..."}\n\n` then `data: [DONE]\n\n`.
   */
  async stream(
    system: string,
    user: string,
    opts: OpencodeChatOptions = {},
  ): Promise<ReadableStream<Uint8Array>> {
    const client = await this.getClient();
    const directory = this.directory;
    const session = this.unwrap(
      await client.session.create({ directory, title: 'folio-ai-stream' }),
    );
    const events = await client.event.subscribe({ directory });

    const promptPromise = client.session.prompt({
      sessionID: session.id,
      directory,
      system,
      model: this.resolveModel(opts.model),
      tools: {},
      parts: [{ type: 'text', text: user }],
    });

    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        let doneSent = false;
        let finished = false;
        const sendDone = () => {
          if (doneSent) return;
          doneSent = true;
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch {
            // stream already closed
          }
        };
        const stop = () => {
          if (finished) return;
          finished = true;
          setTimeout(() => {
            events.stream.return?.(undefined).catch(() => {});
          }, 150);
        };
        promptPromise.then(stop, stop);

        try {
          for await (const event of events.stream as AsyncGenerator<
            Record<string, unknown>
          >) {
            if (!TEXT_DELTA_EVENTS.has(event?.type as string)) continue;
            const props = event.properties as
              | { sessionID?: string; delta?: string }
              | undefined;
            if (props?.sessionID === session.id && props.delta) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ token: props.delta })}\n\n`,
                ),
              );
            }
          }
          const rawResult = await promptPromise;
          const info = (
            (rawResult as { data?: { info?: { error?: unknown } } }).data ||
            (rawResult as { info?: { error?: unknown } })
          ).info;
          if (info?.error) {
            controller.error(
              new Error(`opencode model error: ${JSON.stringify(info.error)}`),
            );
          }
          sendDone();
        } catch (err) {
          controller.error(err instanceof Error ? err : new Error(String(err)));
        } finally {
          sendDone();
          controller.close();
        }
      },
      cancel() {
        events.stream.return?.(undefined).catch(() => {});
        promptPromise.catch(() => {});
      },
    });
  }

  onModuleDestroy(): void {
    if (this.embedded) {
      this.logger.log('[shutdown] closing embedded opencode server');
      this.embedded.close();
      this.embedded = null;
    }
    this.client = null;
    this.initPromise = null;
  }
}
