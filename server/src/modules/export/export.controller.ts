import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { ExportService } from './export.service';

@ApiTags('Export')
@Controller('export')
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(private exportService: ExportService) {}

  @Post('guest-report')
  @ApiOperation({ summary: 'Export guest analysis report as PDF' })
  async guestReport(
    @Body() data: Record<string, unknown>,
    @Res() res: Response,
  ) {
    this.logger.log(`guestReport: generating PDF for guest analysis`);

    const html = await this.exportService.guestReportHtml(data as any);

    res.set({
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html),
    });
    res.end(html);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':resumeId')
  @ApiOperation({ summary: 'Export resume as HTML (client converts to PDF)' })
  async exportHtml(
    @Param('resumeId') resumeId: string,
    @Query('template') template: string | undefined,
    @Query('color') color: string | undefined,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    this.logger.log(
      `exportHtml: request for resume ${resumeId}, template=${template || 'default'}, color=${color || 'default'}`,
    );

    const html = await this.exportService.exportHtml(
      resumeId,
      user._id.toString(),
      template,
      color,
    );

    res.set({
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html),
    });
    res.end(html);
  }
}
