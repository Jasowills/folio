import { IsString, IsBoolean, IsOptional, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';

export class UpdateLogisticsDto {
  @IsEnum(['immediately', 'two_weeks', 'one_month', 'custom'])
  availabilityToStart: string;

  @IsString()
  @IsOptional()
  availabilityCustomNote?: string;

  @IsBoolean()
  visaSponsorshipNeeded: boolean;

  @IsString()
  workAuthorizationStatus: string;

  @IsBoolean()
  willingToRelocate: boolean;

  @IsString()
  @IsOptional()
  relocationNotes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  desiredSalaryMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  desiredSalaryMax?: number;

  @IsString()
  @IsOptional()
  salaryCurrency?: string;

  @IsEnum(['remote_only', 'hybrid_ok', 'onsite_ok', 'flexible'])
  remotePreference: string;

  @IsString()
  @IsOptional()
  noticePeriod?: string;

  @IsBoolean()
  hasNonCompete: boolean;

  @IsString()
  @IsOptional()
  nonCompeteNotes?: string;
}

export class CreateCustomQaDto {
  @IsString()
  questionPattern: string;

  @IsString()
  answerTemplate: string;

  @IsBoolean()
  @IsOptional()
  isSensitive?: boolean;
}

export class UpdateCustomQaDto {
  @IsString()
  @IsOptional()
  questionPattern?: string;

  @IsString()
  @IsOptional()
  answerTemplate?: string;

  @IsBoolean()
  @IsOptional()
  isSensitive?: boolean;
}

export class UpdateStyleDto {
  @IsEnum(['formal', 'professional_warm', 'concise_direct', 'enthusiastic'])
  tone: string;

  @IsEnum(['brief', 'standard', 'detailed'])
  lengthPreference: string;

  @IsBoolean()
  @IsOptional()
  writeInFirstPerson?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  avoidPhrases?: string[];

  @IsString()
  @IsOptional()
  sampleAnswer?: string;
}
