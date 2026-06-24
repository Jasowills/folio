import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Get user stats' })
  async getStats(@CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    const db = this.connection.db!;

    const [resumes, coverLetters, atsScores, portfolioAnalyses] =
      await Promise.all([
        db.collection('resumes').countDocuments({ userId }),
        db.collection('coverletters').countDocuments({ userId }),
        db.collection('atsscores').countDocuments({ userId }),
        db.collection('crawljobs').countDocuments({ userId }),
      ]);

    return {
      resumes,
      coverLetters,
      atsScores,
      portfolioAnalyses,
    };
  }
}
