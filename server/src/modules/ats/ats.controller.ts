import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AtsService } from './ats.service';

@ApiTags('ATS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ats')
export class AtsController {
  constructor(private atsService: AtsService) {}

  @Post('score')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Score a resume against a job description' })
  async score(
    @Body()
    body: {
      resumeId: string;
      jobDescription?: string;
      jobUrl?: string;
      jobTitle?: string;
      companyName?: string;
    },
    @CurrentUser() user: UserDocument,
  ) {
    return this.atsService.score(
      user._id.toString(),
      body.resumeId,
      body.jobDescription,
      body.jobUrl,
      body.jobTitle,
      body.companyName,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get ATS scoring history' })
  async history(@CurrentUser() user: UserDocument) {
    return this.atsService.history(user._id.toString());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ATS score by id' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.atsService.getById(id, user._id.toString());
  }
}
