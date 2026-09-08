import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompanyVerificationAgent } from './company-verification.agent';
import {
  CompanyVerificationCache,
  CompanyVerificationCacheDocument,
} from './schemas/company-verification-cache.schema';
import type {
  CompanyVerificationInput,
  CompanyVerificationResult,
} from './company-verification.types';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class CompanyVerificationService {
  private readonly logger = new Logger(CompanyVerificationService.name);

  constructor(
    @InjectModel(CompanyVerificationCache.name)
    private cacheModel: Model<CompanyVerificationCacheDocument>,
    private agent: CompanyVerificationAgent,
  ) {}

  async verify(
    input: CompanyVerificationInput,
  ): Promise<CompanyVerificationResult> {
    const cached = await this.getCached(input.companyName);
    if (cached) return cached;

    const result = await this.agent.verify(input);

    await this.storeCache(input.companyName, result);

    return result;
  }

  async getCachedResult(
    companyName: string,
  ): Promise<CompanyVerificationResult | null> {
    return this.getCached(companyName);
  }

  private async getCached(
    companyName: string,
  ): Promise<CompanyVerificationResult | null> {
    try {
      const cached = await this.cacheModel
        .findOne({ companyName })
        .sort({ createdAt: -1 })
        .exec();

      if (!cached) return null;

      const age = Date.now() - new Date(cached.createdAt).getTime();
      if (age > CACHE_TTL_MS) {
        await this.cacheModel.deleteOne({ _id: cached._id }).exec();
        return null;
      }

      this.logger.log(`Returning cached verification for "${companyName}"`);
      return cached.result as CompanyVerificationResult;
    } catch (err) {
      this.logger.warn(`Cache lookup failed for "${companyName}":`, err);
      return null;
    }
  }

  private async storeCache(
    companyName: string,
    result: CompanyVerificationResult,
  ): Promise<void> {
    try {
      await this.cacheModel.create({
        companyName,
        result,
        createdAt: new Date(),
        ttlMs: CACHE_TTL_MS,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to cache verification for "${companyName}":`,
        err,
      );
    }
  }
}
