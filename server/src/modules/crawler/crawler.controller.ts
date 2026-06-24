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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/decorators/pagination-query.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { CrawlerService } from './crawler.service';

@ApiTags('Crawler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crawler')
export class CrawlerController {
  constructor(private crawlerService: CrawlerService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start portfolio analysis' })
  async analyze(
    @Body('portfolioUrl') portfolioUrl: string,
    @Body('resumeId') resumeId: string,
    @CurrentUser() user: UserDocument,
  ) {
    console.log('[Crawler] analyze called', { userId: user._id.toString(), portfolioUrl, resumeId });
    if (!portfolioUrl) throw new BadRequestException('Portfolio URL is required');
    const analysisId = await this.crawlerService.startAnalysis(
      user._id.toString(),
      portfolioUrl,
      resumeId,
    );
    console.log('[Crawler] analysis created', { analysisId });
    return { analysisId, status: 'pending' };
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Poll analysis status' })
  async status(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const job = await this.crawlerService.getJob(id);
    if (!job || job.userId.toString() !== user._id.toString()) {
      throw new NotFoundException('Analysis not found');
    }
    return job;
  }

  @Get('history')
  @ApiOperation({ summary: 'List user analysis history' })
  @PaginationQuery()
  async history(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const p = Math.max(1, page || 1);
    const l = Math.min(50, Math.max(1, limit || 10));
    return this.crawlerService.getUserJobs(user._id.toString(), p, l);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an analysis' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const deleted = await this.crawlerService.deleteJob(
      id,
      user._id.toString(),
    );
    if (!deleted) throw new NotFoundException('Analysis not found');
    return { message: 'Analysis deleted' };
  }
}
