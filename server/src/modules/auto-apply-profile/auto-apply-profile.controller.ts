import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AutoApplyProfileService } from './auto-apply-profile.service';
import {
  UpdateLogisticsDto,
  CreateCustomQaDto,
  UpdateCustomQaDto,
  UpdateStyleDto,
} from './auto-apply-profile.dto';

@ApiTags('Auto-Apply Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auto-apply-profile')
export class AutoApplyProfileController {
  constructor(private readonly profileService: AutoApplyProfileService) {}

  @Get()
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user._id);
  }

  @Put('logistics')
  async updateLogistics(@Req() req: any, @Body() dto: UpdateLogisticsDto) {
    return this.profileService.updateLogistics(req.user._id, dto);
  }

  @Post('custom-qa')
  async addCustomQa(@Req() req: any, @Body() dto: CreateCustomQaDto) {
    return this.profileService.addCustomQa(req.user._id, dto);
  }

  @Patch('custom-qa/:qaId')
  async updateCustomQa(
    @Req() req: any,
    @Param('qaId') qaId: string,
    @Body() dto: UpdateCustomQaDto,
  ) {
    return this.profileService.updateCustomQa(req.user._id, qaId, dto);
  }

  @Delete('custom-qa/:qaId')
  async deleteCustomQa(@Req() req: any, @Param('qaId') qaId: string) {
    return this.profileService.deleteCustomQa(req.user._id, qaId);
  }

  @Put('style')
  async updateStyle(@Req() req: any, @Body() dto: UpdateStyleDto) {
    return this.profileService.updateStyle(req.user._id, dto);
  }

  @Get('completion-status')
  async getCompletionStatus(@Req() req: any) {
    return this.profileService.getCompletionStatus(req.user._id);
  }

  @Put('wizard-step')
  async updateWizardStep(@Req() req: any, @Body() body: { step: number }) {
    return this.profileService.updateWizardStep(req.user._id, body.step);
  }
}
