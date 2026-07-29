import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApplyOddsService } from './apply-odds.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class ApplyOddsController {
  constructor(private oddsService: ApplyOddsService) {}

  @Get(':jobId/apply-odds')
  @ApiOperation({ summary: 'Get "should I even apply" assessment for a job' })
  async getApplyOdds(
    @Param('jobId') jobId: string,
    @CurrentUser() user: any,
  ) {
    return this.oddsService.getOrCreate(user._id.toString(), jobId);
  }
}
