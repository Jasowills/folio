import { Controller, Post, Get, Delete, Body, Param, UseGuards, Logger } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { UserDocument } from '../users/schemas/user.schema'
import { InterviewsService } from './interviews.service'

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewsController {
  private readonly logger = new Logger(InterviewsController.name)

  constructor(private interviewsService: InterviewsService) {}

  @Post('sessions')
  async createSession(
    @CurrentUser() user: UserDocument,
    @Body()
    body: {
      resumeId: string
      role: string
      level: string
      interviewTypes: string[]
      company?: { name: string; url?: string }
      techStack?: string[]
      includesCoding?: boolean
      difficulty?: string
      plannedDuration: number
    },
  ) {
    return this.interviewsService.createSession(user._id.toString(), body)
  }

  @Get('sessions/:id')
  async getSession(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.interviewsService.getSession(id, user._id.toString())
  }

  @Post('sessions/:id/persona')
  async generatePersona(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.interviewsService.generatePersona(id, user._id.toString())
  }

  @Post('sessions/:id/start')
  async startSession(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.interviewsService.startSession(id, user._id.toString())
  }

  @Post('sessions/:id/end')
  async endSession(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.interviewsService.endSession(id, user._id.toString())
  }

  @Get('sessions/:id/results')
  async getResults(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.interviewsService.getResults(id, user._id.toString())
  }

  @Delete('sessions/:id')
  async deleteSession(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    await this.interviewsService.deleteSession(id, user._id.toString())
    return { success: true }
  }
}
