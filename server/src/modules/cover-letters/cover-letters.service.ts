import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoverLetter, CoverLetterDocument } from './schemas/cover-letter.schema';
import { AiService } from '../ai/ai.service';
import { COVER_LETTER_SYSTEM } from '../ai/prompts';
import { ResumesService } from '../resumes/resumes.service';

@Injectable()
export class CoverLettersService {
  constructor(
    @InjectModel(CoverLetter.name)
    private coverLetterModel: Model<CoverLetterDocument>,
    private aiService: AiService,
    private resumesService: ResumesService,
  ) {}

  async findByUser(userId: string): Promise<CoverLetterDocument[]> {
    return this.coverLetterModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string, userId: string): Promise<CoverLetterDocument> {
    const letter = await this.coverLetterModel
      .findOne({ _id: id, userId })
      .exec();
    if (!letter) throw new NotFoundException('Cover letter not found');
    return letter;
  }

  async generate(
    userId: string,
    resumeId: string,
    jobTitle: string,
    company: string,
    jobDescription?: string,
    tone: string = 'professional',
  ): Promise<CoverLetterDocument> {
    const { content } = await this.buildPromptAndStream(
      userId, resumeId, jobTitle, company, jobDescription, tone,
    );

    const letter = await this.coverLetterModel.create({
      userId,
      resumeId,
      jobTitle,
      company,
      jobDescription,
      tone,
      content,
    });

    return letter;
  }

  async generateStream(
    userId: string,
    resumeId: string,
    jobTitle: string,
    company: string,
    jobDescription: string | undefined,
    tone: string,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<void> {
    const { content } = await this.buildPromptAndStream(
      userId, resumeId, jobTitle, company, jobDescription, tone,
      (token) => onChunk(token, false),
    );

    await this.coverLetterModel.create({
      userId,
      resumeId,
      jobTitle,
      company,
      jobDescription,
      tone,
      content,
    });

    onChunk(content, true);
  }

  private async buildPromptAndStream(
    userId: string,
    resumeId: string,
    jobTitle: string,
    company: string,
    jobDescription?: string,
    tone: string = 'professional',
    onToken?: (token: string) => void,
  ): Promise<{ content: string }> {
    const resume = await this.resumesService.findById(resumeId, userId);

    const resumeData = resume.toJSON()
    const candidateName = resumeData.name || 'The candidate'
    const toneLabel = tone === 'all' ? 'balanced — blend professional polish with confident directness and a warm, creative personality. Adjust formality to match the industry' : tone
    const userPrompt = `Write a cover letter for ${candidateName} applying for a ${jobTitle} role at ${company}. Tone: ${toneLabel}.

COMPANY (the company the candidate is applying to):
Name: ${company}
Role: ${jobTitle}
${jobDescription ? `Job Description:\n${jobDescription}` : ''}

CANDIDATE'S RESUME (the candidate's own experience, skills, and projects — DO NOT attribute these to ${company}):
Name: ${candidateName}
${JSON.stringify(resumeData)}`;

    const stream = await this.aiService.stream(
      COVER_LETTER_SYSTEM,
      userPrompt,
    );

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
      for (const line of lines) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') break;
        try {
          const parsed = JSON.parse(json);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            content += token;
            onToken?.(token);
          }
        } catch {
          // skip partial lines
        }
      }
    }

    return { content };
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.coverLetterModel
      .deleteOne({ _id: id, userId })
      .exec();
    if (!result.deletedCount) throw new NotFoundException('Cover letter not found');
  }
}
