import { Injectable, Inject, Logger } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './storage.module-definition';
import type { StorageModuleConfig } from './storage.module-definition';

export interface UploadResult {
  publicId: string;
  url: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private cloudinary: typeof import('cloudinary').v2;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private config: StorageModuleConfig,
  ) {
    this.cloudinary = require('cloudinary').v2;
    this.cloudinary.config({
      cloud_name: this.config.cloudName,
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
    });
  }

  async upload(
    buffer: Buffer,
    options: {
      folder: string;
      publicId?: string;
      resourceType?: 'image' | 'raw';
    },
  ): Promise<UploadResult> {
    this.logger.log(`upload: starting upload — size=${buffer.length} bytes, folder="${options.folder}", publicId="${options.publicId}", resourceType="${options.resourceType || 'raw'}"`);
    const start = Date.now();
    const base64 = buffer.toString('base64');
    const result = await this.cloudinary.uploader.upload(
      `data:application/octet-stream;base64,${base64}`,
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType || 'raw',
        overwrite: true,
      },
    );
    const duration = Date.now() - start;
    this.logger.log(`upload: done — publicId="${result.public_id}", url="${result.secure_url}", duration=${duration}ms`);
    return { publicId: result.public_id, url: result.secure_url };
  }

  async downloadBuffer(
    publicId: string,
    resourceType: 'image' | 'raw' = 'raw',
  ): Promise<Buffer> {
    this.logger.log(`downloadBuffer: fetching — publicId="${publicId}", resourceType="${resourceType}"`);
    const start = Date.now();

    const url = this.cloudinary.utils.private_download_url(publicId, 'pdf', {
      resource_type: resourceType,
      type: 'upload',
      attachment: false,
    });
    this.logger.log(`downloadBuffer: private_download_url generated in ${Date.now() - start}ms — ${url.slice(0, 100)}...`);

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`downloadBuffer: fetch returned ${res.status} — ${text.slice(0, 300)}`);
      throw new Error(`Cloudinary download failed: ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    this.logger.log(`downloadBuffer: done — ${buffer.length} bytes from ${resourceType} resource, total=${Date.now() - start}ms`);
    return buffer;
  }

  async delete(
    publicId: string,
    resourceType?: 'image' | 'raw',
  ): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'raw',
    });
  }
}
