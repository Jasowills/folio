import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Connection, ConnectionDocument } from './schemas/connection.schema';
import {
  ReferralRequest,
  ReferralRequestDocument,
} from './schemas/referral-request.schema';
import {
  JobListing,
  JobListingDocument,
} from '../discover/schemas/job-listing.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);
  constructor(
    @InjectModel(Connection.name)
    private connectionModel: Model<ConnectionDocument>,
    @InjectModel(ReferralRequest.name)
    private referralRequestModel: Model<ReferralRequestDocument>,
    @InjectModel(JobListing.name)
    private jobListingModel: Model<JobListingDocument>,
    private aiService: AiService,
  ) {}

  async importConnections(
    userId: string,
    rows: Array<{
      firstName: string;
      lastName?: string;
      email?: string;
      companyName?: string;
      position?: string;
      connectedOn?: string;
    }>,
  ) {
    const docs = rows.map((r) => ({
      userId,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      companyName: r.companyName ? r.companyName.trim() : undefined,
      position: r.position,
      connectedOn: r.connectedOn ? new Date(r.connectedOn) : undefined,
      status: 'active' as const,
    }));

    const result = await this.connectionModel.insertMany(docs, {
      ordered: false,
    });
    this.logger.log(
      `importConnections: imported ${result.length} connections for user ${userId}`,
    );
    return result;
  }

  async getConnections(userId: string, company?: string, status?: string) {
    const filter: Record<string, unknown> = { userId };
    if (company) filter.companyName = { $regex: company, $options: 'i' };
    if (status) filter.status = status;
    return this.connectionModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findReferrals(userId: string, jobListingId?: string) {
    const jobFilter: Record<string, unknown> = { isExpired: { $ne: true } };
    if (jobListingId) jobFilter._id = jobListingId;

    const jobs = await this.jobListingModel
      .find(jobFilter)
      .select('companyName roleTitle location _id')
      .exec();
    if (!jobs.length) return [];

    const jobCompanyNames = [
      ...new Set(jobs.map((j) => j.companyName.toLowerCase())),
    ];

    const connections = await this.connectionModel
      .find({ userId, status: 'active' })
      .exec();

    const matches: Array<{
      connectionId: string;
      firstName: string;
      lastName?: string;
      position?: string;
      companyName?: string;
      matchedJobs: Array<{
        jobId: string;
        roleTitle: string;
        companyName: string;
      }>;
    }> = [];

    for (const conn of connections) {
      if (!conn.companyName) continue;
      const connCompany = conn.companyName.toLowerCase();

      const matchedJobs = jobs.filter((j) => {
        const jobCompany = j.companyName.toLowerCase();
        return (
          jobCompany === connCompany ||
          jobCompany.includes(connCompany) ||
          connCompany.includes(jobCompany)
        );
      });

      if (matchedJobs.length > 0) {
        matches.push({
          connectionId: conn._id.toString(),
          firstName: conn.firstName,
          lastName: conn.lastName,
          position: conn.position,
          companyName: conn.companyName,
          matchedJobs: matchedJobs.map((j) => ({
            jobId: j._id.toString(),
            roleTitle: j.roleTitle,
            companyName: j.companyName,
          })),
        });
      }
    }

    return matches;
  }

  async generateReferralMessage(
    userId: string,
    connectionId: string,
    jobListingId: string,
  ) {
    const existing = await this.referralRequestModel
      .findOne({ userId, connectionId, jobListingId })
      .exec();
    if (existing?.draftMessage) return existing;

    const connection = await this.connectionModel
      .findOne({ _id: connectionId, userId })
      .exec();
    if (!connection) throw new NotFoundException('Connection not found');

    const job = await this.jobListingModel.findById(jobListingId).exec();
    if (!job) throw new NotFoundException('Job listing not found');

    const raw = await this.aiService.chat(
      `You are a career coach helping a software engineer write referral request messages. Return valid JSON only.`,
      `Write a polite referral request message from someone asking their connection "${connection.firstName} ${connection.lastName || ''}" (who works at ${connection.companyName || 'their company'}) to refer them for a ${job.roleTitle} role at ${job.companyName}.

The connection's position is "${connection.position || 'unknown'}" and their relationship is a LinkedIn connection.

Return JSON:
- subject (string)
- body (string): short, respectful, mentions the connection's work at the company, explains why the candidate is a good fit, asks if they'd be comfortable providing a referral`,
    );

    const parsed = typeof raw === 'object' ? raw : JSON.parse(String(raw));
    const draftMessage = `Subject: ${parsed.subject}\n\n${parsed.body}`;

    const referral = existing
      ? await this.referralRequestModel
          .findByIdAndUpdate(
            existing._id,
            { $set: { draftMessage } },
            { new: true },
          )
          .exec()
      : await this.referralRequestModel.create({
          userId,
          connectionId,
          jobListingId,
          draftMessage,
          status: 'draft',
        });

    return referral;
  }

  async getReferralRequests(userId: string, status?: string) {
    const filter: Record<string, unknown> = { userId };
    if (status) filter.status = status;
    return this.referralRequestModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateReferralRequest(
    id: string,
    userId: string,
    body: Partial<{ status: string; sentMessage: string; notes: string }>,
  ) {
    const update: Record<string, unknown> = {};
    if (body.status === 'sent') {
      update.status = 'sent';
      update.sentMessage = body.sentMessage;
      update.sentAt = new Date();
    } else if (body.status) {
      update.status = body.status;
    }
    if (body.notes !== undefined) update.notes = body.notes;

    const referral = await this.referralRequestModel
      .findOneAndUpdate({ _id: id, userId }, { $set: update }, { new: true })
      .exec();
    if (!referral) throw new NotFoundException('Referral request not found');
    return referral;
  }

  async deleteConnection(id: string, userId: string) {
    const conn = await this.connectionModel
      .findOneAndDelete({ _id: id, userId })
      .exec();
    if (!conn) throw new NotFoundException('Connection not found');
    await this.referralRequestModel.deleteMany({ connectionId: id }).exec();
  }
}
