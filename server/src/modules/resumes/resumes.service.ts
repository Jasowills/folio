import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resume, ResumeDocument } from './schemas/resume.schema';
import { GuestResult, GuestResultDocument } from './schemas/guest-result.schema';
import { AiService } from '../ai/ai.service';
import { ResumeParserService } from './resume-parser.service';
import {
  RED_FLAG_SYSTEM,
  ROLE_DETECTION_SYSTEM,
  RESUME_QUALITY_SYSTEM,
  BULLET_REWRITER_SYSTEM,
} from '../ai/prompts';
import { randomUUID } from 'crypto';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);
  private readonly GUEST_TTL_MS = 6 * 3600_000; // 6 hours

  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    @InjectModel(GuestResult.name) private guestResultModel: Model<GuestResultDocument>,
    private aiService: AiService,
    private resumeParser: ResumeParserService,
  ) {}

  async setGuestResult(token: string, data: Record<string, unknown>): Promise<void> {
    await this.guestResultModel.findOneAndUpdate(
      { token },
      { token, data, expiresAt: new Date(Date.now() + this.GUEST_TTL_MS) },
      { upsert: true },
    );
  }

  async getGuestResult(token: string): Promise<Record<string, unknown> | null> {
    const entry = await this.guestResultModel.findOne({ token }).lean();
    if (!entry) return null;
    if (Date.now() > new Date(entry.expiresAt).getTime()) {
      await this.guestResultModel.deleteOne({ token });
      return null;
    }
    return entry.data as Record<string, unknown>;
  }

  async create(userId: string): Promise<ResumeDocument> {
    return this.resumeModel.create({ userId });
  }

  async findById(id: string, userId: string): Promise<ResumeDocument> {
    const resume = await this.resumeModel.findOne({ _id: id, userId }).exec();
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async findByUser(userId: string): Promise<ResumeDocument[]> {
    return this.resumeModel.find({ userId }).sort({ updatedAt: -1 }).exec();
  }

  async saveStructured(
    id: string,
    userId: string,
    data: Record<string, unknown>,
  ): Promise<ResumeDocument> {
    const resume = await this.findById(id, userId);

    resume.set(data);
    await this.detectRedFlags(resume);
    await this.saveVersion(resume);

    return resume.save();
  }

  async uploadFile(
    userId: string,
    rawText: string,
    fileUrl?: string,
    cloudinaryPublicId?: string,
  ): Promise<ResumeDocument> {
    const resume = await this.create(userId);
    resume.rawText = rawText;
    if (fileUrl) resume.fileUrl = fileUrl;
    if (cloudinaryPublicId) resume.cloudinaryPublicId = cloudinaryPublicId;

    const parsed = await this.resumeParser.parse(rawText);
    this.logger.log(`uploadFile: parse done — name="${parsed.name}", exp=${parsed.experience.length}, edu=${parsed.education.length}, skills=${parsed.skills.length}, certs=${parsed.certifications.length}, langs=${parsed.languages.length}, confidence=${parsed.confidence}`);

    resume.set({
      name: parsed.name,
      contact: parsed.contact,
      summary: parsed.summary,
      experience: parsed.experience,
      education: parsed.education,
      skills: parsed.skills,
      certifications: parsed.certifications,
      languages: parsed.languages,
      links: parsed.links,
    });
    this.normalizeContactUrls(resume as any);

    return resume.save();
  }

  async analyzeResume(
    id: string,
    userId: string,
  ): Promise<ResumeDocument> {
    const resume = await this.findById(id, userId);
    const rawText = resume.rawText || '';

    const parsed = await this.resumeParser.parse(rawText);
    this.logger.log(`analyzeResume: parsed name="${parsed.name}", exp=${parsed.experience.length}, edu=${parsed.education.length}, skills=${parsed.skills.length}`);

    resume.set({
      name: parsed.name,
      contact: parsed.contact,
      summary: parsed.summary,
      experience: parsed.experience,
      education: parsed.education,
      skills: parsed.skills,
      certifications: parsed.certifications,
      languages: parsed.languages,
      links: parsed.links,
    });
    this.normalizeContactUrls(resume as any);
    await this.runAnalysis(resume, rawText);
    await this.saveVersion(resume);

    return this.resumeModel.findByIdAndUpdate(id, resume.toJSON(), { new: true }).exec() as unknown as Promise<ResumeDocument>;
  }

  async analyzeWithProgress(
    id: string,
    userId: string,
    onProgress: (step: string, label: string) => void,
  ): Promise<ResumeDocument> {
    const resume = await this.findById(id, userId);
    const rawText = resume.rawText || '';
    if (!rawText) throw new BadRequestException('No extracted text to analyze');

    onProgress('extracting', 'Extracting resume data...');
    const parsed = await this.resumeParser.parse(rawText);
    this.logger.log(`analyzeWithProgress: parsed name="${parsed.name}", exp=${parsed.experience.length}, edu=${parsed.education.length}, skills=${parsed.skills.length}`);

    resume.set({
      name: parsed.name,
      contact: parsed.contact,
      summary: parsed.summary,
      experience: parsed.experience,
      education: parsed.education,
      skills: parsed.skills,
      certifications: parsed.certifications,
      languages: parsed.languages,
      links: parsed.links,
    });
    onProgress('extracting_complete', 'Resume data extracted');

    await this.runAnalysis(resume, rawText, onProgress);
    await this.saveVersion(resume);

    await this.resumeModel.findByIdAndUpdate(id, resume.toJSON(), { new: true }).exec();
    return resume;
  }

  async reExtract(id: string, userId: string): Promise<ResumeDocument> {
    const resume = await this.findById(id, userId);
    const rawText = resume.rawText || '';
    if (!rawText) throw new BadRequestException('No raw text to extract from');

    this.logger.log(`reExtract: re-running parser on resume ${id}`);
    const parsed = await this.resumeParser.parse(rawText);
    this.logger.log(`reExtract: parsed name="${parsed.name}", exp=${parsed.experience.length}, edu=${parsed.education.length}, skills=${parsed.skills.length}, certs=${parsed.certifications.length}, langs=${parsed.languages.length}`);

    resume.set({
      name: parsed.name,
      contact: parsed.contact,
      summary: parsed.summary,
      experience: parsed.experience,
      education: parsed.education,
      skills: parsed.skills,
      certifications: parsed.certifications,
      languages: parsed.languages,
      links: parsed.links,
    });
    this.normalizeContactUrls(resume as any);

    return resume.save();
  }

  async guestExtractFromText(
    rawText: string,
    fileUrl?: string,
    cloudinaryPublicId?: string,
  ): Promise<Record<string, unknown>> {
    this.logger.log(`guestExtractFromText: rawText length = ${rawText.length}, first 200 chars: "${rawText.slice(0, 200).replace(/\n/g, '\\n')}"`);

    const parsed = await this.resumeParser.parse(rawText);
    this.logger.log(`guestExtractFromText: parsed name="${parsed.name}", exp=${parsed.experience.length}, edu=${parsed.education.length}, skills=${parsed.skills.length}`);

    if (!parsed.isResume) {
      throw new BadRequestException('The uploaded file does not appear to be a resume. Please upload a resume, CV, or professional profile.');
    }

    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const TODAY = `Today is ${todayStr}.`;
    const structured = parsed as unknown as Record<string, unknown>;

    this.logger.log(`guestExtractFromText: contact extracted — email=${!!parsed.contact.email}, phone=${!!parsed.contact.phone}, linkedin=${parsed.contact.linkedin || 'null'}, website=${parsed.contact.website || 'null'}, github=${parsed.contact.github || 'null'}`);
    this.logger.log(`guestExtractFromText: raw text mentions — linkedin=${/\blinkedin\b/i.test(rawText)}, github=${/\bgithub\b/i.test(rawText)}, portfolio=${/\bportfolio\b/i.test(rawText)}`);

    const linkNote = this.buildLinkContextNote(rawText);

    const stagger = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const roleResult = await this.aiService.chat(
      ROLE_DETECTION_SYSTEM,
      `${TODAY} Analyze this resume for target role:\n${JSON.stringify(structured)}`,
    ).catch(() => ({}));
    const detectedRole = (roleResult as any)?.role || 'unknown';
    const seniority = (roleResult as any)?.seniority || 'mid';

    await stagger(1000);

    const [rawRedFlagsResult, qualityResult] = await (async () => {
      const redFlagsResult = await this.aiService.chat(
        RED_FLAG_SYSTEM,
        `${linkNote}${TODAY} Detected role: ${detectedRole} (${seniority})
Check this resume for red flags:
Raw Text:\n${rawText.slice(0, 3000)}\n\nStructured Data:\n${JSON.stringify(structured)}`,
      ).catch(() => ({ flags: [] }));
      await stagger(1000);
      const qualityResult = await this.aiService.chat(
        RESUME_QUALITY_SYSTEM,
        `${linkNote}${TODAY} Detected target role: ${detectedRole} (${seniority})
Evaluate the presentation quality of this resume:
Raw Text:\n${rawText.slice(0, 5000)}\n\nStructured Data:\n${JSON.stringify(structured)}`,
      ).catch(() => ({}));
      return [redFlagsResult, qualityResult] as const;
    })();

    const redFlagsResult = {
      ...rawRedFlagsResult,
      flags: this.filterLinkFlags(
        rawText,
        this.filterFutureDateFlags((rawRedFlagsResult.flags as any[]) || []),
      ),
    };

    this.logger.log(`guestExtractFromText: role="${(roleResult as any)?.role}", seniority="${(roleResult as any)?.seniority}", confidence=${(roleResult as any)?.confidence}`);
    this.logger.log(`guestExtractFromText: quality overall=${(qualityResult as any)?.overallQuality}, flags=${(redFlagsResult.flags as any[])?.length}`);

    const score = this.computeOverallScore(
      (roleResult as any)?.seniority,
      (redFlagsResult.flags as any[]) || [],
      (qualityResult as any)?.overallQuality,
    );
    this.logger.log(`guestExtractFromText: computed score = ${score}`);

    const result: Record<string, unknown> = {
      ...structured,
      rawText,
      fileUrl: fileUrl || '',
      cloudinaryPublicId: cloudinaryPublicId || '',
      score,
      redFlags: (redFlagsResult.flags as any[]) || [],
      detectedRole: {
        role: (roleResult as any)?.role || null,
        seniority: (roleResult as any)?.seniority || null,
        industries: (roleResult as any)?.industries || [],
        confidence: (roleResult as any)?.confidence || 0,
      },
      quality: {
        layoutScore: (qualityResult as any)?.layoutScore ?? 0,
        linksScore: (qualityResult as any)?.linksScore ?? 0,
        professionalismScore: (qualityResult as any)?.professionalismScore ?? 0,
        readabilityScore: (qualityResult as any)?.readabilityScore ?? 0,
        imagesAssessment: (qualityResult as any)?.imagesAssessment || 'none',
        overallQuality: (qualityResult as any)?.overallQuality ?? 0,
        strengths: (qualityResult as any)?.strengths || [],
        issues: (qualityResult as any)?.issues || [],
        suggestions: (qualityResult as any)?.suggestions || [],
      },
    };
    const token = randomUUID();
    await this.setGuestResult(token, result);
    return { token, ...result };
  }

  async rewriteBullet(
    id: string,
    userId: string,
    bullet: string,
    context?: string,
  ): Promise<{ variations: string[] }> {
    const resume = await this.findById(id, userId);
    const userMessage = `Resume context (optional): ${context || 'N/A'}\n\nBullet to rewrite: "${bullet}"`;
    const result = await this.aiService.chat(BULLET_REWRITER_SYSTEM, userMessage);
    const raw = result.variations;
    const variations = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
    return { variations };
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.resumeModel
      .deleteOne({ _id: id, userId })
      .exec();
    if (!result.deletedCount) throw new NotFoundException('Resume not found');
  }

  private async runAnalysis(
    resume: ResumeDocument,
    rawText: string,
    onProgress?: (step: string, label: string) => void,
  ): Promise<void> {
    const TODAY = `Today is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`;
    const structured = resume.toJSON();

    const stagger = (ms: number) => new Promise((r) => setTimeout(r, ms));

    onProgress?.('role', 'Detecting target role...');
    const roleResult = await this.aiService.chat(
      ROLE_DETECTION_SYSTEM,
      `${TODAY} Analyze this resume for target role:\n${JSON.stringify(structured)}`,
    ).catch(() => ({}));
    const detectedRole = (roleResult as any)?.role || 'unknown';
    const seniority = (roleResult as any)?.seniority || 'mid';
    onProgress?.('role_complete', 'Target role detected');

    await stagger(1000);

    const linkNote = this.buildLinkContextNote(rawText);

    onProgress?.('quality', 'Evaluating resume quality...');
    const qualityResult = await this.aiService.chat(
      RESUME_QUALITY_SYSTEM,
      `${linkNote}${TODAY} Detected target role: ${detectedRole} (${seniority})
Evaluate the presentation quality of this resume:
Raw Text:\n${rawText.slice(0, 5000)}\n\nStructured Data:\n${JSON.stringify(structured)}`,
    ).catch(() => ({}));
    onProgress?.('quality_complete', 'Quality evaluated');

    await stagger(1000);

    onProgress?.('redflags', 'Checking for red flags...');
    const rawRedFlagsResult = await this.aiService.chat(
      RED_FLAG_SYSTEM,
      `${linkNote}${TODAY} Detected role: ${detectedRole} (${seniority})
Check this resume for red flags:
Raw Text:\n${rawText.slice(0, 3000)}\n\nStructured Data:\n${JSON.stringify(structured)}`,
    ).catch(() => ({ flags: [] }));
    const filteredFlags = this.filterLinkFlags(
      rawText,
      this.filterFutureDateFlags((rawRedFlagsResult.flags as any[]) || []),
    );

    resume.detectedRole = {
      role: (roleResult as any)?.role || null,
      seniority: (roleResult as any)?.seniority || null,
      industries: (roleResult as any)?.industries || [],
      confidence: (roleResult as any)?.confidence || 0,
    };

    resume.quality = {
      layoutScore: (qualityResult as any)?.layoutScore ?? 0,
      linksScore: (qualityResult as any)?.linksScore ?? 0,
      professionalismScore: (qualityResult as any)?.professionalismScore ?? 0,
      readabilityScore: (qualityResult as any)?.readabilityScore ?? 0,
      imagesAssessment: (qualityResult as any)?.imagesAssessment || 'none',
      overallQuality: (qualityResult as any)?.overallQuality ?? 0,
      strengths: (qualityResult as any)?.strengths || [],
      issues: (qualityResult as any)?.issues || [],
      suggestions: (qualityResult as any)?.suggestions || [],
    };

    resume.redFlags = (filteredFlags as any[]) || [];
    resume.score = this.computeOverallScore(
      seniority,
      (filteredFlags as any[]) || [],
      (qualityResult as any)?.overallQuality,
    );

    onProgress?.('complete', 'Analysis complete');
  }

  private computeOverallScore(
    seniority?: string,
    redFlags?: Array<{ severity: string }>,
    qualityScore?: number,
  ): number {
    const base = 50;
    const severityWeights: Record<string, number> = { high: 12, medium: 6, low: 2 };
    const redFlagPenalty = Math.min(
      (redFlags || []).reduce((sum, f) => sum + (severityWeights[f.severity] || 0), 0),
      40,
    );
    const qualityBonus = qualityScore ? Math.round((qualityScore - 50) * 0.5) : 0;
    const seniorityBonus = seniority === 'executive' ? 5 : seniority === 'lead' ? 3 : seniority === 'senior' ? 2 : 0;
    return Math.max(15, Math.min(100, base - redFlagPenalty + qualityBonus + seniorityBonus));
  }

  private normalizeContactUrls(data: { contact?: Record<string, string | null | undefined> }): void {
    if (!data.contact) return;
    const urlFields: Array<{ key: string; domain: string }> = [
      { key: 'linkedin', domain: 'linkedin.com/in/' },
      { key: 'github', domain: 'github.com/' },
      { key: 'website', domain: '' },
    ];
    for (const { key, domain } of urlFields) {
      const val = data.contact[key];
      if (!val) continue;
      let normalized = val.trim();
      if (normalized.startsWith('/')) {
        normalized = `https://${domain}${normalized.replace(/^\//, '')}`;
      } else if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        if (domain) {
          const path = domain.replace(/\/$/, '');
          if (normalized.includes(path)) {
            normalized = `https://${normalized}`;
          } else {
            normalized = `https://${domain}${normalized.replace(new RegExp(`^${path.split('/')[0]}/`), '')}`;
          }
        } else {
          normalized = `https://${normalized}`;
        }
      }
      data.contact[key] = normalized;
    }
  }

  /**
   * PDF text extraction captures visible text labels but NOT hyperlink URLs.
   * If the raw text contains link labels, returns a note prepended to AI prompts
   * so downstream models don't flag them as missing.
   */
  private buildLinkContextNote(rawText: string): string {
    const lower = rawText.toLowerCase();
    const found: string[] = [];
    if (/\blinkedin\b/i.test(lower)) found.push('LinkedIn');
    if (/\bgithub\b/i.test(lower)) found.push('GitHub');
    if (/\bportfolio\b/i.test(lower)) found.push('portfolio');
    if (found.length === 0) return '';
    const profiles = found.join('/');
    return `NOTE: The raw text below contains "${profiles}" as text labels. PDF text extraction cannot capture hyperlink URLs — the actual ${profiles} URLs are in the PDF but were not extractable. The candidate clearly has these profiles. Do NOT flag any of them as missing or incomplete. Any ${profiles} mentions in the structured data may show as null for this reason.\n\n`;
  }

  /**
   * The model's training cutoff can cause it to flag past dates as "in the future."
   * Parse dates in flag messages and discard any flag where the referenced date is
   * actually in the past relative to the server's clock.
   */
  private filterFutureDateFlags(flags: any[]): any[] {
    const today = new Date();
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    return flags.filter((flag) => {
      const msg = ((flag?.message as string) || '').toLowerCase();
      // Only check flags that mention "future"
      if (!msg.includes('future') && !msg.includes('ahead') && !msg.includes('not yet')) return true;

      // Try to extract month year patterns like "July 2025", "May 2026", etc.
      const monthYear = msg.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i);
      if (!monthYear) return true;

      const monthIndex = monthNames.indexOf(monthYear[1].toLowerCase());
      const year = parseInt(monthYear[2], 10);
      if (monthIndex === -1) return true;

      const flagDate = new Date(year, monthIndex, 1);
      // If the date is ≤ today, it's NOT in the future — discard this false positive
      if (flagDate <= today) {
        this.logger.log(`filterFutureDateFlags: discarding flag about "${monthYear[0]}" — ${flagDate.toISOString()} is not in the future`);
        return false;
      }
      return true;
    });
  }

  /**
   * Despite prompt instructions, the AI still flags LinkedIn/GitHub/portfolio as
   * "missing" when the raw text contains the label but no URL was extractable.
   * Post-process: if the raw text mentions a label, strip any flag about it.
   */
  private filterLinkFlags(rawText: string, flags: any[]): any[] {
    const lower = rawText.toLowerCase();
    const hasLinkedIn = /\blinkedin\b/i.test(lower);
    const hasGitHub = /\bgithub\b/i.test(lower);
    const hasPortfolio = /\bportfolio\b/i.test(lower);
    const hasWebsite = /\bwebsite\b/i.test(lower) || /\bpersonal\s+(site|website)\b/i.test(lower);

    const filtered = flags.filter((flag) => {
      const msg = ((flag?.message as string) || '').toLowerCase();
      // If the flag mentions linkedin being missing but raw text has the label
      if (hasLinkedIn && /linkedin/i.test(msg) && /missing|not found|no url|not provided|absent/i.test(msg)) {
        this.logger.log(`filterLinkFlags: discarding LinkedIn flag — label found in raw text`);
        return false;
      }
      if (hasGitHub && /github/i.test(msg) && /missing|not found|no url|not provided|absent/i.test(msg)) {
        this.logger.log(`filterLinkFlags: discarding GitHub flag — label found in raw text`);
        return false;
      }
      if ((hasPortfolio || hasWebsite) && (/portfolio/i.test(msg) || /website/i.test(msg)) && /missing|not found|no url|not provided|absent/i.test(msg)) {
        this.logger.log(`filterLinkFlags: discarding portfolio/website flag — label found in raw text`);
        return false;
      }
      return true;
    });

    if (filtered.length !== flags.length) {
      this.logger.log(`filterLinkFlags: removed ${flags.length - filtered.length} link-related flags`);
    }
    return filtered;
  }

  private async detectRedFlags(
    resume: ResumeDocument,
  ): Promise<void> {
    const role = resume.detectedRole?.role || 'unknown';
    const seniority = resume.detectedRole?.seniority || 'mid';
    const rawText = resume.rawText || '';
    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const linkNote = this.buildLinkContextNote(rawText);
    const result = await this.aiService.chat(
      RED_FLAG_SYSTEM,
      `${linkNote}Today is ${todayStr}. Detected role: ${role} (${seniority})
Check this resume for red flags:
Raw Text:\n${rawText.slice(0, 3000)}\n\nStructured Data:\n${JSON.stringify(resume.toJSON())}`,
    );

    resume.redFlags = this.filterLinkFlags(
      rawText,
      this.filterFutureDateFlags((result.flags as any[]) || []),
    );
  }

  private async saveVersion(resume: ResumeDocument): Promise<void> {
    const snapshot = { ...resume.toJSON() };
    delete snapshot.versions;

    if (!resume.versions) resume.versions = [];
    resume.versions.push({
      structured: snapshot as unknown as Record<string, unknown>,
      createdAt: new Date(),
    });
  }
}
