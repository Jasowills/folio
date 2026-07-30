import { Type, Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min, Max, IsIn } from 'class-validator';

export class UpsertPreferencesDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetRoles?: string[];

  @IsString()
  @IsOptional()
  resumeId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLocations?: string[];

  @IsBoolean()
  @IsOptional()
  isRemoteOnly?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  experienceLevels?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedRoleFamilies?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedSeniorities?: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minimumMatchScore?: number;

  @IsBoolean()
  @IsOptional()
  excludeApplied?: boolean;

  @IsBoolean()
  @IsOptional()
  excludeRejected?: boolean;

  @IsBoolean()
  @IsOptional()
  emailAlertsEnabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledSources?: string[];
}

export class DismissJobDto {
  @IsString()
  @IsIn(['bad_seniority', 'wrong_domain', 'wrong_location', 'not_interested', 'salary_too_low', 'other'])
  reason!: string;
}

export class TrackJobDto {
  @IsString()
  @IsOptional()
  jobListingId?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTrackerJobDto {
  @IsString()
  @IsOptional()
  stage?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  checklistState?: Record<string, boolean>;
}

export class FeedQueryDto {
  @IsString()
  @IsOptional()
  cursor?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sources?: string[];

  @IsString()
  @IsOptional()
  postedWithin?: '24h' | '3d' | 'week';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minScore?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  hasSalary?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  remoteOnly?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  excludeApplied?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  excludeRejected?: boolean;

  @IsString()
  @IsOptional()
  sort?: 'relevance' | 'newest' | 'salary';

  @IsString()
  @IsOptional()
  techRelevance?: 'tech' | 'non-tech' | 'all';

  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedRoleFamilies?: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedSeniorities?: string[];
}
