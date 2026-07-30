export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export type FlagType = 'identity_mismatch' | 'known_scam_pattern' | 'location_mismatch' | 'presence_check' | 'other';

export interface VerificationEvidence {
  claim: string;
  source: string;
}

export interface VerificationFlag {
  type: FlagType;
  summary: string;
  evidence: VerificationEvidence[];
}

export interface CompanyVerificationInput {
  companyName: string;
  roleTitle: string;
  recruiterEmail?: string;
  recruiterName?: string;
  sourcePlatform?: string;
  emailBody?: string;
  claimedLocation?: string;
}

export interface CompanyVerificationResult {
  riskLevel: RiskLevel;
  flags: VerificationFlag[];
  recommendation: string;
}

export interface CompanyVerificationCache {
  companyName: string;
  result: CompanyVerificationResult;
  createdAt: Date;
  ttlMs: number;
}
