import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { CoverLettersService } from './cover-letters.service';

@ApiTags('Cover Letters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cover-letters')
export class CoverLettersController {
  constructor(private coverLettersService: CoverLettersService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a cover letter with AI (SSE streaming)' })
  async generate(
    @Body()
    body: {
      resumeId: string;
      jobTitle: string;
      company: string;
      jobDescription?: string;
      tone?: string;
    },
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      await this.coverLettersService.generateStream(
        user._id.toString(),
        body.resumeId,
        body.jobTitle,
        body.company,
        body.jobDescription,
        body.tone || 'professional',
        (chunk: string, done: boolean) => {
          res.write(`data: ${JSON.stringify({ text: chunk, done })}\n\n`);
          if (done) res.end();
        },
      );
    } catch (err) {
      const message = (err as Error)?.message || 'Generation failed';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }

  @Get()
  @ApiOperation({ summary: 'List cover letters' })
  async list(@CurrentUser() user: UserDocument) {
    return this.coverLettersService.findByUser(user._id.toString());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cover letter by id' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.coverLettersService.findById(id, user._id.toString());
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a cover letter' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    await this.coverLettersService.delete(id, user._id.toString());
    return { message: 'Cover letter deleted' };
  }
}
