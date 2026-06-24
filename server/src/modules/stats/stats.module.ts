import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatsController } from './stats.controller';

@Module({
  imports: [MongooseModule],
  controllers: [StatsController],
})
export class StatsModule {}
