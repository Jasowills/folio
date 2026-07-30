import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AutoApplyProfile, AutoApplyProfileSchema } from './auto-apply-profile.schema';
import { AutoApplyProfileController } from './auto-apply-profile.controller';
import { AutoApplyProfileService } from './auto-apply-profile.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AutoApplyProfile.name, schema: AutoApplyProfileSchema },
    ]),
  ],
  controllers: [AutoApplyProfileController],
  providers: [AutoApplyProfileService],
  exports: [AutoApplyProfileService],
})
export class AutoApplyProfileModule {}
