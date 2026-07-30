import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CompanyVerificationService } from './company-verification.service';
import type { CompanyVerificationInput, CompanyVerificationResult } from './company-verification.types';

@Controller('company-verification')
@UseGuards(JwtAuthGuard)
export class CompanyVerificationController {
  constructor(private readonly service: CompanyVerificationService) {}

  @Post('verify')
  async verify(
    @CurrentUser() user: any,
    @Body() input: CompanyVerificationInput,
  ): Promise<{ data: CompanyVerificationResult }> {
    const result = await this.service.verify(input);
    return { data: result };
  }

  @Get('cached/:companyName')
  async getCached(
    @CurrentUser() user: any,
    @Param('companyName') companyName: string,
  ): Promise<{ data: CompanyVerificationResult | null }> {
    const result = await this.service.getCachedResult(companyName);
    return { data: result };
  }
}
