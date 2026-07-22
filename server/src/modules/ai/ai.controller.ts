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
    const hasOllama = !!process.env.OLLAMA_BASE_URL;
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    this.logger.log(`[init] providers: ollama=${hasOllama} groq=${hasGroq} openrouter=${hasOpenRouter}`);
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

    try {
      const stream = await this.ai.stream(systemPrompt, userPrompt);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      let tokenCount = 0;

      this.logger.log(`[chat/stream] reading chunks...`);

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
              res.write('data: [DONE]\n\n');
              continue;
            }
            const obj = JSON.parse(raw);
            const token = obj.choices?.[0]?.delta?.content;
            if (token) {
              tokenCount++;
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
            if (obj.choices?.[0]?.finish_reason) {
              res.write('data: [DONE]\n\n');
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      if (buffer.trim()) {
        try {
          const raw = buffer.startsWith('data: ') ? buffer.slice(6) : buffer;
          const obj = JSON.parse(raw);
          const token = obj.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch {}
      }

      this.logger.log(`[chat/stream] done: ${chunkCount} chunks, ${tokenCount} tokens`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e) {
      this.logger.error(`[chat/stream] error: ${(e as Error).message}`);
      res.write(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
      res.end();
    }
  }
}
