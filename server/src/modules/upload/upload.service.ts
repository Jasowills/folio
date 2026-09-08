import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { StorageService } from '../storage/storage.service';
import { Upload, UploadDocument } from './schemas/upload.schema';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_SIZE = 5 * 1024 * 1024;

const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PHOTO_MAX_SIZE = 2 * 1024 * 1024;

@Injectable()
export class UploadService {
  constructor(
    @InjectModel(Upload.name) private uploadModel: Model<UploadDocument>,
    private storage: StorageService,
  ) {}

  async uploadFile(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Only PDF and DOCX files are allowed');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File exceeds 5MB limit');
    }

    const ext = path.extname(file.originalname);
    const publicId = `${randomUUID()}${ext}`;

    const { url } = await this.storage.upload(file.buffer, {
      folder: 'folio-uploads',
      publicId,
      resourceType: 'raw',
    });

    try {
      const upload = await this.uploadModel.create({
        userId,
        originalName: file.originalname,
        key: publicId,
        url,
        mimeType: file.mimetype,
        size: file.size,
      });
      return upload;
    } catch (err) {
      // ADV-0001: compensate orphaned Cloudinary asset if DB fails
      await this.storage.delete(publicId, 'raw').catch(() => {});
      throw err;
    }
  }

  async getUserUploads(userId: string, page: number, limit: number) {
    const [uploads, total] = await Promise.all([
      this.uploadModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.uploadModel.countDocuments({ userId }),
    ]);
    return { uploads, total };
  }

  async deleteUpload(uploadId: string, userId: string): Promise<boolean> {
    const upload = await this.uploadModel
      .findOne({ _id: uploadId, userId })
      .exec();
    if (!upload) return false;

    await this.storage.delete(upload.key, 'raw');
    await this.uploadModel.deleteOne({ _id: uploadId }).exec();
    return true;
  }

  async uploadPhoto(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!PHOTO_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }
    if (file.size > PHOTO_MAX_SIZE) {
      throw new BadRequestException('Photo exceeds 2MB limit');
    }

    const ext = path.extname(file.originalname);
    const publicId = `photos/${userId}/${randomUUID()}${ext}`;

    const { url } = await this.storage.upload(file.buffer, {
      folder: 'folio-photos',
      publicId,
      resourceType: 'image',
    });

    return { url, publicId };
  }
}
