import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { AnswersBankEntry, AnswersBankDocument } from './schemas/answers-bank.schema';
import { AutoApplyProfileService } from '../auto-apply-profile/auto-apply-profile.service';
import type { AutoApplyProfileDocument } from '../auto-apply-profile/auto-apply-profile.schema';

const SCREENING_AGENT_SYSTEM = `You are a job application assistant. You help candidates answer screening questions on company application forms. Your goals:

1. Be concise — answers should be 1-3 sentences unless the question requires more detail.
2. Be honest — never fabricate experience or skills. Use only what's provided in the candidate's context.
3. Be professional — use proper grammar, spelling, and tone suitable for a job application.
4. Use the candidate's resume context to tailor answers. Reference specific skills, experience, or projects when relevant.
5. If the question asks about salary expectations, provide a range based on market data or state flexibility.
6. If the question asks about visa/sponsorship, answer truthfully based on the provided context.
7. If the question asks about availability/notice period, use the provided context or state flexibility.

Return ONLY the answer text — no explanations, no meta-commentary, no labels.`;

interface ScreeningContext {
  resumeData: {
    name?: string;
    summary?: string;
    skills?: string[];
    experience?: Array<{ title: string; company: string; bullets: string[] }>;
    education?: Array<{ institution: string; degree: string; field?: string }>;
    certifications?: Array<{ name: string }>;
    contact?: { email?: string; phone?: string; location?: string };
  };
  jobData: {
    roleTitle: string;
    companyName: string;
    description?: string;
    location?: string;
    seniorityLevel?: string;
    roleFamily?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
  };
  personalization?: {
    applicationStyle?: string;
    availableFrom?: string;
    needsVisaSponsorship?: boolean;
    salaryExpectations?: string;
    willingToRelocate?: boolean;
    willingToTravel?: boolean;
    portfolioUrl?: string;
  };
}

export interface AnsweredQuestion {
  question: string;
  answer: string;
  source: 'custom_qa' | 'logistics' | 'cache' | 'ai';
  category?: string;
}

@Injectable()
export class ScreeningQuestionAgent {
  private readonly logger = new Logger(ScreeningQuestionAgent.name);

  constructor(
    @InjectModel(AnswersBankEntry.name) private answersBankModel: Model<AnswersBankDocument>,
    private aiService: AiService,
    private profileService: AutoApplyProfileService,
  ) {}

  async answerQuestions(
    userId: string,
    questions: { question: string; inputType: string }[],
    context: ScreeningContext,
  ): Promise<AnsweredQuestion[]> {
    const profile = await this.profileService.getProfile(userId);

    const results: AnsweredQuestion[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const answer = await this.resolveQuestion(userId, q.question, q.inputType, context, profile);
      results[i] = answer;
    }

    return results;
  }

  private async resolveQuestion(
    userId: string,
    question: string,
    inputType: string,
    context: ScreeningContext,
    profile: AutoApplyProfileDocument,
  ): Promise<AnsweredQuestion> {
    const normalized = question.toLowerCase().replace(/[^\w\s]/g, '').trim();

    // Tier 1: Custom Q&A bank from profile
    const customMatch = this.findCustomQaMatch(normalized, profile);
    if (customMatch && !customMatch.isSensitive) {
      const answer = this.renderTemplate(customMatch.answerTemplate, context);
      return { question, answer, source: 'custom_qa', category: 'generic' };
    }
    if (customMatch?.isSensitive) {
      return { question, answer: '', source: 'custom_qa', category: 'generic' };
    }

    // Tier 2: Logistics answers from profile (structured field mapping)
    const logisticsAnswer = this.mapToLogistics(question, profile);
    if (logisticsAnswer) {
      return { question, answer: logisticsAnswer, source: 'logistics', category: this.inferCategory(question) };
    }

    // Tier 3: Existing answers bank cache
    const cached = await this.findCachedAnswer(userId, normalized);
    if (cached) {
      return { question, answer: cached.answer, source: 'cache', category: cached.category };
    }

    // Tier 4: LLM generation
    const answer = await this.generateAnswer(question, context, profile);
    const category = this.inferCategory(question);
    await this.saveToBank(userId, question, answer, category);
    return { question, answer, source: 'ai', category };
  }

  private findCustomQaMatch(normalized: string, profile: AutoApplyProfileDocument): (typeof profile.customQA)[0] | null {
    const words = normalized.split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) return null;

    for (const entry of profile.customQA) {
      const patternWords = entry.questionPattern.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchCount = patternWords.filter((pw) => words.some((w) => w.includes(pw) || pw.includes(w))).length;
      if (patternWords.length > 0 && matchCount / patternWords.length >= 0.6) {
        return entry;
      }
    }
    return null;
  }

  private renderTemplate(template: string, context: ScreeningContext): string {
    return template
      .replace(/\{\{company\}\}/g, context.jobData.companyName || 'the company')
      .replace(/\{\{role\}\}/g, context.jobData.roleTitle || 'this role')
      .replace(/\{\{name\}\}/g, context.resumeData.name || '');
  }

  private mapToLogistics(question: string, profile: AutoApplyProfileDocument): string | null {
    const lower = question.toLowerCase();
    const l = profile.logisticsAnswers as any;

    if (/\b(start|available|when can you|begin|join)\b/.test(lower)) {
      if (l.availabilityToStart === 'custom' && l.availabilityCustomNote) {
        return l.availabilityCustomNote;
      }
      const labels: Record<string, string> = {
        immediately: 'Immediately',
        two_weeks: 'Two weeks notice required',
        one_month: 'One month notice required',
      };
      return labels[l.availabilityToStart] || 'Flexible';
    }

    if (/\b(visa|sponsor)\b/.test(lower) && !/\b(work.uthor|citizen)\b/.test(lower)) {
      return l.visaSponsorshipNeeded ? 'Yes, I will require visa sponsorship' : 'No, I do not require visa sponsorship';
    }

    if (/\b(work.uthorization|authorized|citizenship|right.to.work|work.permit|status)\b/.test(lower)) {
      return l.workAuthorizationStatus || 'Authorized to work';
    }

    if (/\b(salary|pay|compensation|expect|range)\b/.test(lower)) {
      const min = l.desiredSalaryMin || '';
      const max = l.desiredSalaryMax || '';
      const currency = l.salaryCurrency || 'USD';
      if (min && max) return `${currency}${min} – ${currency}${max}`;
      if (min) return `From ${currency}${min}`;
      return 'Open to discussion';
    }

    if (/\b(relocate|relocation|moving)\b/.test(lower)) {
      if (l.willingToRelocate) {
        return l.relocationNotes ? `Yes, willing to relocate. ${l.relocationNotes}` : 'Yes, willing to relocate';
      }
      return 'Not willing to relocate at this time';
    }

    if (/\b(remote|onsite|hybrid|location preference|work arrangement)\b/.test(lower)) {
      const labels: Record<string, string> = {
        remote_only: 'Remote only',
        hybrid_ok: 'Hybrid or remote',
        onsite_ok: 'On-site or hybrid',
        flexible: 'Flexible — open to all arrangements',
      };
      return labels[l.remotePreference] || 'Flexible';
    }

    if (/\b(notice period|notice|handover|transition)\b/.test(lower) && !/\b(start|available|when)\b/.test(lower)) {
      return l.noticePeriod || 'Standard notice period applies';
    }

    if (/\b(non.?compete|noncompete|restrictive.covenant)\b/.test(lower)) {
      return l.hasNonCompete ? `Yes, subject to a non-compete agreement. ${l.nonCompeteNotes || ''}` : 'No';
    }

    return null;
  }

  private async findCachedAnswer(userId: string, normalized: string): Promise<AnswersBankEntry | null> {
    return this.answersBankModel.findOne({
      userId: new Types.ObjectId(userId),
      normalizedQuestion: { $regex: this.fuzzyPattern(normalized) },
    }).exec();
  }

  private fuzzyPattern(normalized: string): RegExp {
    const words = normalized.split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) return new RegExp(normalized, 'i');
    const pattern = words.map((w) => `(?=.*${this.escapeRegex(w)})`).join('');
    return new RegExp(pattern, 'i');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async generateAnswer(question: string, context: ScreeningContext, profile: AutoApplyProfileDocument): Promise<string> {
    const userMessage = this.buildPrompt(question, context, profile);
    return this.aiService.chat(SCREENING_AGENT_SYSTEM, userMessage, undefined, 'text');
  }

  private buildPrompt(question: string, context: ScreeningContext, profile: AutoApplyProfileDocument): string {
    const r = context.resumeData;
    const j = context.jobData;
    const p = context.personalization;
    const s = profile.applicationStyle as any;

    let prompt = `SCREENING QUESTION: ${question}\n\n`;

    prompt += `CANDIDATE PROFILE:\n`;
    prompt += `Name: ${r.name || 'N/A'}\n`;
    prompt += `Summary: ${r.summary || 'N/A'}\n`;
    prompt += `Location: ${r.contact?.location || 'N/A'}\n`;
    prompt += `Skills: ${r.skills?.join(', ') || 'N/A'}\n`;

    if (r.experience && r.experience.length > 0) {
      prompt += `Experience:\n`;
      for (const exp of r.experience) {
        prompt += `  - ${exp.title} at ${exp.company}\n`;
        for (const b of exp.bullets.slice(0, 3)) {
          prompt += `    * ${b}\n`;
        }
      }
    }

    if (r.education && r.education.length > 0) {
      prompt += `Education:\n`;
      for (const edu of r.education) {
        prompt += `  - ${edu.degree} in ${edu.field || ''} at ${edu.institution}\n`;
      }
    }

    prompt += `\nPERSONALIZATION:\n`;
    prompt += `Application style: ${s?.tone || 'professional_warm'}\n`;
    prompt += `Available from: ${p?.availableFrom || 'flexible'}\n`;
    prompt += `${p?.needsVisaSponsorship !== undefined ? `Needs visa sponsorship: ${p.needsVisaSponsorship}\n` : ''}`;
    prompt += `${p?.salaryExpectations ? `Salary expectations: ${p.salaryExpectations}\n` : ''}`;
    prompt += `${p?.willingToRelocate !== undefined ? `Willing to relocate: ${p.willingToRelocate}\n` : ''}`;
    prompt += `${p?.willingToTravel !== undefined ? `Willing to travel: ${p.willingToTravel}\n` : ''}`;
    prompt += `${p?.portfolioUrl ? `Portfolio: ${p.portfolioUrl}\n` : ''}`;

    if (s?.writeInFirstPerson !== false) {
      prompt += `Write in first person.\n`;
    }
    if (s?.avoidPhrases?.length) {
      prompt += `Avoid these phrases: ${s.avoidPhrases.join(', ')}.\n`;
    }
    if (s?.sampleAnswer) {
      prompt += `Style reference (use this tone but do not copy content verbatim): "${s.sampleAnswer}"\n`;
    }
    prompt += `Response length: ${s?.lengthPreference || 'standard'}.\n`;

    prompt += `\nJOB DETAILS:\n`;
    prompt += `Role: ${j.roleTitle}\n`;
    prompt += `Company: ${j.companyName}\n`;
    prompt += `Location: ${j.location || 'N/A'}\n`;
    prompt += `Seniority: ${j.seniorityLevel || 'N/A'}\n`;
    prompt += `Role Family: ${j.roleFamily || 'N/A'}\n`;
    if (j.salaryMin && j.salaryMax) {
      prompt += `Salary Range: ${j.salaryCurrency || ''}${j.salaryMin} - ${j.salaryCurrency || ''}${j.salaryMax}\n`;
    }
    if (j.description) {
      prompt += `Description: ${j.description.slice(0, 1000)}\n`;
    }

    prompt += `\nProvide a concise, honest answer to the screening question based on this profile. Match the ${s?.tone || 'professional_warm'} style.`;
    return prompt;
  }

  private inferCategory(question: string): string {
    const lower = question.toLowerCase();
    if (/\b(visa|sponsorship|work.uthorization|citizenship|permit|status)\b/.test(lower)) return 'visa';
    if (/\b(salary|pay|compensation|rate|expect|range)\b/.test(lower)) return 'salary';
    if (/\b(notice|start|available|when can you|immediate)\b/.test(lower)) return 'notice_period';
    if (/\b(location|relocate|remote|onsite|hybrid|willing to travel)\b/.test(lower)) return 'location';
    if (/\b(sponsor|sponsorship|visa.transfer|h1b|h-1b|opt|f1)\b/.test(lower)) return 'sponsorship';
    return 'generic';
  }

  private async saveToBank(userId: string, question: string, answer: string, category: string): Promise<void> {
    const normalized = question.toLowerCase().replace(/[^\w\s]/g, '').trim();
    try {
      const existing = await this.answersBankModel.findOne({
        userId: new Types.ObjectId(userId),
        normalizedQuestion: normalized,
      }).exec();
      if (existing) {
        existing.answer = answer;
        existing.category = category;
        existing.hitCount += 1;
        existing.lastUsedAt = new Date();
        await existing.save();
      } else {
        await this.answersBankModel.create({
          userId: new Types.ObjectId(userId),
          normalizedQuestion: normalized,
          originalQuestion: question,
          answer,
          category,
          hitCount: 1,
          lastUsedAt: new Date(),
        });
      }
    } catch (err) {
      this.logger.debug('Failed to save answer to bank:', (err as Error).message);
    }
  }
}
