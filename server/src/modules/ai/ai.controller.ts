import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AiService } from './ai.service';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private ai: AiService) {}

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
}
