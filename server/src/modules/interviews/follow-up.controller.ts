import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { FollowUpService } from './follow-up.service';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class FollowUpController {
  private readonly logger = new Logger(FollowUpController.name);
  constructor(private followUpService: FollowUpService) {}

  @Get('sessions/:sessionId/follow-ups')
  async getFollowUps(
    @CurrentUser() user: UserDocument,
    @Param('sessionId') sessionId: string,
  ) {
    return this.followUpService.getFollowUps(sessionId, user._id.toString());
  }

  @Post('sessions/:sessionId/follow-ups/generate')
  async generateDraft(
    @CurrentUser() user: UserDocument,
    @Param('sessionId') sessionId: string,
  ) {
    return this.followUpService.generateDraft(sessionId, user._id.toString());
  }

  @Patch('follow-ups/:id')
  async updateFollowUp(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body()
    body: { draftContent?: string; status?: string; sentContent?: string },
  ) {
    return this.followUpService.updateFollowUp(id, user._id.toString(), body);
  }
}
