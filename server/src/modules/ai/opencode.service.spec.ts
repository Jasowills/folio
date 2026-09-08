import { Test, TestingModule } from '@nestjs/testing';
import { OpencodeService } from './opencode.service';

jest.mock('./opencode-sdk.mjs', () => ({
  createOpencode: jest.fn(),
  createOpencodeClient: jest.fn(),
}));

import { createOpencode, createOpencodeClient } from './opencode-sdk.mjs';

const mockedCreateOpencode = createOpencode as jest.Mock;
const mockedCreateOpencodeClient = createOpencodeClient as jest.Mock;

const makeSession = (id = 'ses_test') => ({
  data: { id, directory: '/tmp/probe' },
});

const makePromptResult = (text: string) => ({
  data: {
    info: {
      id: 'msg_1',
      role: 'assistant',
      modelID: 'big-pickle',
      providerID: 'opencode',
    },
    parts: [{ type: 'text', text }],
  },
});

const makeFakeClient = (
  overrides: Partial<
    Record<'create' | 'prompt' | 'subscribe' | 'delete', jest.Mock>
  > = {},
) => {
  const client = {
    session: {
      create: overrides.create ?? jest.fn().mockResolvedValue(makeSession()),
      prompt:
        overrides.prompt ??
        jest.fn().mockResolvedValue(makePromptResult('hello')),
    },
    event: {
      subscribe: overrides.subscribe ?? jest.fn(),
    },
  };
  return client as never;
};

describe('OpencodeService', () => {
  let service: OpencodeService;
  let module: TestingModule;

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENCODE_BASE_URL;
    delete process.env.OPENCODE_ENABLED;
    delete process.env.OPENCODE_MODEL;
    delete process.env.OPENCODE_WORKDIR;
    service.onModuleDestroy();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [OpencodeService],
    }).compile();
    service = module.get<OpencodeService>(OpencodeService);
  });

  describe('enabled', () => {
    it('is disabled by default', () => {
      expect(service.enabled).toBe(false);
      expect(service.status).toBe('disabled');
    });

    it('is enabled when OPENCODE_BASE_URL is set', () => {
      process.env.OPENCODE_BASE_URL = 'http://localhost:4096';
      expect(service.enabled).toBe(true);
      expect(service.status).toBe('external@http://localhost:4096');
    });

    it('is enabled when OPENCODE_ENABLED is true', () => {
      process.env.OPENCODE_ENABLED = 'true';
      expect(service.enabled).toBe(true);
      expect(service.status).toBe('embedded');
    });
  });

  describe('chat', () => {
    it('returns text from the assistant parts when configured with a base URL', async () => {
      process.env.OPENCODE_BASE_URL = 'http://localhost:4096';
      const fake = makeFakeClient();
      mockedCreateOpencodeClient.mockReturnValue(fake);

      const result = await service.chat('system prompt', 'user message');

      expect(mockedCreateOpencodeClient).toHaveBeenCalledWith(
        expect.objectContaining({ baseUrl: 'http://localhost:4096' }),
      );
      expect(result).toBe('hello');
      expect(
        (fake as { session: { create: jest.Mock; prompt: jest.Mock } }).session
          .create,
      ).toHaveBeenCalledTimes(1);
      expect(
        (fake as { session: { prompt: jest.Mock } }).session.prompt,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'system prompt',
          tools: {},
          parts: [{ type: 'text', text: 'user message' }],
        }),
      );
    });

    it('parses OPENCODE_MODEL into providerID/modelID for the prompt', async () => {
      process.env.OPENCODE_BASE_URL = 'http://localhost:4096';
      process.env.OPENCODE_MODEL = 'anthropic/claude-sonnet-4';
      const prompt = jest.fn().mockResolvedValue(makePromptResult('ok'));
      mockedCreateOpencodeClient.mockReturnValue(makeFakeClient({ prompt }));

      await service.chat('s', 'u');

      expect(prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          model: { providerID: 'anthropic', modelID: 'claude-sonnet-4' },
        }),
      );
    });

    it('throws when the client reports an error', async () => {
      process.env.OPENCODE_BASE_URL = 'http://localhost:4096';
      mockedCreateOpencodeClient.mockReturnValue(
        makeFakeClient({
          prompt: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
        }),
      );

      await expect(service.chat('s', 'u')).rejects.toThrow(
        'opencode error: boom',
      );
    });

    it('throws when the model returns an error message instead of text (e.g. 402)', async () => {
      process.env.OPENCODE_BASE_URL = 'http://localhost:4096';
      mockedCreateOpencodeClient.mockReturnValue(
        makeFakeClient({
          prompt: jest.fn().mockResolvedValue({
            data: {
              info: {
                id: 'msg_1',
                role: 'assistant',
                error: {
                  name: 'APIError',
                  data: { message: 'Insufficient Balance', statusCode: 402 },
                },
              },
              parts: [],
            },
          }),
        }),
      );

      await expect(service.chat('s', 'u')).rejects.toThrow(
        'opencode model error',
      );
    });

    it('uses an embedded server when OPENCODE_ENABLED and no base URL', async () => {
      process.env.OPENCODE_ENABLED = 'true';
      const fake = makeFakeClient();
      mockedCreateOpencode.mockResolvedValue({
        client: fake,
        server: { url: 'http://127.0.0.1:4096', close: jest.fn() },
      });

      const result = await service.chat('s', 'u');

      expect(mockedCreateOpencode).toHaveBeenCalledTimes(1);
      expect(result).toBe('hello');
    });

    it('reuses the same client across calls', async () => {
      process.env.OPENCODE_BASE_URL = 'http://localhost:4096';
      const create = jest.fn().mockResolvedValue(makeSession('ses_a'));
      mockedCreateOpencodeClient.mockReturnValue(makeFakeClient({ create }));

      await service.chat('s', 'u');
      await service.chat('s', 'u');

      expect(mockedCreateOpencodeClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('stream', () => {
    it('relays text deltas as SSE token chunks and ends with [DONE]', async () => {
      process.env.OPENCODE_BASE_URL = 'http://localhost:4096';

      async function* gen() {
        await Promise.resolve();
        yield {
          type: 'message.part.delta',
          properties: { sessionID: 'ses_test', delta: 'Hel' },
        };
        yield {
          type: 'message.part.delta',
          properties: { sessionID: 'ses_test', delta: 'lo' },
        };
        yield {
          type: 'session.next.text.delta',
          properties: { sessionID: 'ses_test', delta: '!' },
        };
        yield {
          type: 'session.next.text.delta',
          properties: { sessionID: 'other', delta: 'IGNORED' },
        };
      }

      const subscribe = jest.fn().mockResolvedValue({ stream: gen() });
      mockedCreateOpencodeClient.mockReturnValue(makeFakeClient({ subscribe }));

      const stream = await service.stream('s', 'u');
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let out = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        out += decoder.decode(value);
      }

      expect(out).toContain('data: {"token":"Hel"}');
      expect(out).toContain('data: {"token":"lo"}');
      expect(out).toContain('data: {"token":"!"}');
      expect(out).not.toContain('IGNORED');
      expect(out).toContain('data: [DONE]');
    });

    it('terminates shortly after the prompt resolves (does not hang on an open SSE connection)', async () => {
      process.env.OPENCODE_BASE_URL = 'http://localhost:4096';

      async function* gen() {
        yield {
          type: 'message.part.delta',
          properties: { sessionID: 'ses_test', delta: 'a' },
        };
        await new Promise((r) => setTimeout(r, 300));
        yield {
          type: 'message.part.delta',
          properties: { sessionID: 'ses_test', delta: 'b' },
        };
        await new Promise((r) => setTimeout(r, 300));
        yield {
          type: 'message.part.delta',
          properties: { sessionID: 'ses_test', delta: 'c' },
        };
      }

      const prompt = jest.fn().mockResolvedValue(makePromptResult('ok'));
      mockedCreateOpencodeClient.mockReturnValue(
        makeFakeClient({
          prompt,
          subscribe: jest.fn().mockResolvedValue({ stream: gen() }),
        }),
      );

      const stream = await service.stream('s', 'u');
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let out = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        out += decoder.decode(value);
      }

      expect(out).toContain('data: {"token":"a"}');
      expect(out).not.toContain('"token":"c"');
      expect(out).toContain('data: [DONE]');
    }, 10_000);
  });

  describe('lifecycle', () => {
    it('closes the embedded server on module destroy', async () => {
      process.env.OPENCODE_ENABLED = 'true';
      const close = jest.fn();
      mockedCreateOpencode.mockResolvedValue({
        client: makeFakeClient(),
        server: { url: 'http://127.0.0.1:4096', close },
      });
      await service.chat('s', 'u');

      service.onModuleDestroy();

      expect(close).toHaveBeenCalled();
    });
  });
});
