import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { PaginationQuery } from '../../common/decorators/pagination-query.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a file (PDF or DOCX, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserDocument,
  ) {
    return this.uploadService.uploadFile(user._id.toString(), file);
  }

  @Get()
  @ApiOperation({ summary: 'List user uploads' })
  @PaginationQuery()
  async list(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const p = Math.max(1, page || 1);
    const l = Math.min(50, Math.max(1, limit || 10));
    return this.uploadService.getUserUploads(user._id.toString(), p, l);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an upload' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const deleted = await this.uploadService.deleteUpload(
      id,
      user._id.toString(),
    );
    if (!deleted) throw new NotFoundException('Upload not found');
    return { message: 'Upload deleted' };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a profile photo (JPEG, PNG, WebP, max 2MB)' })
  @ApiConsumes('multipart/form-data')
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserDocument,
  ) {
    return this.uploadService.uploadPhoto(user._id.toString(), file);
  }
}
