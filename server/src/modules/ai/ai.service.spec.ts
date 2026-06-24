import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';

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

  beforeEach(async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('chat', () => {
    it('returns parsed JSON from the model', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockChatResponse('{"score": 85}'));

      const result = await service.chat('system prompt', 'user message');

      expect(result).toEqual({ score: 85 });
    });

    it('returns raw object when response is not JSON', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockChatResponse('plain text reply'));

      const result = await service.chat('system', 'user');

      expect(result).toEqual({ raw: 'plain text reply' });
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

    it('returns empty object on empty response', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockChatResponse(''));

      const result = await service.chat('system', 'user');

      expect(result).toEqual({});
    });
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
