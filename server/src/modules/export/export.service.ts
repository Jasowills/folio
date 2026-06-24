import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { chromium } from 'playwright';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resume, ResumeDocument } from '../resumes/schemas/resume.schema';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
  ) {}

  async exportPdf(
    resumeId: string,
    userId: string,
    template?: string,
    primaryColor?: string,
  ): Promise<Buffer> {
    const resume = await this.resumeModel.findOne({ _id: resumeId, userId }).exec();
    if (!resume) throw new NotFoundException('Resume not found');

    this.logger.log(`exportPdf: generating PDF for resume ${resumeId}, template=${template || 'default'}, color=${primaryColor || 'default'}`);

    const html = this.buildHtml(resume, primaryColor || '#0F6E56');
    const pdf = await this.renderPdf(html);

    this.logger.log(`exportPdf: PDF generated (${pdf.length} bytes)`);
    return pdf;
  }

  private buildHtml(resume: ResumeDocument, color: string): string {
    const name = resume.name || 'Untitled Resume';
    const contact = (resume.contact || {}) as Record<string, string | null | undefined>;
    const experience = ((resume.experience || []) as unknown) as Array<Record<string, unknown>>;
    const education = ((resume.education || []) as unknown) as Array<Record<string, unknown>>;
    const skills = (resume.skills || []) as string[];
    const certifications = ((resume.certifications || []) as unknown) as Array<Record<string, unknown>>;
    const languages = (resume.languages || []) as string[];
    const summary = resume.summary || '';

    const contactParts = [
      contact.email,
      contact.phone,
      contact.location,
    ].filter(Boolean);

    const contactHtml = contactParts.length
      ? `<p class="contact">${contactParts.join(' &middot; ')}</p>`
      : '';

    const socialHtml = [contact.linkedin, contact.website, contact.github]
      .filter(Boolean)
      .map((url) => `<span>${url}</span>`)
      .join('');

    const experienceHtml = experience
      .map((exp) => `
        <div class="entry">
          <div class="entry-header">
            <strong>${exp.title || ''}</strong>
            <span class="entry-date">${exp.startDate || ''}${exp.current ? ' - Present' : exp.endDate ? ' - ' + exp.endDate : ''}</span>
          </div>
          <p class="entry-sub">${exp.company || ''}</p>
          <ul>${(exp.bullets as string[])?.map((b: string) => `<li>${b}</li>`).join('') || ''}</ul>
        </div>
      `).join('');

    const educationHtml = education
      .map((edu) => `
        <div class="entry">
          <div class="entry-header">
            <strong>${edu.institution || ''}</strong>
            <span class="entry-date">${edu.startDate || ''}${edu.endDate ? ' - ' + edu.endDate : ''}</span>
          </div>
          <p class="entry-sub">${edu.degree || ''}${edu.field ? ' in ' + edu.field : ''}${edu.gpa ? ' &middot; GPA: ' + edu.gpa : ''}</p>
        </div>
      `).join('');

    const skillsHtml = skills.length
      ? `<div class="section"><h2>Skills</h2><p class="skills">${skills.join(' &middot; ')}</p></div>`
      : '';

    const certHtml = certifications.length
      ? `<div class="section"><h2>Certifications</h2>${certifications.map((c) => `
        <div class="entry">
          <p><strong>${c.name || ''}</strong>${c.issuer ? ' - ' + c.issuer : ''}</p>
        </div>
      `).join('')}</div>`
      : '';

    const langHtml = languages.length
      ? `<div class="section"><h2>Languages</h2><p class="skills">${languages.join(' &middot; ')}</p></div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 0.75in; size: letter; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1A1A2E;
      padding: 0;
    }
    h1 {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 2px;
    }
    h2 {
      font-size: 11pt;
      font-weight: 600;
      color: ${color};
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1.5px solid ${color};
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .contact { font-size: 9pt; color: #555; margin-bottom: 4px; }
    .social { font-size: 8pt; color: #777; margin-bottom: 12px; display: flex; gap: 12px; flex-wrap: wrap; }
    .section { margin-bottom: 14px; }
    .entry { margin-bottom: 10px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
    .entry-header strong { font-size: 10.5pt; }
    .entry-date { font-size: 9pt; color: #555; white-space: nowrap; }
    .entry-sub { font-size: 9.5pt; color: #444; margin-top: 1px; }
    ul { margin: 3px 0 0 16px; }
    li { margin-bottom: 2px; font-size: 9.5pt; }
    .skills { font-size: 9.5pt; line-height: 1.8; }
    .summary { font-size: 9.5pt; margin-bottom: 14px; line-height: 1.6; }
    hr { border: none; border-top: 0.5px solid #ddd; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>${this.esc(name)}</h1>
  ${contactHtml}
  ${socialHtml ? `<div class="social">${socialHtml}</div>` : ''}
  ${summary ? `<div class="section"><p class="summary">${this.esc(summary)}</p></div>` : ''}
  ${experienceHtml ? `<div class="section"><h2>Experience</h2>${experienceHtml}</div>` : ''}
  ${educationHtml ? `<div class="section"><h2>Education</h2>${educationHtml}</div>` : ''}
  ${skillsHtml}
  ${certHtml}
  ${langHtml}
</body>
</html>`;
  }

  private async renderPdf(html: string): Promise<Buffer> {
    let browser;
    try {
      browser = await chromium.launch({
        channel: 'chromium',
        headless: true,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({
        format: 'Letter',
        margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
        printBackground: true,
      });
      return Buffer.from(pdf);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async guestReport(data: {
    score: number;
    title: string;
    issues: string[];
    redFlags?: Array<{ message: string; severity: string; section: string }>;
    sectionScores?: Record<string, number>;
    detectedRole?: { role: string; seniority: string; industries: string[]; confidence: number };
    quality?: { overallQuality: number; layoutScore: number; linksScore: number; professionalismScore: number; readabilityScore: number; strengths: string[]; issues: string[]; suggestions: string[] };
    name?: string | null;
    contact?: Record<string, string | null | undefined>;
    summary?: string | null;
    experience?: Array<{ company: string; title: string; startDate?: string | null; endDate?: string | null; current?: boolean; bullets: string[] }>;
    education?: Array<{ institution: string; degree: string; field?: string | null; startDate?: string | null; endDate?: string | null; gpa?: string | null }>;
    skills?: string[];
    certifications?: Array<{ name: string; issuer?: string | null; date?: string | null }>;
    languages?: string[];
  }): Promise<Buffer> {
    if (!data || typeof data.score !== 'number') {
      throw new BadRequestException('Invalid analysis data');
    }

    const getSeverityColor = (severity: string) =>
      severity === 'high' ? '#C84242' : severity === 'medium' ? '#BA7517' : '#0F6E56';

    const score = Math.round(data.score);
    const getInterpretation = (s: number) => {
      if (s >= 85) return 'Excellent. Your resume is highly competitive.';
      if (s >= 70) return 'Good foundation. Key gaps holding you back.';
      if (s >= 50) return 'Room for improvement. Major sections need work.';
      return 'Needs significant improvement. Start with the red flags.';
    };

    const redFlagsHtml = (data.redFlags || [])
      .map((f) => `
        <div class="flag">
          <span class="flag-badge" style="background:${getSeverityColor(f.severity)}">${this.esc(f.severity.toUpperCase())}</span>
          <span class="flag-section">${this.esc(f.section)}</span>
          <span class="flag-message">${this.esc(f.message)}</span>
        </div>
      `).join('');

    const qualityMetrics = data.quality
      ? [
          { label: 'Overall', value: data.quality.overallQuality },
          { label: 'Layout', value: data.quality.layoutScore },
          { label: 'Links', value: data.quality.linksScore },
          { label: 'Professionalism', value: data.quality.professionalismScore },
          { label: 'Readability', value: data.quality.readabilityScore },
        ].map((m) => `
          <div class="metric">
            <span class="metric-value" style="color:${m.value >= 70 ? '#0F6E56' : m.value >= 45 ? '#BA7517' : '#C84242'}">${Math.round(m.value)}</span>
            <span class="metric-label">${m.label}</span>
          </div>
        `).join('')
      : '';

    const strengthsHtml = data.quality?.strengths?.length
      ? `<div class="section"><h2>Strengths</h2><ul>${data.quality.strengths.map((s) => `<li>${this.esc(s)}</li>`).join('')}</ul></div>`
      : '';

    const suggestionsHtml = data.quality?.suggestions?.length
      ? `<div class="section"><h2>Suggestions</h2><ul>${data.quality.suggestions.slice(0, 5).map((s) => `<li>+ ${this.esc(s)}</li>`).join('')}</ul></div>`
      : '';

    const issuesHtml = data.issues.length
      ? `<div class="section"><h2>${data.issues.length} Issue${data.issues.length !== 1 ? 's' : ''} Found</h2><ul>${data.issues.map((issue) => {
          const isSerious = issue.toLowerCase().includes('missing') || issue.toLowerCase().includes('no');
          return `<li class="issue ${isSerious ? 'serious' : ''}">${this.esc(issue.split('—')[0]?.trim() || issue)}${issue.includes('—') ? '<br><span class="issue-detail">' + this.esc(issue.split('—')[1]?.trim() || '') + '</span>' : ''}</li>`;
        }).join('')}</ul></div>`
      : '';

    const roleHtml = data.detectedRole
      ? `<div class="role-badge">${this.esc(data.detectedRole.role)} &middot; ${this.esc(data.detectedRole.seniority)} &middot; ${data.detectedRole.confidence}% confidence</div>`
      : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 0.6in; size: letter; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.5;
      color: #1A1A2E;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
      border-bottom: 2px solid #0F6E56;
      padding-bottom: 10px;
    }
    .brand { font-size: 22pt; font-weight: 700; color: #0F6E56; letter-spacing: -0.5px; }
    .brand-span { font-size: 22pt; font-weight: 700; color: #1A1A2E; }
    .subtitle { font-size: 8pt; color: #777; margin-top: 2px; }
    .role-badge {
      font-size: 8.5pt;
      color: #0F6E56;
      background: #f0faf6;
      padding: 4px 10px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 14px;
    }
    .score-section {
      background: #1A1A2E;
      color: #fff;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .score-ring { position: relative; width: 70px; height: 70px; }
    .score-ring svg { width: 70px; height: 70px; }
    .score-number {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 22pt; font-weight: 700; color: #fff;
    }
    .score-text { flex: 1; }
    .score-text h3 { font-size: 13pt; font-weight: 600; line-height: 1.3; }
    .score-text p { font-size: 8.5pt; color: #aaa; margin-top: 2px; }
    .section { margin-bottom: 14px; }
    h2 {
      font-size: 10pt;
      font-weight: 600;
      color: #0F6E56;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #d0e6df;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .entry { margin-bottom: 8px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
    .entry-header strong { font-size: 10pt; }
    .entry-date { font-size: 8pt; color: #666; white-space: nowrap; }
    .entry-sub { font-size: 9pt; color: #444; margin-top: 1px; }
    ul { margin: 3px 0 0 14px; }
    li { margin-bottom: 2px; font-size: 9pt; }
    .skills { font-size: 9pt; line-height: 1.8; }
    .flag {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; margin-bottom: 4px;
      background: #fafafa; border-radius: 4px;
      font-size: 8.5pt;
    }
    .flag-badge {
      font-size: 6.5pt; font-weight: 700; color: #fff;
      padding: 1px 6px; border-radius: 3px;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .flag-section { font-weight: 600; color: #1A1A2E; min-width: 80px; text-transform: capitalize; }
    .flag-message { color: #555; }
    .issue { margin-bottom: 4px; }
    .issue.serious { font-weight: 600; }
    .issue-detail { font-weight: 400; font-size: 8pt; color: #666; }
    .metrics {
      display: flex; gap: 14px; flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .metric { text-align: center; min-width: 60px; }
    .metric-value { font-size: 18pt; font-weight: 700; display: block; line-height: 1.2; }
    .metric-label { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #888; }
    .summary-text { font-size: 9pt; line-height: 1.6; color: #333; }
    .footer { margin-top: 20px; text-align: center; font-size: 7pt; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <span class="brand">&amp;</span><span class="brand-span">Folio</span>
    <div style="flex:1"></div>
    <span class="subtitle">Resume Analysis Report</span>
  </div>

  <h1 style="font-size:16pt;font-weight:700;margin-bottom:2px;">${this.esc(data.name || data.title || 'Resume Analysis')}</h1>
  ${roleHtml}

  <div class="score-section">
    <div class="score-ring">
      <svg viewBox="0 0 36 36">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2a3a36" stroke-width="3"/>
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0F6E56" stroke-width="3" stroke-dasharray="${score}, 100" stroke-linecap="round"/>
      </svg>
      <span class="score-number">${score}</span>
    </div>
    <div class="score-text">
      <h3>${this.esc(getInterpretation(score))}</h3>
      <p>Overall resume score: ${score}/100</p>
    </div>
  </div>

  ${redFlagsHtml ? `<div class="section"><h2>Red Flags (${(data.redFlags || []).length})</h2>${redFlagsHtml}</div>` : ''}

  ${issuesHtml}

  ${data.quality ? `<div class="section"><h2>Quality Metrics</h2><div class="metrics">${qualityMetrics}</div></div>` : ''}

  ${strengthsHtml}
  ${suggestionsHtml}

  <div class="footer">
    Generated by &amp;Folio &middot; Resume analysis powered by AI &middot; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</body>
</html>`;

    return this.renderPdf(html);
  }
}
