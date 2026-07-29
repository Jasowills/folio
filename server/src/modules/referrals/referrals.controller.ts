import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards, Logger, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { UserDocument } from '../users/schemas/user.schema'
import { ReferralsService } from './referrals.service'

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  private readonly logger = new Logger(ReferralsController.name)
  constructor(private referralsService: ReferralsService) {}

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importConnections(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('CSV file required')
    const csv = file.buffer.toString('utf-8')
    const lines = csv.trim().split('\n')
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row')

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(',').map((v) => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = vals[i] || '' })
      return row
    })

    const nameKeys = ['first name', 'firstname', 'first_name', 'first', 'given name', 'givenname', 'given-name']
    const lastNameKeys = ['last name', 'lastname', 'last_name', 'last', 'surname', 'family name', 'familyname']
    const companyKeys = ['company', 'company name', 'company_name']
    const positionKeys = ['position', 'title', 'job title', 'job_title', 'role']
    const emailKeys = ['email', 'email address', 'e-mail', 'email_address', 'e-mail address']
    const connectedKeys = ['connected on', 'connected_on', 'connected date', 'connected_date', 'date']

    const extract = (row: Record<string, string>, keys: string[]) => {
      for (const k of keys) {
        if (row[k]) return row[k]
      }
      return undefined
    }

    const parsed = rows.map((row) => ({
      firstName: extract(row, nameKeys) || 'Unknown',
      lastName: extract(row, lastNameKeys),
      email: extract(row, emailKeys),
      companyName: extract(row, companyKeys),
      position: extract(row, positionKeys),
      connectedOn: extract(row, connectedKeys),
    }))

    const result = await this.referralsService.importConnections(user._id.toString(), parsed)
    return { imported: result.length }
  }

  @Get('connections')
  async getConnections(
    @CurrentUser() user: UserDocument,
    @Query('company') company?: string,
    @Query('status') status?: string,
  ) {
    return this.referralsService.getConnections(user._id.toString(), company, status)
  }

  @Post('connections')
  async addConnection(
    @CurrentUser() user: UserDocument,
    @Body() body: { firstName: string; lastName?: string; email?: string; companyName?: string; position?: string },
  ) {
    const result = await this.referralsService.importConnections(user._id.toString(), [body])
    return result[0]
  }

  @Delete('connections/:id')
  async deleteConnection(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    await this.referralsService.deleteConnection(id, user._id.toString())
    return { success: true }
  }

  @Get('find')
  async findReferrals(
    @CurrentUser() user: UserDocument,
    @Query('jobListingId') jobListingId?: string,
  ) {
    return this.referralsService.findReferrals(user._id.toString(), jobListingId)
  }

  @Post('requests/generate')
  async generateMessage(
    @CurrentUser() user: UserDocument,
    @Body() body: { connectionId: string; jobListingId: string },
  ) {
    return this.referralsService.generateReferralMessage(
      user._id.toString(), body.connectionId, body.jobListingId,
    )
  }

  @Get('requests')
  async getRequests(
    @CurrentUser() user: UserDocument,
    @Query('status') status?: string,
  ) {
    return this.referralsService.getReferralRequests(user._id.toString(), status)
  }

  @Patch('requests/:id')
  async updateRequest(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() body: { status?: string; sentMessage?: string; notes?: string },
  ) {
    return this.referralsService.updateReferralRequest(id, user._id.toString(), body)
  }
}
