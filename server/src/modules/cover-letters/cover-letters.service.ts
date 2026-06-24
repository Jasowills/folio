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
    companyName: string,
    jobDescription?: string,
    tone: string = 'professional',
  ): Promise<CoverLetterDocument> {
    const resume = await this.resumesService.findById(resumeId, userId);

    const userPrompt = `Write a ${tone} cover letter for a ${jobTitle} role at ${companyName}.

Resume:
${JSON.stringify(resume.toJSON())}

${jobDescription ? `Job Description:\n${jobDescription}` : ''}`;

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
          content += parsed.choices?.[0]?.delta?.content || '';
        } catch {
          // skip partial lines
        }
      }
    }

    const letter = await this.coverLetterModel.create({
      userId,
      resumeId,
      jobTitle,
      companyName,
      jobDescription,
      tone,
      content,
    });

    return letter;
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.coverLetterModel
      .deleteOne({ _id: id, userId })
      .exec();
    if (!result.deletedCount) throw new NotFoundException('Cover letter not found');
  }
}
