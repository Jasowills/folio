import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
  OnModuleInit,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AiService } from './ai.service';
import type { Response } from 'express';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController implements OnModuleInit {
  private readonly logger = new Logger(AiController.name);

  constructor(private ai: AiService) {}

  async onModuleInit() {
    const model = process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:7b';
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
    this.logger.log(`[warmup] pre-loading Ollama model: ${model}`);
    fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        options: { num_predict: 1 },
        keep_alive: '30m',
      }),
      signal: AbortSignal.timeout(15_000),
    }).then(res => {
      this.logger.log(`[warmup] Ollama model loaded: ${res.status}`);
    }).catch(e => {
      this.logger.warn(`[warmup] Ollama not ready: ${(e as Error).message}`);
    });
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with AI to edit resume (returns action tags)' })
  async chat(
    @Body() body: { messages: ChatMessage[] },
    @CurrentUser() user: UserDocument,
  ) {
    this.logger.log(`[chat] userId=${user._id.toString()} messages=${body.messages?.length}`);
    const lastMsg = body.messages?.at(-1);
    if (!lastMsg) return { message: { content: 'No message provided.' } };

    const systemMsgs = body.messages.filter(m => m.role === 'system');
    const userMsgs = body.messages.filter(m => m.role !== 'system');
    const systemPrompt = systemMsgs.map(m => m.content).join('\n\n');
    const userPrompt = userMsgs.map(m => m.content).join('\n\n');

    const content = await this.ai.chat(systemPrompt, userPrompt, undefined, 'text');
    return { message: { content } };
  }

  @Post('chat/stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream chat with AI via SSE' })
  async chatStream(
    @Body() body: { messages: ChatMessage[] },
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    this.logger.log(`[chat/stream] userId=${user._id.toString()} messages=${body.messages?.length}`);
    const systemMsgs = body.messages.filter(m => m.role === 'system');
    const userMsgs = body.messages.filter(m => m.role !== 'system');
    const systemPrompt = systemMsgs.map(m => m.content).join('\n\n');
    const userPrompt = userMsgs.map(m => m.content).join('\n\n');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
    const model = process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:7b';

    this.logger.log(`[chat/stream] calling Ollama ${model} at ${ollamaUrl}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const ollamaRes = await fetch(`${ollamaUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          options: {
            num_predict: 512,
            temperature: 0.3,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.1,
          },
          keep_alive: '5m',
        }),
      });

      clearTimeout(timeout);

      this.logger.log(`[chat/stream] Ollama responded: ${ollamaRes.status} ok=${ollamaRes.ok} hasBody=${!!ollamaRes.body}`);

      if (!ollamaRes.ok || !ollamaRes.body) {
        const errBody = await ollamaRes.text().catch(() => '');
        this.logger.error(`[chat/stream] Ollama error: ${ollamaRes.status} ${errBody.slice(0, 200)}`);
        res.write(`data: ${JSON.stringify({ error: `Ollama error: ${ollamaRes.status}` })}\n\n`);
        res.end();
        return;
      }

      const reader = ollamaRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      let tokenCount = 0;

      this.logger.log(`[chat/stream] reading chunks...`);

      const write = (data: string) => {
        res.write(data);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunkCount++;
        const raw = decoder.decode(value, { stream: true });
        buffer += raw;
        if (chunkCount <= 3) {
          this.logger.log(`[chat/stream] chunk ${chunkCount}: ${raw.slice(0, 200)}`);
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const raw = line.startsWith('data: ') ? line.slice(6) : line;
            if (raw === '[DONE]') {
              this.logger.log(`[chat/stream] finish_reason: done`);
              write('data: [DONE]\n\n');
              continue;
            }
            const obj = JSON.parse(raw);
            const token = obj.choices?.[0]?.delta?.content;
            if (token) {
              tokenCount++;
              write(`data: ${JSON.stringify({ token })}\n\n`);
            }
            if (obj.choices?.[0]?.finish_reason) {
              this.logger.log(`[chat/stream] finish_reason: ${obj.choices[0].finish_reason}`);
              write('data: [DONE]\n\n');
            }
          } catch (e) {
            if (chunkCount <= 3) {
              this.logger.warn(`[chat/stream] parse error on line: ${line.slice(0, 100)} — ${(e as Error).message}`);
            }
          }
        }
      }

      this.logger.log(`[chat/stream] done: ${chunkCount} chunks, ${tokenCount} tokens`);

      if (buffer.trim()) {
        try {
          const raw = buffer.startsWith('data: ') ? buffer.slice(6) : buffer;
          const obj = JSON.parse(raw);
          const token = obj.choices?.[0]?.delta?.content;
          if (token) {
            write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch {}
      }

      write('data: [DONE]\n\n');
      res.end();
    } catch (e) {
      this.logger.error(`[chat/stream] error: ${(e as Error).message}`);
      res.write(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
      res.end();
    }
  }
}
