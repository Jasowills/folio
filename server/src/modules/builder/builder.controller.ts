import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { BuilderService } from './builder.service';

@ApiTags('Builder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('builder')
export class BuilderController {
  private readonly logger = new Logger(BuilderController.name);

  constructor(private builder: BuilderService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new builder session' })
  async start(@CurrentUser() user: UserDocument) {
    this.logger.log(`[start] userId=${user._id.toString()}`);
    const resume = await this.builder.start(user._id.toString());
    return { resumeId: resume._id.toString() };
  }

  @Get(':resumeId')
  @ApiOperation({ summary: 'Get builder state for a resume' })
  async getState(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const resume = await this.builder.getState(resumeId, user._id.toString());
    return resume;
  }

  @Patch(':resumeId/state')
  @ApiOperation({ summary: 'Save wizard step progress' })
  async saveState(
    @Param('resumeId') resumeId: string,
    @Body() body: { wizardState: Record<string, unknown> },
    @CurrentUser() user: UserDocument,
  ) {
    const resume = await this.builder.saveState(resumeId, user._id.toString(), body.wizardState);
    return resume;
  }

  @Post('generate-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate summary with AI (SSE streaming)' })
  async generateSummary(
    @Body() body: {
      resumeId: string;
      targetRole: string;
      level: string;
      industry: string;
      years: number;
      achievements: string;
      tools: string[];
      jobDescription?: string;
    },
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    this.logger.log(`[generateSummary] userId=${user._id.toString()} role="${body.targetRole}"`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      await this.builder.generateSummary(
        user._id.toString(),
        body.resumeId,
        body,
        (chunk: string, done: boolean) => {
          res.write(`data: ${JSON.stringify({ text: chunk, done })}\n\n`);
          if (done) res.end();
        },
      );
    } catch (err) {
      const message = (err as Error)?.message || 'Generation failed';
      res.write(`data: ${JSON.stringify({ error: message, done: true })}\n\n`);
      res.end();
    }
  }

  @Post('generate-bullets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate experience bullets with AI (SSE streaming)' })
  async generateBullets(
    @Body() body: {
      resumeId: string;
      jobTitle: string;
      company: string;
      rawNotes: string;
      targetRole: string;
      level: string;
      jobDescription?: string;
    },
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    this.logger.log(`[generateBullets] userId=${user._id.toString()} jobTitle="${body.jobTitle}"`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      await this.builder.generateBullets(
        user._id.toString(),
        body.resumeId,
        body,
        (chunk: string, done: boolean) => {
          res.write(`data: ${JSON.stringify({ text: chunk, done })}\n\n`);
          if (done) res.end();
        },
      );
    } catch (err) {
      const message = (err as Error)?.message || 'Generation failed';
      res.write(`data: ${JSON.stringify({ error: message, done: true })}\n\n`);
      res.end();
    }
  }

  @Post(':resumeId/chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with AI resume builder (SSE streaming with action tags)' })
  async chat(
    @Param('resumeId') resumeId: string,
    @Body() body: {
      message: string;
      history?: Array<{ role: string; content: string }>;
      resumeSnapshot?: Record<string, unknown>;
      currentTemplate?: string;
      currentColor?: string;
      currentFont?: string;
    },
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    this.logger.log(`[chat] resumeId=${resumeId} userId=${user._id.toString()} message="${body.message?.slice(0, 80)}"`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      await this.builder.chat(
        user._id.toString(),
        resumeId,
        body,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        },
      );
      res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
      res.end();
    } catch (err) {
      const msg = (err as Error)?.message || 'Chat failed';
      res.write(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`);
      res.end();
    }
  }

  @Post(':resumeId/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize builder session — save wizard data as resume fields' })
  async finish(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const resume = await this.builder.finish(resumeId, user._id.toString());
    return resume;
  }

  @Post('generate-project-description')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate project description with AI (SSE streaming)' })
  async generateProjectDescription(
    @Body() body: {
      resumeId: string;
      projectName: string;
      rawDescription: string;
      targetRole: string;
    },
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      await this.builder.generateProjectDescription(
        user._id.toString(),
        body.resumeId,
        body,
        (chunk: string, done: boolean) => {
          res.write(`data: ${JSON.stringify({ text: chunk, done })}\n\n`);
          if (done) res.end();
        },
      );
    } catch (err) {
      const message = (err as Error)?.message || 'Generation failed';
      res.write(`data: ${JSON.stringify({ error: message, done: true })}\n\n`);
      res.end();
    }
  }

  @Post('suggest-skills')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-suggested skills for the target role' })
  async suggestSkills(
    @Body() body: {
      resumeId: string;
      targetRole: string;
      level: string;
      industry: string;
      existingSkills: string[];
      jobDescription?: string;
    },
    @CurrentUser() user: UserDocument,
  ) {
    const skills = await this.builder.suggestSkills(
      user._id.toString(),
      body.resumeId,
      body,
    );
    return skills;
  }
}
