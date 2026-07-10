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
        { returnDocument: 'after' },
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
      currentTemplate?: string;
      currentColor?: string;
      currentFont?: string;
    },
    onToken: (token: string) => void,
  ): Promise<void> {
    this.logger.log(`[chat] userId=${userId} resumeId=${resumeId} message="${body.message?.slice(0, 100)}"`);
    const stepData = (body.resumeSnapshot || {}) as Record<string, unknown>;
    const snapshot = JSON.stringify(stepData, null, 2);

    const basics = stepData.basics as Record<string, unknown> | undefined;
    const targetRole = stepData.targetRole as Record<string, unknown> | undefined;
    const experience = stepData.experience as Array<Record<string, unknown>> | undefined;
    const skills = stepData.skills as string[] | undefined;

    const stateSummary = body.resumeSnapshot
      ? `Name: ${(basics?.name as string) || 'Not set'}
Target role: ${(targetRole?.role as string) || 'Not set'}
Experience: ${(experience || []).length} entries
Skills: ${(skills || []).join(', ') || 'None'}
Current template: ${body.currentTemplate || 'minimal'}
Current color: ${body.currentColor || '#1a1a2e'}
Current font: ${body.currentFont || 'Inter'}` 
      : '';

    const systemPrompt = `You are an AI resume builder. The user will give you instructions to build or modify their resume. You must output action tags to make changes.

## Current Resume Context
${body.resumeSnapshot ? stateSummary : snapshot}

## Action Tags
Output one or more of these tags (each on its own line, no markdown, no backticks):

### Content actions:
[ACTION]{"fn":"set_basics","name":"...","headline":"...","email":"...","phone":"...","location":"...","linkedin":"...","github":"...","website":"..."}[/ACTION]
[ACTION]{"fn":"set_target_role","role":"...","level":"...","industry":"...","company":"...","companyUrl":"...","jobDescription":"..."}[/ACTION]
[ACTION]{"fn":"set_summary","text":"..."}[/ACTION]
[ACTION]{"fn":"add_experience","title":"...","company":"...","startDate":"...","endDate":"...","current":false,"bullets":["...","..."],"rawNotes":"..."}[/ACTION]
[ACTION]{"fn":"update_experience_bullets","index":0,"bullets":["...","..."]}[/ACTION]
[ACTION]{"fn":"remove_experience","index":0}[/ACTION]
[ACTION]{"fn":"add_education","degree":"...","field":"...","institution":"...","startYear":"...","endYear":"...","inProgress":false,"gpa":"..."}[/ACTION]
[ACTION]{"fn":"remove_education","index":0}[/ACTION]
[ACTION]{"fn":"add_skill","skill":"..."}[/ACTION]
[ACTION]{"fn":"remove_skill","skill":"..."}[/ACTION]
[ACTION]{"fn":"set_skills","skills":["...","..."]}[/ACTION]
[ACTION]{"fn":"set_optional","certifications":true,"certificationsData":[{"name":"AWS SAA","issuer":"Amazon","date":"2024"}],"languages":true,"languagesData":["English (Native)","Spanish (Professional)"],"projects":true,"projectsData":[{"name":"...","description":"...","url":"...","rawNotes":"..."}],"volunteer":true,"volunteerData":[{"organization":"...","role":"...","description":"..."}],"awards":true,"awardsData":[{"title":"...","issuer":"...","date":"..."}]}[/ACTION]

### Design actions:
[ACTION]{"fn":"set_template","templateId":"modern"}[/ACTION]  (ids: minimal, modern, executive, compact, classic, sidebar, bold, creative, tech, academic, charter, prestige, engineer, contemporary, folio)
[ACTION]{"fn":"set_design","primaryColor":"#1a1a2e"}[/ACTION]
[ACTION]{"fn":"set_design","headingFont":"DM Serif Display","bodyFont":"Lora"}[/ACTION]  (serif request)
[ACTION]{"fn":"set_design","columnLayout":"two-column"}[/ACTION]  (or single-column)
[ACTION]{"fn":"set_design","sectionSpacing":1.5}[/ACTION]  (compact: 0.75, default: 1, spacious: 1.5)

## Rules
1. Output tag(s) FIRST, then your conversational response.
2. For design actions, ONLY change what the user asked for — do not change unrelated design properties.
3. Valid template IDs: minimal, modern, executive, compact, classic, sidebar, bold, creative, tech, academic, charter, prestige, engineer, contemporary, folio
4. Valid colors: navy (#1a1a2e), teal (#0d9488), slate (#475569), rose (#e11d48), amber (#d97706), emerald (#059669), indigo (#4f46e5), violet (#7c3aed), stone (#57534e)
5. Be conversational. Confirm what you changed.`;

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
    const fullResponse: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullResponse.push(token);
              onToken(token);
            }
          } catch { /* skip partial */ }
        }
      }
    } catch (err) {
      this.logger.error(`Chat stream error: ${(err as Error).message}`);
    }

    // Always generate fallback actions from the user message in case AI
    // produced malformed or missing action tags (common with small local models)
    const completeResponse = fullResponse.join('');
    const fallbackTags = this.generateFallbackActions(completeResponse, stepData, body.message);
    if (fallbackTags.length > 0) {
      this.logger.log(`[chat] Generated ${fallbackTags.length} fallback action tags: ${fallbackTags.join(', ').slice(0, 200)}`);
      for (const tag of fallbackTags) {
        onToken(tag);
      }
      // Also persist directly to DB so data survives even if client-side
      // action processing fails (e.g. malformed AI tags causing errors)
      await this.applyFallbackToDb(resumeId, userId, fallbackTags, stepData);
    } else {
      this.logger.warn(`[chat] No fallback tags generated. response="${completeResponse.slice(0, 100)}" stepData keys=${Object.keys(stepData).join(',')} msg="${(body.message || '').slice(0, 80)}"`);
    }
  }

  private async applyFallbackToDb(
    resumeId: string,
    userId: string,
    tags: string[],
    currentStepData: Record<string, unknown>,
  ): Promise<void> {
    const stepData = structuredClone(currentStepData) as Record<string, unknown>;

    for (const tag of tags) {
      const match = tag.match(/\[ACTION\](.*?)\[\/ACTION\]/);
      if (!match) continue;
      try {
        const action = JSON.parse(match[1]);
        switch (action.fn) {
          case 'set_basics': {
            const { name, headline, email, phone, location, linkedin, github, website } = action;
            stepData.basics = { ...((stepData.basics as Record<string, unknown>) || {}), name, headline, email, phone, location, linkedin, github, website };
            break;
          }
          case 'set_target_role':
            stepData.targetRole = { role: action.role, level: action.level, industry: action.industry, company: action.company, companyUrl: action.companyUrl, jobDescription: action.jobDescription };
            break;
          case 'set_summary':
            stepData.summary = { text: action.text, accepted: true };
            break;
          case 'add_experience': {
            const exp = (stepData.experience as Array<Record<string, unknown>>) || [];
            stepData.experience = [...exp, { company: action.company, title: action.title, startDate: action.startDate, endDate: action.endDate, current: action.current || false, bullets: action.bullets || [], rawNotes: action.rawNotes || '' }];
            break;
          }
          case 'remove_experience': {
            const exp = (stepData.experience as Array<Record<string, unknown>>) || [];
            if (typeof action.index === 'number') {
              stepData.experience = exp.filter((_, i) => i !== action.index);
            }
            break;
          }
          case 'update_experience_bullets': {
            const exp = (stepData.experience as Array<Record<string, unknown>>) || [];
            if (typeof action.index === 'number' && exp[action.index]) {
              exp[action.index] = { ...exp[action.index], bullets: action.bullets || [] };
              stepData.experience = exp;
            }
            break;
          }
          case 'set_skills':
            stepData.skills = action.skills || [];
            break;
          case 'add_skill': {
            const existing = (stepData.skills as string[]) || [];
            if (action.skill && !existing.includes(action.skill)) {
              stepData.skills = [...existing, action.skill];
            }
            break;
          }
          case 'remove_skill': {
            const existing = (stepData.skills as string[]) || [];
            stepData.skills = existing.filter((s: string) => s !== action.skill);
            break;
          }
          case 'add_education': {
            const edu = (stepData.education as Array<Record<string, unknown>>) || [];
            stepData.education = [...edu, { degree: action.degree, field: action.field, institution: action.institution, startYear: action.startYear, endYear: action.endYear, inProgress: action.inProgress || false, gpa: action.gpa || '' }];
            break;
          }
          case 'remove_education': {
            const edu = (stepData.education as Array<Record<string, unknown>>) || [];
            if (typeof action.index === 'number') {
              stepData.education = edu.filter((_, i) => i !== action.index);
            }
            break;
          }
          case 'set_optional':
            stepData.optional = { certifications: action.certifications || false, certificationsData: action.certificationsData || [], languages: action.languages || false, languagesData: action.languagesData || [], projects: action.projects || false, projectsData: action.projectsData || [], volunteer: action.volunteer || false, volunteerData: action.volunteerData || [], awards: action.awards || false, awardsData: action.awardsData || [] };
            break;
          case 'set_template':
            break;
          case 'set_design':
            stepData.design = { ...((stepData.design as Record<string, unknown>) || {}), ...action };
            break;
        }
      } catch {}
    }

    const updateFields: Record<string, unknown> = {};
    if (stepData.basics) updateFields['wizardState.stepData.basics'] = stepData.basics;
    if (stepData.targetRole) updateFields['wizardState.stepData.targetRole'] = stepData.targetRole;
    if (stepData.summary) updateFields['wizardState.stepData.summary'] = stepData.summary;
    if (stepData.experience) updateFields['wizardState.stepData.experience'] = stepData.experience;
    if (stepData.education) updateFields['wizardState.stepData.education'] = stepData.education;
    if (stepData.skills) updateFields['wizardState.stepData.skills'] = stepData.skills;
    if (stepData.optional) updateFields['wizardState.stepData.optional'] = stepData.optional;
    if (stepData.design) updateFields['wizardState.design'] = stepData.design;

    if (Object.keys(updateFields).length > 0) {
      try {
        await this.resumeModel.findOneAndUpdate(
          { _id: resumeId, userId },
          { $set: updateFields },
        );
        this.logger.log(`[chat] Fallback data persisted to DB for resume ${resumeId} (${Object.keys(updateFields).length} fields)`);
      } catch (err) {
        this.logger.error(`[chat] Failed to persist fallback: ${(err as Error).message}`);
      }
    }
  }

  private generateFallbackActions(
    response: string,
    stepData: Record<string, unknown>,
    userMessage?: string,
  ): string[] {
    const tags: string[] = [];
    const current = stepData;
    const lower = response.toLowerCase();
    const userLower = (userMessage || '').toLowerCase();

    // User message first (exact intent), then AI response (may rephrase)
    const sources = [userLower, lower];

    function extract(re: RegExp, text: string): string | null {
      const m = text.match(re);
      return m ? m[1].trim() : null;
    }

    function extractFromSources(re: RegExp): string | null {
      for (const src of sources) {
        const val = extract(re, src);
        if (val) return val;
      }
      return null;
    }

    // Try to build a full basics object from all sources
    const basics: Record<string, string> = { ...(current.basics as any || {}) };
    let basicsChanged = false;

    let nameVal = extractFromSources(/(?:name is|name to|called)\s+([A-Za-z\s\-']+?)(?:\.|,|and|with|$)/);
    if (nameVal) {
      nameVal = nameVal.replace(/^(now|please|set|also|the)\s+/i, '').trim();
    }
    if (nameVal && !basics.name) { basics.name = nameVal; basicsChanged = true; }

    const emailVal = extractFromSources(/email(?:\s+is|\s+to|\s*:|)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailVal && !basics.email) { basics.email = emailVal; basicsChanged = true; }

    const phoneVal = extractFromSources(/phone(?:\s+is|\s+to|\s*:|)\s+([\d\s\-\+\(\)]+?)(?:\.|,|and|$)/);
    if (phoneVal && !basics.phone) { basics.phone = phoneVal; basicsChanged = true; }

    const locVal = extractFromSources(/(?:location|based)(?:\s+is|\s+in|\s+to|\s*:|)\s+([A-Za-z\s,]+?)(?:\.|,|and|$)/);
    if (locVal && !basics.location) { basics.location = locVal; basicsChanged = true; }

    const titleVal = extractFromSources(/(?:title|headline|role)(?:\s+is|\s+to|\s*:|)\s+([A-Za-z\s\-]+?)(?:\.|,|and|with|at|$)/);
    if (titleVal && !basics.headline) { basics.headline = titleVal; basicsChanged = true; }

    if (basicsChanged) {
      tags.push(`[ACTION]${JSON.stringify({ fn: 'set_basics', ...basics })}[/ACTION]`);
    }

    // Check for summary text
    const summaryText = extractFromSources(/summary(?:\s*:|is)\s*(.+?)(?:experience|education|skills|\.\s*$)/s);
    if (summaryText && summaryText.length > 10) {
      tags.push(`[ACTION]${JSON.stringify({ fn: 'set_summary', text: summaryText })}[/ACTION]`);
    }

    // Check for skills from both sources
    // Patterns: "Add React, TypeScript to skills", "skills: React", "skills include React"
    for (const src of sources) {
      // Try "Add X, Y to skills" first
      const addSkillsMatch = src.match(/(?:add|added|adding)\s+(.+?)(?:\s+to\s+(?:my\s+)?skills?)/i);
      if (addSkillsMatch) {
        const extracted = addSkillsMatch[1].split(/,|;| and | & /).map(s => s.trim()).filter(s => s.length > 1);
        if (extracted.length > 0) {
          const existing = (current.skills as string[]) || [];
          const all = [...new Set([...existing, ...extracted])];
          tags.push(`[ACTION]${JSON.stringify({ fn: 'set_skills', skills: all })}[/ACTION]`);
          break;
        }
      }
      // Try "skills: React, TypeScript" pattern
      const skillsMatch = src.match(/(?:skills|technologies)(?:\s*:|(?: i added| i'?ve added| include| are)\s+)(.+?)(?:\.|experience|education|summary|$)/);
      if (skillsMatch) {
        const skillsText = skillsMatch[1];
        const extractedSkills = skillsText.split(/,|;| and | & /).map(s => s.trim().replace(/^my /, '')).filter(s => s.length > 1);
        if (extractedSkills.length > 0) {
          const known = ['to', 'the', 'your', 'with', 'for', 'you', 'a'];
          const filtered = extractedSkills.filter(s => !known.includes(s.toLowerCase()) && s.length > 1);
          if (filtered.length > 0) {
            const existing = (current.skills as string[]) || [];
            const all = [...new Set([...existing, ...filtered])];
            tags.push(`[ACTION]${JSON.stringify({ fn: 'set_skills', skills: all })}[/ACTION]`);
            break;
          }
        }
      }
    }

    // Check for template changes
    const validTemplates = ['minimal', 'modern', 'executive', 'compact', 'classic', 'sidebar', 'bold', 'creative', 'tech', 'academic', 'charter', 'prestige', 'engineer', 'contemporary', 'folio'];
    for (const src of sources) {
      const templateMatch = src.match(/(?:use|change|switch|apply|set)\s+(?:the\s+)?(?:to\s+)?(.+?)\s+template/i);
      if (templateMatch) {
        const templateId = templateMatch[1]?.trim().toLowerCase();
        if (templateId && validTemplates.includes(templateId)) {
          tags.push(`[ACTION]${JSON.stringify({ fn: 'set_template', templateId })}[/ACTION]`);
          break;
        }
      }
    }

    return tags;
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
        { returnDocument: 'after' },
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
