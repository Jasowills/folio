import {
  Controller,
  Get,
  Post,
  Delete,
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
import { CoverLettersService } from './cover-letters.service';

@ApiTags('Cover Letters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cover-letters')
export class CoverLettersController {
  constructor(private coverLettersService: CoverLettersService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a cover letter with AI' })
  async generate(
    @Body()
    body: {
      resumeId: string;
      jobTitle: string;
      companyName: string;
      jobDescription?: string;
      tone?: string;
    },
    @CurrentUser() user: UserDocument,
  ) {
    return this.coverLettersService.generate(
      user._id.toString(),
      body.resumeId,
      body.jobTitle,
      body.companyName,
      body.jobDescription,
      body.tone,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List cover letters' })
  async list(@CurrentUser() user: UserDocument) {
    return this.coverLettersService.findByUser(user._id.toString());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cover letter by id' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.coverLettersService.findById(id, user._id.toString());
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a cover letter' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    await this.coverLettersService.delete(id, user._id.toString());
    return { message: 'Cover letter deleted' };
  }
}
