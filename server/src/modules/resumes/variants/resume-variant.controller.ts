import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ResumeVariantService } from './resume-variant.service';

@ApiTags('Resume Variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ResumeVariantController {
  constructor(private variantService: ResumeVariantService) {}

  @Post('resumes/:baseResumeId/variants')
  @ApiOperation({ summary: 'Create a resume variant (tailored version)' })
  async create(
    @Param('baseResumeId') baseResumeId: string,
    @Body()
    body: {
      templateId: string;
      tailoredData: Record<string, unknown>;
      tailoredForJobId?: string;
      label?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.variantService.create(
      user._id.toString(),
      baseResumeId,
      body.tailoredData,
      body.templateId,
      { tailoredForJobId: body.tailoredForJobId, label: body.label },
    );
  }

  @Get('resumes/:baseResumeId/variants')
  @ApiOperation({ summary: 'List variants for a base resume' })
  async list(
    @Param('baseResumeId') baseResumeId: string,
    @CurrentUser() user: any,
  ) {
    return this.variantService.findByBaseResume(
      user._id.toString(),
      baseResumeId,
    );
  }

  @Get('resume-variants/:id/render')
  @ApiOperation({
    summary: 'Resolve variant diff against base, return full ResumeData',
  })
  async render(@Param('id') id: string, @CurrentUser() user: any) {
    return this.variantService.render(user._id.toString(), id);
  }

  @Get('resume-variants/:id/diff/:compareToId')
  @ApiOperation({ summary: 'Get structured diff for UI rendering' })
  async diff(
    @Param('id') id: string,
    @Param('compareToId') compareToId: string,
    @CurrentUser() user: any,
  ) {
    return this.variantService.diff(user._id.toString(), id, compareToId);
  }

  @Get('resume-variants/performance')
  @ApiOperation({ summary: 'Aggregated outcome stats per variant/template' })
  async performance(@CurrentUser() user: any) {
    return this.variantService.getPerformance(user._id.toString());
  }
}
