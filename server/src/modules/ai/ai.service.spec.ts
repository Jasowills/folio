import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { AiCacheService } from './ai-cache.service';

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

  beforeEach(async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key';

    module = await Test.createTestingModule({
      providers: [AiService, AiCacheService],
    }).compile();

    service = module.get<AiService>(AiService);
    cache = module.get<AiCacheService>(AiCacheService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
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
        .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('rate limited'), headers: { get: () => null } })
        .mockResolvedValueOnce(mockChatResponse('{"ok": true}'));

      jest.spyOn(globalThis, 'fetch').mockImplementation(mock429);

      const result = await service.chat('system', 'user');

      expect(result).toEqual({ ok: true });
    });

    it('throws when all providers return empty responses', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockChatResponse(''));

      await expect(service.chat('system', 'user')).rejects.toThrow('AI service is currently unavailable');
    }, 20_000);
  });

  describe('stream', () => {
    it('returns a ReadableStream', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hello"}}]}'));
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
  });
});
