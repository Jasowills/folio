import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from '../resumes/schemas/resume.schema';
import { AiService } from '../ai/ai.service';

interface BuilderStepData {
  basics?: {
    name: string;
    headline?: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
    github?: string;
  };
  targetRole?: {
    role: string;
    level: string;
    industry: string;
    company?: string;
    companyUrl?: string;
    jobDescription?: string;
  };
  summary?: string;
  experience?: Array<{
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    location?: string;
    bullets: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  skills?: string[];
  optional?: {
    certifications?: Array<{ name: string; issuer?: string; date?: string }>;
    languages?: string[];
    projects?: Array<{ name: string; description: string; url?: string }>;
    volunteer?: Array<{ organization: string; role: string; description?: string }>;
    awards?: Array<{ title: string; issuer?: string; date?: string }>;
  };
}

@Injectable()
export class BuilderService {
  private readonly logger = new Logger(BuilderService.name);

  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    private ai: AiService,
  ) {}

  async start(userId: string): Promise<ResumeDocument> {
    const resume = await this.resumeModel.create({
      userId: new Types.ObjectId(userId),
      source: 'builder',
      wizardState: {
        currentStep: 0,
        completedSteps: [],
        stepData: {},
        isComplete: false,
      },
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'links'],
    });
    return resume;
  }

  async getState(resumeId: string, userId: string): Promise<ResumeDocument> {
    const resume = await this.resumeModel.findOne({ _id: resumeId, userId }).exec();
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async saveState(
    resumeId: string,
    userId: string,
    wizardState: Record<string, unknown>,
  ): Promise<ResumeDocument> {
    const resume = await this.resumeModel
      .findOneAndUpdate(
        { _id: resumeId, userId },
        { $set: { wizardState } },
        { new: true },
      )
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async generateSummary(
    userId: string,
    resumeId: string,
    body: {
      targetRole: string;
      level: string;
      industry: string;
      years: number;
      achievements: string;
      tools: string[];
      jobDescription?: string;
    },
    onToken: (token: string, done: boolean) => void,
  ): Promise<void> {
    const roleContext = body.jobDescription
      ? `\nJob Description to tailor to:\n${body.jobDescription}`
      : '';

    const systemPrompt = `You are an expert resume writer. Write a professional summary for a resume. The summary must be 3-4 sentences. It must lead with years of experience and specialty. It must name at least 2 specific tools or technologies. It must reference at least one quantified achievement. It must be written in third-person style (no I, me, or my). It must be ATS-optimised for the target role. It must sound like a real person wrote it — not a template. Return only the summary text. No labels, no markdown, no preamble.`;

    const userPrompt = `Target role: ${body.targetRole}
Level: ${body.level}
Industry: ${body.industry}
Years of experience: ${body.years}
Proud achievements: ${body.achievements}
Core tools: ${body.tools.join(', ')}
${roleContext}`;

    await this.streamFromAI(systemPrompt, userPrompt, onToken);
  }

  async generateBullets(
    userId: string,
    resumeId: string,
    body: {
      jobTitle: string;
      company: string;
      rawNotes: string;
      targetRole: string;
      level: string;
      jobDescription?: string;
    },
    onToken: (token: string, done: boolean) => void,
  ): Promise<void> {
    const roleContext = body.jobDescription
      ? `\nJob Description to tailor to:\n${body.jobDescription}`
      : '';

    const systemPrompt = `You are an expert resume writer specialising in ATS optimisation. Convert the raw job notes below into 4-6 professional resume bullet points. Each bullet must: start with a strong past-tense action verb, follow the STAR format implicitly (situation/task, action, result), include a quantified result where the notes provide one, be between 15 and 25 words, contain no first-person pronouns, and be optimised for ATS keyword matching for the target role. Where the notes suggest a result but do not quantify it use [X%] or [N users] as a placeholder to prompt the user to fill in the metric. Return only a JSON array of bullet strings. No markdown. No labels.`;

    const userPrompt = `Target role: ${body.targetRole}
Level: ${body.level}
Job title: ${body.jobTitle}
Company: ${body.company}
Raw notes: ${body.rawNotes}
${roleContext}`;

    await this.streamFromAI(systemPrompt, userPrompt, onToken);
  }

  async generateProjectDescription(
    userId: string,
    resumeId: string,
    body: {
      projectName: string;
      rawDescription: string;
      targetRole: string;
    },
    onToken: (token: string, done: boolean) => void,
  ): Promise<void> {
    const systemPrompt = `You are an expert resume writer. Write a 2-3 line project description for a resume. Use strong action verbs. Include a quantified result where possible. Write in third person. Return only the description text. No labels. No markdown.`;

    const userPrompt = `Project name: ${body.projectName}
Raw description: ${body.rawDescription}
Target role: ${body.targetRole}`;

    await this.streamFromAI(systemPrompt, userPrompt, onToken);
  }

  async suggestSkills(
    userId: string,
    resumeId: string,
    body: {
      targetRole: string;
      level: string;
      industry: string;
      existingSkills: string[];
      jobDescription?: string;
    },
  ): Promise<string[]> {
    const jdContext = body.jobDescription
      ? `\nJob Description keywords:\n${body.jobDescription}`
      : '';

    const systemPrompt = `You are an ATS optimisation expert. Given a target role, level, industry, and existing skills, suggest 8-12 additional skills that would strengthen the resume for this specific role. Focus on skills that are: highly relevant to the target role, commonly required at the stated level, and not already in the existing skills list. Return only a JSON array of skill name strings. No markdown. No labels.`;

    const userPrompt = `Target role: ${body.targetRole}
Level: ${body.level}
Industry: ${body.industry}
Existing skills: ${body.existingSkills.join(', ')}
${jdContext}`;

    const raw = await this.ai.chatForBuilder(systemPrompt, userPrompt);
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string');
    } catch {
      return raw.split('\n').map(s => s.trim().replace(/^[-•*"]+|["",]+$/g, '')).filter(Boolean);
    }
    return [];
  }

  async chat(
    userId: string,
    resumeId: string,
    body: {
      message: string;
      history?: Array<{ role: string; content: string }>;
      resumeSnapshot?: Record<string, unknown>;
    },
    onToken: (token: string) => void,
  ): Promise<void> {
    this.logger.log(`[chat] userId=${userId} resumeId=${resumeId} message="${body.message?.slice(0, 100)}"`);
    const stepData = body.resumeSnapshot || {};
    const snapshot = JSON.stringify(stepData, null, 2);

    const systemPrompt = `You are an AI resume builder with direct access to modify the user's resume data.

## Current Resume
\`\`\`json
${snapshot}
\`\`\`

## Available Actions
You can modify the resume by emitting action tags. Each tag must be on its own line.

### Personal Info
- \`\`\`[ACTION]{"fn":"set_basics","name":"...","headline":"...","email":"...","phone":"...","location":"...","linkedin":"...","github":"..."}[/ACTION]\`\`\`

### Summary
- \`\`\`[ACTION]{"fn":"set_summary","text":"..."}[/ACTION]\`\`\`

### Experience
- \`\`\`[ACTION]{"fn":"add_experience","title":"...","company":"...","startDate":"...","endDate":"...","current":false,"location":"...","bullets":["..."]}[/ACTION]\`\`\`
- \`\`\`[ACTION]{"fn":"update_experience_bullets","index":0,"bullets":["...","..."]}[/ACTION]\`\`\`
- \`\`\`[ACTION]{"fn":"remove_experience","index":0}[/ACTION]\`\`\`

### Education
- \`\`\`[ACTION]{"fn":"add_education","degree":"...","field":"...","institution":"...","startYear":"...","endYear":"...","gpa":"..."}[/ACTION]\`\`\`
- \`\`\`[ACTION]{"fn":"remove_education","index":0}[/ACTION]\`\`\`

### Skills
- \`\`\`[ACTION]{"fn":"add_skill","skill":"..."}[/ACTION]\`\`\`
- \`\`\`[ACTION]{"fn":"remove_skill","skill":"..."}[/ACTION]\`\`\`
- \`\`\`[ACTION]{"fn":"set_skills","skills":["...","..."]}[/ACTION]\`\`\`

### Design & Template
- \`\`\`[ACTION]{"fn":"set_template","templateId":"modern"}[/ACTION]\`\`\` — change the template. Valid ids: minimal, modern, executive, compact, classic, sidebar, bold, creative, tech, academic, charter, prestige, engineer, contemporary, folio
- \`\`\`[ACTION]{"fn":"set_design","design":{"headingFont":"DM Serif Display","bodyFont":"Plus Jakarta Sans","primaryColor":"#0F6E56","secondaryColor":"#475569","columnLayout":"single-column","bodyFontSize":10,"lineSpacing":1.5,"margins":3,"sectionSpacing":3}}[/ACTION]\`\`\` — change design settings. You can pass a partial design object — only the fields you want to change. Common colors: Teal #0F6E56, Navy #1E3A5F, Forest #2D5A27, Burgundy #722F37, Slate #475569, Amber #92400E, Cobalt #1E40AF, Plum #5B21B6

## Rules
1. Emit action tags on their own lines for every change the user asks for.
2. After the actions, write a natural language explanation of what you changed.
3. If the user asks to review the resume, emit a review_resume action AND write a detailed critique.
4. Be conversational, helpful, and precise. Use the resume data above to inform your decisions.
5. If asked about something outside your abilities, explain what you can and cannot do.`;

    const historyText = (body.history || [])
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const userMessage = historyText
      ? `Previous conversation:\n${historyText}\n\nUser message: ${body.message}`
      : body.message;

    const stream = await this.ai.stream(
      systemPrompt,
      userMessage,
    );
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const json = line.slice(6).trim();
          if (json === '[DONE]') return;
          try {
            const parsed = JSON.parse(json);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) onToken(token);
          } catch { /* skip partial */ }
        }
      }
    } catch (err) {
      this.logger.error(`Chat stream error: ${(err as Error).message}`);
    }
  }

  async finish(
    resumeId: string,
    userId: string,
  ): Promise<ResumeDocument> {
    const resume = await this.resumeModel.findOne({ _id: resumeId, userId }).exec();
    if (!resume) throw new NotFoundException('Resume not found');

    const ws = resume.wizardState;
    if (!ws) throw new BadRequestException('No wizard state to finalize');
    if (ws.isComplete) throw new BadRequestException('Wizard already finalized');

    const stepData = ws.stepData as Record<string, unknown>;
    const basics = stepData['basics'] as Record<string, unknown> | undefined;
    const targetRole = stepData['targetRole'] as Record<string, unknown> | undefined;
    const summary = stepData['summary'] as Record<string, unknown> | undefined;
    const experience = (stepData['experience'] || []) as Array<Record<string, unknown>>;
    const education = (stepData['education'] || []) as Array<Record<string, unknown>>;
    const skills = (stepData['skills'] || []) as string[];
    const optional = stepData['optional'] as Record<string, unknown> | undefined;

    const optionalData = optional || {};
    const certs = (optionalData['certificationsData'] || []) as Array<Record<string, unknown>>;
    const langs = (optionalData['languagesData'] || []) as string[];
    const projects = (optionalData['projectsData'] || []) as Array<Record<string, unknown>>;
    const volunteer = (optionalData['volunteerData'] || []) as Array<Record<string, unknown>>;
    const awards = (optionalData['awardsData'] || []) as Array<Record<string, unknown>>;

    // Build section order
    const sectionOrder: string[] = [];
    if (summary?.text) sectionOrder.push('summary');
    if (experience.length > 0) sectionOrder.push('experience');
    if (education.length > 0) sectionOrder.push('education');
    if (skills.length > 0) sectionOrder.push('skills');
    if (optionalData['certifications'] && certs.length > 0) sectionOrder.push('certifications');
    if (optionalData['languages'] && langs.length > 0) sectionOrder.push('languages');
    if (projects.length > 0) sectionOrder.push('projects');
    if (volunteer.length > 0) sectionOrder.push('volunteer');
    if (awards.length > 0) sectionOrder.push('awards');

    const defaultOrder = ['summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'links'];

    const updated = await this.resumeModel
      .findOneAndUpdate(
        { _id: resumeId, userId },
        {
          $set: {
            name: basics?.name || '',
            title: basics?.headline || targetRole?.role || '',
            contact: {
              email: basics?.email || '',
              phone: basics?.phone || '',
              location: basics?.location || '',
              linkedin: basics?.linkedin || undefined,
              website: basics?.website || undefined,
              github: basics?.github || undefined,
            },
            summary: (summary?.text as string) || '',
            experience: experience.map(e => ({
              company: e.company,
              title: e.title,
              startDate: e.startDate,
              endDate: e.current ? undefined : e.endDate,
              current: e.current || false,
              bullets: (e.bullets as string[]) || [],
            })),
            education: education.map(e => ({
              institution: e.institution,
              degree: e.degree,
              field: e.field || '',
              startDate: e.startYear || '',
              endDate: e.inProgress ? undefined : (e.endYear as string),
              gpa: e.gpa || undefined,
            })),
            skills,
            certifications: certs.map(c => ({
              name: c.name,
              issuer: c.issuer || '',
              date: c.date || undefined,
            })),
            languages: langs,
            sectionOrder: sectionOrder.length > 0 ? sectionOrder : defaultOrder,
            design: ws.selectedTemplate
              ? {
                  headingFont: 'DM Serif Display',
                  bodyFont: 'Plus Jakarta Sans',
                  bodyFontSize: 10,
                  lineSpacing: 1.5,
                  primaryColor: '#0F6E56',
                  secondaryColor: '#475569',
                  columnLayout: 'single-column',
                  margins: 3,
                  sectionSpacing: 3,
                }
              : {},
            templateId: ws.selectedTemplate || 'minimal',
            editMode: 'guided',
            'wizardState.isComplete': true,
          },
        },
        { new: true },
      )
      .exec();

    return updated!;
  }

  private async streamFromAI(
    system: string,
    user: string,
    onToken: (token: string, done: boolean) => void,
  ): Promise<void> {
    const stream = await this.ai.stream(system, user);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onToken('', true);
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const json = line.slice(6).trim();
          if (json === '[DONE]') {
            onToken('', true);
            return;
          }
          try {
            const parsed = JSON.parse(json);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) onToken(token, false);
          } catch {
            // skip partial
          }
        }
      }
    } catch (err) {
      this.logger.error(`Stream error: ${(err as Error).message}`);
      onToken('', true);
    }
  }
}
