import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { SalaryService } from './salary.service';

@ApiTags('Salary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salary')
export class SalaryController {
  private readonly logger = new Logger(SalaryController.name);
  constructor(private salaryService: SalaryService) {}

  @Post('offers')
  async createOffer(
    @CurrentUser() user: UserDocument,
    @Body()
    body: {
      companyName: string;
      roleTitle: string;
      location?: string;
      baseSalary?: number;
      equityValue?: number;
      bonusPercent?: number;
      benefits?: string[];
      deadline?: string;
      targetBaseSalary?: number;
      notes?: string;
    },
  ) {
    return this.salaryService.createOffer(user._id.toString(), {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
    });
  }

  @Get('offers')
  async getOffers(@CurrentUser() user: UserDocument) {
    return this.salaryService.getOffers(user._id.toString());
  }

  @Get('offers/:id')
  async getOffer(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.salaryService.getOffer(id, user._id.toString());
  }

  @Patch('offers/:id')
  async updateOffer(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      companyName: string;
      roleTitle: string;
      baseSalary: number;
      equityValue: number;
      bonusPercent: number;
      benefits: string[];
      deadline: string;
      targetBaseSalary: number;
      status: string;
      notes: string;
    }>,
  ) {
    const data: Record<string, unknown> = {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
    };
    return this.salaryService.updateOffer(id, user._id.toString(), data);
  }

  @Delete('offers/:id')
  async deleteOffer(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    await this.salaryService.deleteOffer(id, user._id.toString());
    return { success: true };
  }

  @Post('offers/:id/strategy')
  async generateStrategy(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.salaryService.generateStrategy(user._id.toString(), id);
  }

  @Get('offers/:id/negotiation')
  async getNegotiation(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.salaryService.getNegotiation(id, user._id.toString());
  }

  @Patch('offers/:id/negotiation')
  async updateNegotiation(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() body: { script?: string; stage?: string; outcome?: string },
  ) {
    return this.salaryService.updateNegotiation(id, user._id.toString(), body);
  }

  @Get('negotiations')
  async getAllNegotiations(@CurrentUser() user: UserDocument) {
    return this.salaryService.getAllNegotiations(user._id.toString());
  }
}
