import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { chromium } from 'playwright';
import { AtsScore, AtsScoreDocument } from './schemas/ats-score.schema';
import { AiService } from '../ai/ai.service';
import { ATS_SCORING_SYSTEM } from '../ai/prompts';
import { ResumesService } from '../resumes/resumes.service';

@Injectable()
export class AtsService {
  constructor(
    @InjectModel(AtsScore.name) private atsModel: Model<AtsScoreDocument>,
    private aiService: AiService,
    private resumesService: ResumesService,
  ) {}

  async score(
    userId: string,
    resumeId: string,
    jobDescription?: string,
    jobUrl?: string,
    jobTitle?: string,
    companyName?: string,
  ): Promise<AtsScoreDocument> {
    const resume = await this.resumesService.findById(resumeId, userId);
    let description = jobDescription || '';

    if (jobUrl && !description) {
      description = await this.fetchJobDescription(jobUrl);
    }

    const resumeJson = resume.toJSON();
    const roleContext = resume.detectedRole || {
      role: 'unknown',
      seniority: 'mid',
      industries: [],
      confidence: 0,
    };
    const quality = resume.quality || {
      overallQuality: 50,
      professionalismScore: 50,
      readabilityScore: 50,
    };

    const prompt = `Job Description:\n${description || 'No description provided'}\n\nResume:\n${JSON.stringify(resumeJson)}\n\nCandidate Context:
- Detected Role: ${roleContext.role}
- Detected Seniority: ${roleContext.seniority}
- Target Industries: ${(roleContext.industries || []).join(', ')}
- Resume Quality Score: ${quality.overallQuality}/100
- Resume Professionalism: ${quality.professionalismScore}/100
- Resume Readability: ${quality.readabilityScore}/100

Score this candidate against the job description. Use your role-specific knowledge (${roleContext.role}) to identify the most relevant keywords and evaluate seniority fit.`;

    const result = (await this.aiService.chat(ATS_SCORING_SYSTEM, prompt)) as {
      score?: number;
      matchedKeywords?: Array<{
        keyword: string;
        category: string;
        importance: string;
      }>;
      missingKeywords?: Array<{
        keyword: string;
        category: string;
        importance: string;
      }>;
      sectionScores?: Record<string, number>;
      suggestions?: string[];
      seniorityMatch?: string;
      roleContext?: { detectedRole: string; confidenceLevel: string };
    };

    console.log('[AtsService] AI result', {
      score: result.score,
      matchedCount: result.matchedKeywords?.length ?? 0,
      missingCount: result.missingKeywords?.length ?? 0,
      sectionScores: result.sectionScores,
      suggestionsCount: result.suggestions?.length ?? 0,
    });

    const atsScore = await this.atsModel.create({
      userId,
      resumeId,
      jobTitle,
      companyName,
      jobDescription: description,
      jobUrl,
      score: result.score ?? 0,
      matchedKeywords: (result.matchedKeywords ?? []) as any,
      missingKeywords: (result.missingKeywords ?? []) as any,
      sectionScores: {
        ...result.sectionScores,
        certifications: result.sectionScores?.certifications ?? 0,
      },
      suggestions: result.suggestions ?? [],
      seniorityMatch: result.seniorityMatch,
      roleContext: (result.roleContext || {
        detectedRole: roleContext.role,
        confidenceLevel:
          roleContext.confidence > 70
            ? 'high'
            : roleContext.confidence > 40
              ? 'medium'
              : 'low',
      }) as any,
      resumeQuality: {
        overallQuality: quality.overallQuality,
        professionalismScore: quality.professionalismScore,
        readabilityScore: quality.readabilityScore,
      },
    });

    return atsScore;
  }

  async history(userId: string): Promise<AtsScoreDocument[]> {
    return this.atsModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async getById(id: string, userId: string): Promise<AtsScoreDocument | null> {
    return this.atsModel.findOne({ _id: id, userId }).exec();
  }

  private async fetchJobDescription(url: string): Promise<string> {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      const text = await page.innerText('body');
      return text.slice(0, 5000);
    } catch {
      return '';
    } finally {
      if (browser) await browser.close();
    }
  }
}
