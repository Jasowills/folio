import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { ResearchService } from './research.service';

@ApiTags('Research')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('research')
export class ResearchController {
  constructor(private researchService: ResearchService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start company research' })
  async analyze(
    @Body('companyName') companyName: string,
    @Body('companyUrl') companyUrl: string | undefined,
    @Body('roleContext') roleContext: { roleTitle: string; resumeId?: string } | undefined,
    @CurrentUser() user: UserDocument,
  ) {
    if (!companyName) throw new BadRequestException('Company name is required');
    const jobId = await this.researchService.startJob(
      user._id.toString(),
      companyName,
      companyUrl,
      roleContext,
    );
    return { analysisId: jobId, status: 'queued' };
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Poll research status' })
  async status(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const job = await this.researchService.getJob(id);
    if (!job || job.userId.toString() !== user._id.toString()) {
      throw new NotFoundException('Research not found');
    }
    return job;
  }

  @Get('history')
  @ApiOperation({ summary: 'List user research history' })
  async history(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const p = Math.max(1, page || 1);
    const l = Math.min(50, Math.max(1, limit || 10));
    return this.researchService.getUserJobs(user._id.toString(), p, l);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a research job' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const deleted = await this.researchService.deleteJob(id, user._id.toString());
    if (!deleted) throw new NotFoundException('Research not found');
    return { message: 'Research deleted' };
  }
}
