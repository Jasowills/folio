import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { Offer, OfferSchema } from './schemas/offer.schema';
import { Negotiation, NegotiationSchema } from './schemas/negotiation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Negotiation.name, schema: NegotiationSchema },
    ]),
    AiModule,
  ],
  controllers: [SalaryController],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule {}
