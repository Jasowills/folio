import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { StorageModule } from './modules/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { ResumesModule } from './modules/resumes/resumes.module';
import { CoverLettersModule } from './modules/cover-letters/cover-letters.module';
import { AtsModule } from './modules/ats/ats.module';
import { StatsModule } from './modules/stats/stats.module';
import { ExportModule } from './modules/export/export.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { ResearchModule } from './modules/research/research.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { BuilderModule } from './modules/builder/builder.module';
import { AutoApplyModule } from './modules/auto-apply/auto-apply.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { PerUserThrottlerGuard } from './common/guards/per-user-throttler.guard';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI || 'mongodb://localhost/Folio',
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    StorageModule.forRootAsync({
      useFactory: () => ({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
        apiKey: process.env.CLOUDINARY_API_KEY!,
        apiSecret: process.env.CLOUDINARY_API_SECRET!,
      }),
    }),
    AuthModule,
    UsersModule,
    UploadModule,
    CrawlerModule,
    ResumesModule,
    CoverLettersModule,
    AtsModule,
    StatsModule,
    ExportModule,
    InterviewsModule,
    ResearchModule,
    DiscoverModule,
    BuilderModule,
    AutoApplyModule,
    JobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PerUserThrottlerGuard,
    },
  ],
})
export class AppModule {}
