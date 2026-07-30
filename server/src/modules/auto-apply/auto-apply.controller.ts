import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApplyFlowService } from './apply-flow.service';
import {
  ApproveJobsDto, ConfirmSubmissionDto, StoreAnswerDto, UpdateAutoApplyConfigDto,
} from './dto/auto-apply.dto';

@ApiTags('Auto-Apply')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auto-apply')
export class AutoApplyController {
  constructor(private applyFlow: ApplyFlowService) {}

  // ─── Submissions ───

  @Post('approve')
  async approveJobs(@Req() req: any, @Body() dto: ApproveJobsDto) {
    return this.applyFlow.approveJobs(req.user._id, dto.jobIds, dto.resumeId, dto.coverLetter);
  }

  @Post(':submissionId/fill')
  async fillApplication(@Req() req: any, @Param('submissionId') submissionId: string) {
    return this.applyFlow.fillApplication(req.user._id, submissionId);
  }

  @Get(':submissionId/preview')
  async getPreview(@Req() req: any, @Param('submissionId') submissionId: string) {
    return this.applyFlow.getPreview(req.user._id, submissionId);
  }

  @Post(':submissionId/confirm')
  async confirmAndSubmit(
    @Req() req: any,
    @Param('submissionId') submissionId: string,
    @Body() dto: ConfirmSubmissionDto,
  ) {
    return this.applyFlow.confirmAndSubmit(req.user._id, submissionId, dto.updatedFields);
  }

  @Post(':submissionId/retry')
  async retrySubmission(@Req() req: any, @Param('submissionId') submissionId: string) {
    return this.applyFlow.retrySubmission(req.user._id, submissionId);
  }

  @Get()
  async getSubmissions(@Req() req: any) {
    return this.applyFlow.getSubmissions(req.user._id);
  }

  // ─── Answers Bank (before :submissionId) ───

  @Get('answers')
  async getAnswersBank(@Req() req: any) {
    return this.applyFlow.getAnswersBank(req.user._id);
  }

  @Post('answers')
  async storeAnswer(@Req() req: any, @Body() dto: StoreAnswerDto) {
    return this.applyFlow.storeAnswer(req.user._id, dto.question, dto.answer, dto.category);
  }

  @Delete('answers/:answerId')
  async deleteAnswer(@Req() req: any, @Param('answerId') answerId: string) {
    await this.applyFlow.deleteAnswer(req.user._id, answerId);
    return { success: true };
  }

  // ─── Config (before :submissionId) ───

  @Get('config')
  async getConfig(@Req() req: any) {
    return this.applyFlow.getConfig(req.user._id);
  }

  @Patch('config')
  async updateConfig(@Req() req: any, @Body() dto: UpdateAutoApplyConfigDto) {
    return this.applyFlow.upsertConfig(req.user._id, dto);
  }

  // ─── Submission-specific (after static routes) ───

  @Get(':submissionId')
  async getSubmission(@Req() req: any, @Param('submissionId') submissionId: string) {
    return this.applyFlow.getSubmissionById(req.user._id, submissionId);
  }
}
