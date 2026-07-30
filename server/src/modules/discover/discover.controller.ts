import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DiscoverService } from './discover.service';
import { DiscoverCrawlService } from './discover-crawl.service';
import {
  UpsertPreferencesDto, TrackJobDto, UpdateTrackerJobDto, FeedQueryDto, DismissJobDto,
} from './dto';
import type { ActivityLogEntry, ChecklistState } from './schemas/job-application.schema';

@ApiTags('Discover')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discover')
export class DiscoverController {
  constructor(
    private discoverService: DiscoverService,
    private crawlService: DiscoverCrawlService,
  ) {}

  // ─── Feed ───

  @Get('feed')
  async getFeed(@Req() req: any, @Query() query: FeedQueryDto) {
    return this.discoverService.getFeed(req.user._id, query);
  }

  @Get('feed/stats')
  async getFeedStats(@Req() req: any) {
    return this.discoverService.getFeedStats(req.user._id);
  }

  @Post('hide/:jobId')
  async hideJob(@Req() req: any, @Param('jobId') jobId: string) {
    await this.discoverService.hideJob(req.user._id, jobId);
    return { success: true };
  }

  @Post('dismiss/:jobId')
  async dismissJob(@Req() req: any, @Param('jobId') jobId: string, @Body() dto: DismissJobDto) {
    await this.discoverService.dismissJob(req.user._id, jobId, dto);
    return { success: true };
  }

  // ─── Preferences ───

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    return this.discoverService.getPreferences(req.user._id);
  }

  @Post('preferences')
  async upsertPreferences(@Req() req: any, @Body() dto: UpsertPreferencesDto) {
    return this.discoverService.upsertPreferences(req.user._id, dto);
  }

  // ─── Tracker ───

  @Get('tracker')
  async getTracker(@Req() req: any) {
    return this.discoverService.getTracker(req.user._id);
  }

  @Post('tracker')
  async trackJob(@Req() req: any, @Body() dto: TrackJobDto) {
    return this.discoverService.trackJob(req.user._id, dto);
  }

  @Patch('tracker/:id')
  async updateTrackerJob(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTrackerJobDto,
  ) {
    return this.discoverService.updateTrackerJob(req.user._id, id, dto);
  }

  @Delete('tracker/:id')
  async deleteTrackerJob(@Req() req: any, @Param('id') id: string) {
    await this.discoverService.deleteTrackerJob(req.user._id, id);
    return { success: true };
  }

  @Get('tracker/stats')
  async getTrackerStats(@Req() req: any) {
    return this.discoverService.getTrackerStats(req.user._id);
  }

  // ─── Admin ───

  @Post('crawl/trigger')
  async triggerCrawl() {
    this.crawlService.runCrawlCycle().catch(() => {});
    return { success: true, message: 'Crawl cycle started' };
  }
}
