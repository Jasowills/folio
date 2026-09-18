import type { ResumeData } from '@folio/resume-schema';

/**
 * Deterministic resume renderer (no AI).
 * Milestone 1: HTML-string renderer stub with an ATS-safe default.
 * Milestone 2: port Folio Cloud's 40-template ConfigurableLayout system
 * (`client/src/features/resume-editor/templates/`) here, parameterized
 * on the shared ResumeData type, plus PDF (headless Chromium) and DOCX.
 */

export type RenderFormat = 'html' | 'pdf' | 'docx';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderHtml(data: ResumeData): string {
  const c = data.contact;
  const contactLine = [c.email, c.phone, c.location, c.linkedin, c.website, c.github]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
  const exp = data.experience
    .map(
      (e) => `<div class="entry"><h3>${esc(e.title)} — ${esc(e.company)}</h3>` +
        `<p class="dates">${esc(e.startDate)}–${e.current ? 'Present' : esc(e.endDate)}</p>` +
        `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>`,
    )
    .join('\n');
  const edu = data.education
    .map(
      (e) => `<div class="entry"><h3>${esc(e.degree)} — ${esc(e.institution)}</h3>` +
        `<p class="dates">${esc(e.startDate)}–${esc(e.endDate)}</p></div>`,
    )
    .join('\n');
  const skills = data.skills.map((s) => esc(s.name)).join(', ');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Helvetica,Arial,sans-serif;color:#111;max-width:8.5in;margin:0 auto}
h1{font-size:22px;margin:0}h2{font-size:13px;text-transform:uppercase;border-bottom:1px solid #999;margin:16px 0 6px}
.entry h3{font-size:13px;margin:8px 0 0}.dates{color:#555;font-size:11px;margin:2px 0}li{font-size:12px}
</style></head><body>
<h1>${esc(data.name)}</h1><p>${contactLine}</p>
${data.summary ? `<h2>Summary</h2><p>${esc(data.summary)}</p>` : ''}
${exp ? `<h2>Experience</h2>${exp}` : ''}${edu ? `<h2>Education</h2>${edu}` : ''}
${skills ? `<h2>Skills</h2><p>${skills}</p>` : ''}
</body></html>`;
}

export async function render(
  data: ResumeData,
  _templateId: string,
  format: RenderFormat,
): Promise<Buffer | string> {
  const html = renderHtml(data);
  if (format === 'html') return html;
  // PDF/DOCX land in Milestone 2 (headless Chromium + docx lib).
  throw new Error(
    `render(format=${format}) not implemented yet — Milestone 2 (html works now)`,
  );
}
