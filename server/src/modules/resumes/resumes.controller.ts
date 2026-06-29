import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Logger,
  StreamableFile,
  Header,
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { ResumesService } from './resumes.service';
import { ResumeParserService } from './resume-parser.service';
import { StorageService } from '../storage/storage.service';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

@ApiTags('Resumes')
@Controller('resumes')
export class ResumesController {
  private readonly logger = new Logger(ResumesController.name);

  constructor(
    private resumesService: ResumesService,
    private storage: StorageService,
    private resumeParser: ResumeParserService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new blank resume' })
  async create(@CurrentUser() user: UserDocument) {
    return this.resumesService.create(user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List user resumes' })
  async list(@CurrentUser() user: UserDocument) {
    return this.resumesService.findByUser(user._id.toString());
  }

  @Get('guest-pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline')
  @ApiOperation({ summary: 'Get guest upload PDF file' })
  async getGuestPdf(
    @Query('url') url: string,
  ) {
    if (!url) throw new NotFoundException('No url provided');
    this.logger.log(`getGuestPdf: fetching url="${url.slice(0, 100)}..."`);
    try {
      const start = Date.now();
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(`getGuestPdf: Cloudinary returned ${res.status} — ${text.slice(0, 200)}`);
        throw new Error(`Cloudinary fetch failed: ${res.status}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      this.logger.log(`getGuestPdf: returning ${buffer.length} bytes in ${Date.now() - start}ms`);
      return new StreamableFile(buffer);
    } catch (err) {
      this.logger.error(`getGuestPdf: failed — ${(err as Error).message}`);
      throw new Error('Failed to fetch PDF from Cloudinary');
    }
  }

  @Get('guest-result/:token')
  @ApiOperation({ summary: 'Get cached guest analysis result by token' })
  async getGuestResult(
    @Param('token') token: string,
  ) {
    this.logger.log(`getGuestResult: fetching token="${token.slice(0, 12)}..."`);
    const data = await this.resumesService.getGuestResult(token);
    if (!data) throw new NotFoundException('Result not found or expired');
    this.logger.log(`getGuestResult: keys=${Object.keys(data).join(',')}, fileUrl="${(data as any)?.fileUrl}", rawText length=${(data as any)?.rawText?.length}, redFlags=${(data as any)?.redFlags?.length}, score=${(data as any)?.score}`);
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get resume by id' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.resumesService.findById(id, user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Save structured resume data' })
  async save(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: UserDocument,
  ) {
    return this.resumesService.saveStructured(id, user._id.toString(), body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('upload-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file and save it (no AI extraction)' })
  @ApiConsumes('multipart/form-data')
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserDocument,
  ) {
    this.validateFile(file);
    const text = await this.extractText(file);
    this.logger.log(`uploadFile: extracted ${text.length} chars from ${file.originalname}`);
    const uploadResult = await this.storage.upload(file.buffer, {
      folder: 'folio-uploads',
      publicId: file.originalname.replace(/\.[^/.]+$/, '') + '-' + Date.now(),
      resourceType: 'raw',
    }).catch((err) => {
      this.logger.error(`Cloudinary upload failed for ${file.originalname}: ${err.message}`);
      return null;
    });
    this.logger.log(`uploadFile: Cloudinary result — url=${uploadResult?.url || '(empty)'}, publicId=${uploadResult?.publicId || '(empty)'}`);
    const saved = await this.resumesService.uploadFile(
      user._id.toString(),
      text,
      uploadResult?.url || '',
      uploadResult?.publicId || '',
    );
    this.logger.log(`uploadFile: saved resume ${saved._id} — fileUrl=${saved.fileUrl || '(empty)'}, cloudinaryPublicId=${saved.cloudinaryPublicId || '(empty)'}`);
    return saved;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/analyze')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Run AI extraction + analysis on an existing resume' })
  async analyze(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.resumesService.analyzeResume(id, user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/review-stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Stream resume review analysis via SSE' })
  async reviewStream(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Res() res: any,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const resume = await this.resumesService.analyzeWithProgress(
        id,
        user._id.toString(),
        (step, label) => {
          sendEvent('progress', { step, label });
        },
      );

      sendEvent('complete', resume.toJSON());
    } catch (err) {
      const message = (err as Error).message || 'Analysis failed';
      sendEvent('error', { message });
    } finally {
      res.end();
    }
  }

  @Post('guest-extract')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Upload and analyze a resume without signing in' })
  @ApiConsumes('multipart/form-data')
  async guestExtract(
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateFile(file);
    this.logger.log(`guest-extract: received file ${file?.originalname}, type: ${file?.mimetype}, size: ${file?.size}`);
    const text = (await this.extractText(file)) || '';
    this.logger.log(`guest-extract: extracted ${text.length} chars of text`);
    if (!text) {
      this.logger.error('guest-extract: no text extracted, returning empty result');
      return { score: 0, issues: [], redFlags: [], resumeText: '' };
    }
    const { url, publicId } = await this.storage.upload(file.buffer, {
      folder: 'folio-uploads',
      publicId: file.originalname.replace(/\.[^/.]+$/, '') + '-' + Date.now(),
      resourceType: 'raw',
    }).catch((err) => {
      this.logger.error(`Cloudinary guest-upload failed for ${file.originalname}: ${err.message}`);
      return { url: '', publicId: '' };
    });
    return this.resumesService.guestExtractFromText(text, url, publicId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/rewrite-bullet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI rewrite a bullet point' })
  async rewriteBullet(
    @Param('id') id: string,
    @Body() body: { bullet: string; context?: string },
    @CurrentUser() user: UserDocument,
  ) {
    return this.resumesService.rewriteBullet(
      id,
      user._id.toString(),
      body.bullet,
      body.context,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline')
  @ApiOperation({ summary: 'Get resume PDF file for inline display' })
  async getPdf(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const resume = await this.resumesService.findById(id, user._id.toString());
    if (!resume.fileUrl) throw new NotFoundException('No PDF file for this resume');

    this.logger.log(`getPdf: fetching ${resume.fileUrl.slice(0, 100)}...`);
    try {
      const res = await fetch(resume.fileUrl);
      if (!res.ok) {
        this.logger.error(`getPdf: Cloudinary returned ${res.status} for ${resume.fileUrl.slice(0, 80)}`);
        throw new Error(`Cloudinary fetch failed: ${res.status}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      this.logger.log(`getPdf: returned ${buffer.length} bytes`);
      return new StreamableFile(buffer);
    } catch (err) {
      this.logger.error(`getPdf: failed — ${(err as Error).message}`);
      throw new Error('Failed to fetch PDF from Cloudinary');
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    await this.resumesService.delete(id, user._id.toString());
    return { message: 'Resume deleted' };
  }

  private async extractText(
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      this.logger.warn('extractText: no file provided');
      return '';
    }
    try {
      if (file.mimetype === 'application/pdf') {
        this.logger.log(`extractText: parsing PDF with pdf-parse (${file.size} bytes)`);
        const data = await pdfParse(file.buffer);
        let text = data.text || '';
        const totalPages = data.numpages || 1;
        this.logger.log(`extractText: pdf-parse returned ${text.length} chars, ${totalPages} pages`);

        const quality = this.resumeParser.assessQuality(text, totalPages);
        this.logger.log(`extractText: quality score = ${quality.score}, issues = ${quality.issues.join(', ')}, requiresFallback = ${quality.requiresFallback}`);

        if (quality.requiresFallback) {
          this.logger.log('extractText: attempting pdfplumber fallback');
          const pythonScript = path.resolve(__dirname, '..', '..', '..', 'scripts', 'extract_pdf.py');
          if (fs.existsSync(pythonScript)) {
            try {
              const tempFile = path.join(process.cwd(), `temp_pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
              fs.writeFileSync(tempFile, file.buffer);
              const { stdout } = await execFileAsync('python3', [pythonScript, tempFile], { timeout: 30000 });
              fs.unlinkSync(tempFile);
              const fallbackResult = JSON.parse(stdout);
              if (fallbackResult.text && !fallbackResult.error) {
                text = fallbackResult.text;
                this.logger.log(`extractText: pdfplumber returned ${text.length} chars, ${fallbackResult.pages} pages`);
                const fallbackQuality = this.resumeParser.assessQuality(text, fallbackResult.pages || totalPages);
                if (fallbackQuality.score < 0.4) {
                  this.logger.error('extractText: quality < 0.4 even after pdfplumber fallback');
                }
              } else {
                this.logger.error(`extractText: pdfplumber error — ${fallbackResult.error || 'empty result'}`);
              }
            } catch (fallbackErr) {
              this.logger.error(`extractText: pdfplumber fallback failed: ${(fallbackErr as Error).message}`);
            }
          } else {
            this.logger.warn(`extractText: pdfplumber script not found at ${pythonScript}`);
          }
        }

        return text.trim();
      }
      this.logger.log(`extractText: parsing DOCX (${file.size} bytes)`);
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      this.logger.log(`extractText: DOCX parsing returned ${result.value?.length || 0} chars`);
      return result.value;
    } catch (err) {
      this.logger.error(`extractText: failed to parse ${file.mimetype}: ${(err as Error).message}`);
      return '';
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new PayloadTooLargeException('File size exceeds 15MB limit');
    }
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and DOCX files are accepted');
    }
  }
}
