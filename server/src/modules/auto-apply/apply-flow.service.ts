import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ApplySubmission,
  ApplySubmissionDocument,
  ApplyField,
} from './schemas/apply-submission.schema';
import {
  AnswersBankEntry,
  AnswersBankDocument,
} from './schemas/answers-bank.schema';
import {
  AutoApplyConfig,
  AutoApplyConfigDocument,
} from './schemas/auto-apply-config.schema';
import { AtsRouterService, ATSPlatform } from './ats-router.service';
import { FieldMappingService } from './field-mapping.service';
import { SubmitWorkerService } from './submit-worker.service';
import { CoverLettersService } from '../cover-letters/cover-letters.service';
import { ResumesService } from '../resumes/resumes.service';
import { JobListing } from '../discover/schemas/job-listing.schema';
import { JobApplication } from '../discover/schemas/job-application.schema';
import { ScreeningQuestionAgent } from './screening-question-agent.service';
import { AutoApplyProfileService } from '../auto-apply-profile/auto-apply-profile.service';

@Injectable()
export class ApplyFlowService {
  private readonly logger = new Logger(ApplyFlowService.name);

  constructor(
    @InjectModel(ApplySubmission.name)
    private submissionModel: Model<ApplySubmissionDocument>,
    @InjectModel(AnswersBankEntry.name)
    private answersBankModel: Model<AnswersBankDocument>,
    @InjectModel(AutoApplyConfig.name)
    private configModel: Model<AutoApplyConfigDocument>,
    @InjectModel(JobListing.name) private jobListingModel: Model<any>,
    @InjectModel(JobApplication.name) private jobAppModel: Model<any>,
    private atsRouter: AtsRouterService,
    private fieldMapping: FieldMappingService,
    private submitWorker: SubmitWorkerService,
    private coverLettersService: CoverLettersService,
    private resumesService: ResumesService,
    private screeningAgent: ScreeningQuestionAgent,
    private profileService: AutoApplyProfileService,
  ) {}

  async approveJobs(
    userId: string,
    jobIds: string[],
    resumeId?: string,
    generateCoverLetter: boolean = true,
  ): Promise<ApplySubmissionDocument[]> {
    const complete = await this.profileService.isSetupComplete(userId);
    if (!complete) {
      throw new ForbiddenException(
        'Auto-apply setup is not complete. Finish the setup wizard first.',
      );
    }
    const created: ApplySubmissionDocument[] = [];
    const userObjId = new Types.ObjectId(userId);

    let effectiveResumeId = resumeId;
    if (!effectiveResumeId) {
      const resumes = await this.resumesService.findByUser(userId);
      if (!resumes?.length)
        throw new BadRequestException(
          'No resume found. Upload a resume first.',
        );
      effectiveResumeId = resumes[0]._id.toString();
    }
    const resumeObjId = new Types.ObjectId(effectiveResumeId);
    const resume = await this.resumesService.findById(
      effectiveResumeId,
      userId,
    );
    const userData = {
      fullName: resume.name || '',
      email: resume.contact?.email || '',
      phone: resume.contact?.phone || '',
      linkedinUrl: resume.contact?.linkedin || '',
      website: resume.contact?.website || '',
      githubUrl: resume.contact?.github || '',
    };

    for (const jobId of jobIds) {
      const jobObjId = new Types.ObjectId(jobId);

      const existing = await this.submissionModel
        .findOne({
          userId: userObjId,
          jobListingId: jobObjId,
        })
        .exec();
      if (existing) {
        created.push(existing);
        continue;
      }

      const job = await this.jobListingModel.findById(jobObjId).exec();
      if (!job) {
        this.logger.warn(`Job listing ${jobId} not found, skipping`);
        continue;
      }

      const applicationUrl = job.applicationUrl || '';
      const atsPlatform = this.atsRouter.detectATS(applicationUrl);

      if (atsPlatform === 'unknown') {
        this.logger.warn(
          `Unknown ATS for job ${jobId}, URL: ${applicationUrl}`,
        );
      }

      let coverLetterId: Types.ObjectId | undefined;
      if (generateCoverLetter) {
        const config = await this.configModel
          .findOne({ userId: userObjId })
          .exec()
          .then((c) => c || new this.configModel({ userId: userObjId }));
        if (config.autoAttachCoverLetter !== false) {
          try {
            const coverLetter = await this.coverLettersService.generate(
              userId,
              effectiveResumeId,
              job.roleTitle,
              job.companyName,
              job.descriptionRaw || '',
            );
            coverLetterId = coverLetter._id;
          } catch (err) {
            this.logger.debug(
              `Cover letter generation failed for job ${jobId}:`,
              err,
            );
          }
        }
      }

      const submission = await this.submissionModel.create({
        userId: userObjId,
        jobListingId: jobObjId,
        resumeId: resumeObjId,
        coverLetterId,
        status: 'approved',
        atsPlatform,
        applicationUrl,
        retryCount: 0,
        activityLog: [
          { action: 'Approved for auto-apply', timestamp: new Date() },
        ],
      });
      created.push(submission);
    }

    return created;
  }

  async fillApplication(
    userId: string,
    submissionId: string,
  ): Promise<ApplySubmissionDocument> {
    const submission = await this.submissionModel
      .findOne({
        _id: new Types.ObjectId(submissionId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status !== 'approved') {
      throw new BadRequestException(
        `Cannot fill submission in status: ${submission.status}`,
      );
    }

    const resume = await this.resumesService.findById(
      submission.resumeId.toString(),
      userId,
    );

    const config = await this.configModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    const userData = {
      fullName: resume.name || '',
      email: resume.contact?.email || '',
      phone: resume.contact?.phone || '',
      linkedinUrl: config?.linkedInUrl || resume.contact?.linkedin || '',
      website: config?.websiteUrl || resume.contact?.website || '',
      githubUrl: config?.githubUrl || resume.contact?.github || '',
    };

    const job = await this.jobListingModel
      .findById(submission.jobListingId)
      .exec();

    const resumeUrl = resume.fileUrl || '';
    let coverLetterContent: string | undefined;

    if (submission.coverLetterId) {
      try {
        const cl = await this.coverLettersService.findById(
          submission.coverLetterId.toString(),
          userId,
        );
        coverLetterContent = cl.content;
      } catch {
        this.logger.debug('Cover letter not found for attachment');
      }
    }

    const result = await this.fieldMapping.fillApplication({
      applicationUrl: submission.applicationUrl,
      atsPlatform: submission.atsPlatform as ATSPlatform,
      resumeUrl,
      coverLetterContent,
      userData,
    });

    if (!result.success) {
      submission.status = 'failed';
      submission.failureReason = result.error || 'Field mapping failed';
      submission.activityLog.push({
        action: `Failed: ${submission.failureReason}`,
        timestamp: new Date(),
      });
      await submission.save();
      return submission;
    }

    submission.filledFields = result.fields;

    // Answer screening questions via agent
    if (result.screeningQuestions.length > 0 && job) {
      const answered = await this.screeningAgent.answerQuestions(
        userId,
        result.screeningQuestions,
        {
          resumeData: {
            name: resume.name ?? undefined,
            summary: config?.personalSummary || (resume.summary ?? undefined),
            skills:
              resume.skills?.filter((s): s is string => s != null) ?? undefined,
            experience: resume.experience,
            education: resume.education as any,
            certifications: resume.certifications,
            contact: resume.contact
              ? {
                  email: resume.contact.email ?? undefined,
                  phone: resume.contact.phone ?? undefined,
                  location:
                    config?.preferredLocation ||
                    (resume.contact.location ?? undefined),
                }
              : undefined,
          },
          jobData: {
            roleTitle: job.roleTitle || '',
            companyName: job.companyName || '',
            description: job.descriptionRaw,
            location: job.location,
            seniorityLevel: job.extractedFields?.seniorityLevel,
            roleFamily: job.extractedFields?.roleFamily,
            salaryMin: job.extractedFields?.salaryMin,
            salaryMax: job.extractedFields?.salaryMax,
            salaryCurrency: job.extractedFields?.salaryCurrency,
          },
          personalization: {
            applicationStyle: config?.applicationStyle,
            availableFrom: config?.availableFrom,
            needsVisaSponsorship: config?.needsVisaSponsorship,
            salaryExpectations: config?.salaryExpectations,
            willingToRelocate: config?.willingToRelocate,
            willingToTravel: config?.willingToTravel,
            portfolioUrl: config?.portfolioUrl,
          },
        },
      );

      for (const a of answered) {
        if (a.answer) {
          submission.filledFields.push({
            fieldName: `screening_${a.question.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}`,
            fieldValue: a.answer,
            autoFilled: true,
            editable: true,
          });
        }
      }
    }

    submission.status = 'ready_for_review';
    const sqCount = result.screeningQuestions.length;
    submission.activityLog.push({
      action: `Filled ${result.fields.length} fields, ${sqCount} screening questions processed`,
      timestamp: new Date(),
    });
    await submission.save();
    return submission;
  }

  async getPreview(
    userId: string,
    submissionId: string,
  ): Promise<ApplySubmissionDocument> {
    const submission = await this.submissionModel
      .findOne({
        _id: new Types.ObjectId(submissionId),
        userId: new Types.ObjectId(userId),
      })
      .populate('jobListingId')
      .exec();
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async confirmAndSubmit(
    userId: string,
    submissionId: string,
    updatedFields?: { fieldName: string; fieldValue: string }[],
  ): Promise<ApplySubmissionDocument> {
    const submission = await this.submissionModel
      .findOne({
        _id: new Types.ObjectId(submissionId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status !== 'ready_for_review') {
      throw new BadRequestException(
        `Cannot submit in status: ${submission.status}. Must be ready_for_review.`,
      );
    }

    if (updatedFields && updatedFields.length > 0) {
      const fieldMap = new Map(
        submission.filledFields?.map((f) => [f.fieldName, f]) || [],
      );
      for (const update of updatedFields) {
        const existing = fieldMap.get(update.fieldName);
        if (existing) {
          existing.fieldValue = update.fieldValue;
        } else {
          submission.filledFields?.push({
            fieldName: update.fieldName,
            fieldValue: update.fieldValue,
            autoFilled: false,
            editable: true,
          });
        }
      }
    }

    submission.status = 'filling';
    submission.activityLog.push({
      action: 'Confirmed by user - submitting',
      timestamp: new Date(),
    });
    await submission.save();

    const atsPlatform = submission.atsPlatform as ATSPlatform;
    const result = await this.submitWorker.submit(
      submission.applicationUrl,
      atsPlatform,
      submission.filledFields,
    );

    if (result.success) {
      submission.status = 'submitted';
      submission.submittedAt = result.submittedAt || new Date();
      submission.activityLog.push({
        action: 'Application submitted successfully',
        timestamp: new Date(),
      });

      await this.updateTrackerJobStage(
        userId,
        submission.jobListingId.toString(),
        'submitted',
      );
    } else {
      submission.status = 'failed';
      submission.failureReason = result.error || 'Submission failed';
      submission.retryCount = (submission.retryCount || 0) + 1;
      submission.activityLog.push({
        action: `Submission failed: ${submission.failureReason}`,
        timestamp: new Date(),
      });
    }

    await submission.save();
    return submission;
  }

  async getSubmissions(userId: string): Promise<ApplySubmissionDocument[]> {
    return this.submissionModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .populate('jobListingId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSubmissionById(
    userId: string,
    submissionId: string,
  ): Promise<ApplySubmissionDocument> {
    const submission = await this.submissionModel
      .findOne({
        _id: new Types.ObjectId(submissionId),
        userId: new Types.ObjectId(userId),
      })
      .populate('jobListingId')
      .exec();
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async retrySubmission(
    userId: string,
    submissionId: string,
  ): Promise<ApplySubmissionDocument> {
    const submission = await this.submissionModel
      .findOne({
        _id: new Types.ObjectId(submissionId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status !== 'failed') {
      throw new BadRequestException(
        `Can only retry failed submissions, got: ${submission.status}`,
      );
    }

    submission.status = 'approved';
    submission.failureReason = undefined;
    submission.activityLog.push({
      action: 'Retry requested',
      timestamp: new Date(),
    });
    await submission.save();

    return this.fillApplication(userId, submissionId);
  }

  async getAnswersBank(userId: string): Promise<AnswersBankEntry[]> {
    return this.answersBankModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async storeAnswer(
    userId: string,
    question: string,
    answer: string,
    category: string,
  ): Promise<AnswersBankEntry> {
    const normalized = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
    const existing = await this.answersBankModel
      .findOne({
        userId: new Types.ObjectId(userId),
        normalizedQuestion: normalized,
      })
      .exec();
    if (existing) {
      existing.answer = answer;
      existing.category = category;
      existing.hitCount += 1;
      existing.lastUsedAt = new Date();
      return existing.save();
    }
    return this.answersBankModel.create({
      userId: new Types.ObjectId(userId),
      normalizedQuestion: normalized,
      originalQuestion: question,
      answer,
      category,
      hitCount: 1,
      lastUsedAt: new Date(),
    });
  }

  async deleteAnswer(userId: string, answerId: string): Promise<void> {
    const result = await this.answersBankModel
      .deleteOne({
        _id: new Types.ObjectId(answerId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!result.deletedCount) throw new NotFoundException('Answer not found');
  }

  async getConfig(userId: string): Promise<AutoApplyConfigDocument | null> {
    return this.configModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async upsertConfig(
    userId: string,
    updates: Record<string, any>,
  ): Promise<AutoApplyConfigDocument> {
    return this.configModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: updates },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
  }

  private async updateTrackerJobStage(
    userId: string,
    jobListingId: string,
    stage: string,
  ): Promise<void> {
    try {
      await this.jobAppModel
        .updateOne(
          {
            userId: new Types.ObjectId(userId),
            jobListingId: new Types.ObjectId(jobListingId),
          },
          { $set: { stage, lastActivityAt: new Date() } },
        )
        .exec();
    } catch (err) {
      this.logger.debug(
        'Could not update tracker stage:',
        (err as Error).message,
      );
    }
  }
}
