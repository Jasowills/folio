import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class ApproveJobsDto {
  @IsArray()
  @IsString({ each: true })
  jobIds!: string[];

  @IsString()
  @IsOptional()
  resumeId?: string;

  @IsBoolean()
  @IsOptional()
  coverLetter?: boolean;
}

export class ConfirmSubmissionDto {
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  updatedFields?: { fieldName: string; fieldValue: string }[];
}

export class StoreAnswerDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsString()
  @IsIn([
    'visa',
    'salary',
    'notice_period',
    'location',
    'sponsorship',
    'generic',
  ])
  category!: string;
}

export class UpdateAutoApplyConfigDto {
  @IsBoolean()
  @IsOptional()
  autoAttachCoverLetter?: boolean;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxConcurrentSubmissions?: number;

  @IsObject()
  @IsOptional()
  defaultAnswers?: Record<string, string>;

  @IsString()
  @IsOptional()
  @IsIn(['professional', 'enthusiastic', 'concise', 'detailed', 'technical'])
  applicationStyle?: string;

  @IsString()
  @IsOptional()
  availableFrom?: string;

  @IsBoolean()
  @IsOptional()
  needsVisaSponsorship?: boolean;

  @IsString()
  @IsOptional()
  salaryExpectations?: string;

  @IsString()
  @IsOptional()
  preferredLocation?: string;

  @IsBoolean()
  @IsOptional()
  willingToRelocate?: boolean;

  @IsBoolean()
  @IsOptional()
  willingToTravel?: boolean;

  @IsString()
  @IsOptional()
  personalSummary?: string;

  @IsString()
  @IsOptional()
  linkedInUrl?: string;

  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @IsString()
  @IsOptional()
  githubUrl?: string;

  @IsString()
  @IsOptional()
  websiteUrl?: string;
}
