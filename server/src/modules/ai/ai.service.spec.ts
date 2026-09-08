import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { AiCacheService } from './ai-cache.service';
import { OpencodeService } from './opencode.service';

jest.mock('@opencode-ai/sdk/v2', () => ({
  createOpencode: jest.fn(),
  createOpencodeClient: jest.fn(),
}));

const mockChatResponse = (content: string) =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
  } as Response);

describe('AiService', () => {
  let service: AiService;
  let module: TestingModule;
  let cache: AiCacheService;
  let opencode: {
    enabled: boolean;
    status: string;
    chat: jest.Mock;
    stream: jest.Mock;
  };

  beforeEach(async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key';

    opencode = {
      enabled: false,
      status: 'disabled',
      chat: jest.fn(),
      stream: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        AiService,
        AiCacheService,
        { provide: OpencodeService, useValue: opencode },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    cache = module.get<AiCacheService>(AiCacheService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENCODE_ENABLED;
    delete process.env.OPENCODE_MODEL;
    delete process.env.OPENCODE_BASE_URL;
    cache.clear();
  });

  describe('chat', () => {
    it('returns parsed JSON from the model', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockChatResponse('{"score": 85}'));

      const result = await service.chat('system prompt', 'user message');

      expect(result).toEqual({ score: 85 });
    });

    it('uses second mock call when primary returns non-JSON', async () => {
      const mockFn = jest
        .fn()
        .mockResolvedValueOnce(mockChatResponse('plain text reply'))
        .mockResolvedValueOnce(mockChatResponse('{"ok": true}'));

      jest.spyOn(globalThis, 'fetch').mockImplementation(mockFn);

      const result = await service.chat('system', 'user');

      expect(result).toEqual({ ok: true });
    });

    it('falls back when primary model returns 429', async () => {
      const mock429 = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve('rate limited'),
          headers: { get: () => null },
        })
        .mockResolvedValueOnce(mockChatResponse('{"ok": true}'));

      jest.spyOn(globalThis, 'fetch').mockImplementation(mock429);

      const result = await service.chat('system', 'user');

      expect(result).toEqual({ ok: true });
    });

    it('throws when all providers return empty responses', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockChatResponse(''));

      await expect(service.chat('system', 'user')).rejects.toThrow(
        'AI service is currently unavailable',
      );
    }, 20_000);
  });

  describe('chat with opencode', () => {
    it('routes through opencode first when enabled and parses its JSON', async () => {
      opencode.enabled = true;
      opencode.status = 'external@http://localhost:4096';
      process.env.OPENCODE_MODEL = 'opencode/big-pickle';
      opencode.chat.mockResolvedValue('{"score": 99}');
      const fetchSpy = jest.spyOn(globalThis, 'fetch');

      const result = await service.chat('system prompt', 'user message');

      expect(opencode.chat).toHaveBeenCalledWith(
        'system prompt',
        'user message',
        { model: undefined },
      );
      expect(result).toEqual({ score: 99 });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('falls back to OpenRouter when opencode returns invalid JSON', async () => {
      opencode.enabled = true;
      opencode.chat.mockResolvedValue('not json at all');
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockChatResponse('{"ok": true}'));

      const result = await service.chat('system', 'user');

      expect(result).toEqual({ ok: true });
    });

    it('falls back to OpenRouter when opencode throws', async () => {
      opencode.enabled = true;
      opencode.chat.mockRejectedValue(new Error('server unreachable'));
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockChatResponse('{"ok": true}'));

      const result = await service.chat('system', 'user');

      expect(result).toEqual({ ok: true });
    });

    it('uses the opencode model in the cache key', async () => {
      opencode.enabled = true;
      process.env.OPENCODE_MODEL = 'opencode/big-pickle';
      opencode.chat.mockResolvedValue('{"score": 99}');

      await service.chat('s', 'u');
      await service.chat('s', 'u');

      expect(opencode.chat).toHaveBeenCalledTimes(1);
    });
  });

  describe('chatForBuilder with opencode', () => {
    it('returns the opencode text response', async () => {
      opencode.enabled = true;
      opencode.chat.mockResolvedValue('action: add bullets');

      const result = await service.chatForBuilder('system', 'user');

      expect(result).toBe('action: add bullets');
      expect(opencode.chat).toHaveBeenCalledWith('system', 'user', {
        model: undefined,
      });
    });

    it('falls back when opencode fails', async () => {
      opencode.enabled = true;
      opencode.chat.mockRejectedValue(new Error('boom'));
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockChatResponse('fallback text'));

      const result = await service.chatForBuilder('system', 'user');

      expect(result).toBe('fallback text');
    });
  });

  describe('chatForInterview with opencode', () => {
    it('returns the opencode text response', async () => {
      opencode.enabled = true;
      opencode.chat.mockResolvedValue('Great question');

      const result = await service.chatForInterview('system', 'user');

      expect(result).toBe('Great question');
    });
  });

  describe('stream', () => {
    it('returns a ReadableStream', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":"hello"}}]}',
            ),
          );
          controller.enqueue(new TextEncoder().encode('\n\ndata: [DONE]'));
          controller.close();
        },
      });

      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      const result = await service.stream('system', 'user');

      expect(result).toBeInstanceOf(ReadableStream);
    });

    it('uses opencode stream when enabled', async () => {
      opencode.enabled = true;
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('data: {"token":"hi"}\n\n'),
          );
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      opencode.stream.mockResolvedValue(mockStream);
      const fetchSpy = jest.spyOn(globalThis, 'fetch');

      const result = await service.stream('system', 'user');

      expect(result).toBe(mockStream);
      expect(opencode.stream).toHaveBeenCalledWith('system', 'user', {
        model: undefined,
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('falls back to other providers when opencode streaming fails', async () => {
      opencode.enabled = true;
      opencode.stream.mockRejectedValue(new Error('stream failed'));
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]'));
          controller.close();
        },
      });
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      const result = await service.stream('system', 'user');

      expect(result).toBeInstanceOf(ReadableStream);
    });
  });
});
