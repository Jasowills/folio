import type { ResumeTemplate, ResumeColorTheme } from './types'

// ---- SVG preview generators ----

function rect(x: number, y: number, w: number, h: number, fill: string, r = 0): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, w = 0.5): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`
}

function dot(cx: number, cy: number, r: number, fill: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
}

function text(x: number, y: number, content: string, size: number, color: string, bold = false): string {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-family="sans-serif" font-weight="${bold ? 'bold' : 'normal'}">${content}</text>`
}

function contentLines(x: number, y: number, count: number, w: number, h: number, gap: number, color: string): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    out += rect(x, y + i * (h + gap), w, h, color, 0.5)
  }
  return out
}

function headerBlock(h: number, color: string, w = 150): string {
  return rect(0, 0, w, h, color)
}

function sectionTitle(x: number, y: number, w: number, color: string): string {
  return rect(x, y, w, 1.5, color, 0.5)
}

// Single column generators
function singleColPreview(i: number): string {
  const accent = 'currentColor'
  const dark = '#1A1A2E'
  const light = '#E0DDD7'
  const muted = '#8E8E9A'
  const bg = '#FFFFFF'

  const styles = [
    // 0: clean minimal
    () => `${rect(15, 15, 40, 3, dark, 1)}
${rect(15, 22, 80, 1.5, muted, 0.5)}
${rect(15, 32, 120, 0.5, light)}
${sectionTitle(15, 40, 50, dark)}
${contentLines(15, 47, 3, 100, 1, 4, light)}
${sectionTitle(15, 68, 50, dark)}
${contentLines(15, 75, 2, 95, 1, 4, light)}
${sectionTitle(15, 96, 50, dark)}
${contentLines(15, 103, 2, 60, 1, 4, light)}`,
    // 1: left accent bar
    () => `${rect(0, 10, 3, 20, accent, 1)}
${rect(12, 12, 100, 3, dark, 1)}
${rect(12, 19, 70, 1.5, muted, 0.5)}
${rect(0, 42, 3, 20, accent, 1)}
${sectionTitle(12, 44, 40, dark)}
${contentLines(12, 51, 3, 110, 1.5, 3, light)}
${rect(0, 76, 3, 20, accent, 1)}
${sectionTitle(12, 78, 40, dark)}
${contentLines(12, 85, 2, 100, 1.5, 3, light)}`,
    // 2: dark header
    () => `${headerBlock(30, dark)}
${rect(20, 8, 50, 2, '#FFFFFF', 1)}
${rect(25, 14, 60, 1, 'rgba(255,255,255,0.5)')}
${sectionTitle(15, 42, 50, dark)}
${contentLines(15, 49, 3, 110, 1, 4, light)}
${sectionTitle(15, 70, 50, dark)}
${contentLines(15, 77, 3, 105, 1, 4, light)}
${sectionTitle(15, 98, 50, dark)}
${contentLines(15, 105, 2, 80, 1, 4, light)}`,
    // 3: thin header line
    () => `${line(15, 15, 135, 15, dark, 1.5)}
${rect(15, 20, 80, 2, dark, 1)}
${rect(15, 26, 50, 1, muted, 0.5)}
${line(15, 35, 135, 35, light)}
${sectionTitle(15, 43, 40, accent)}
${contentLines(15, 50, 3, 110, 1, 4, light)}
${sectionTitle(15, 71, 40, accent)}
${contentLines(15, 78, 2, 100, 1, 4, light)}
${sectionTitle(15, 99, 40, accent)}
${contentLines(15, 106, 2, 70, 1, 4, light)}`,
    // 4: spaced elegant
    () => `${rect(20, 15, 110, 2, dark, 1)}
${rect(20, 21, 60, 1, muted, 0.5)}
${rect(20, 38, 35, 1.5, accent, 0.5)}
${contentLines(20, 45, 3, 90, 1, 5, light)}
${rect(20, 68, 35, 1.5, accent, 0.5)}
${contentLines(20, 75, 2, 85, 1, 5, light)}
${rect(20, 98, 35, 1.5, accent, 0.5)}
${contentLines(20, 105, 2, 60, 1, 5, light)}`,
    // 5: compact dense
    () => `${rect(10, 10, 130, 2.5, dark, 1)}
${rect(10, 16, 90, 1, muted, 0.5)}
${rect(10, 24, 130, 0.5, light)}
${sectionTitle(10, 30, 35, accent)}
${contentLines(10, 35, 4, 120, 0.8, 2.5, light)}
${sectionTitle(10, 52, 35, accent)}
${contentLines(10, 57, 4, 115, 0.8, 2.5, light)}
${sectionTitle(10, 74, 35, accent)}
${contentLines(10, 79, 3, 100, 0.8, 2.5, light)}`,
    // 6: bold accents
    () => `${rect(0, 0, 150, 4, accent)}
${rect(15, 15, 100, 3, dark, 1)}
${rect(15, 22, 70, 1.5, muted, 0.5)}
${rect(0, 35, 150, 1, light)}
${sectionTitle(15, 43, 45, dark)}
${contentLines(15, 50, 3, 105, 1.5, 4, light)}
${sectionTitle(15, 73, 45, dark)}
${contentLines(15, 80, 2, 95, 1.5, 4, light)}
${sectionTitle(15, 103, 45, dark)}
${contentLines(15, 110, 1, 80, 1.5, 4, light)}`,
    // 7: centered header
    () => `${rect(30, 12, 90, 3, dark, 1)}
${rect(35, 19, 60, 1, muted, 0.5)}
${line(30, 30, 120, 30, light, 0.5)}
${sectionTitle(15, 38, 40, dark)}
${contentLines(15, 45, 3, 110, 1, 4, light)}
${sectionTitle(15, 66, 40, dark)}
${contentLines(15, 73, 2, 100, 1, 4, light)}
${sectionTitle(15, 94, 40, dark)}
${contentLines(15, 101, 2, 70, 1, 4, light)}`,
    // 8: journal
    () => `${rect(15, 10, 3, 25, accent, 1)}
${rect(22, 12, 90, 2.5, dark, 1)}
${rect(22, 18, 60, 1.5, muted, 0.5)}
${rect(15, 48, 3, 20, accent, 1)}
${sectionTitle(22, 50, 45, dark)}
${contentLines(22, 57, 3, 100, 1, 4, light)}
${rect(15, 88, 3, 20, accent, 1)}
${sectionTitle(22, 90, 45, dark)}
${contentLines(22, 97, 2, 90, 1, 4, light)}`,
    // 9: serif classic
    () => `${rect(15, 12, 120, 4, dark, 1)}
${rect(30, 20, 80, 1.5, muted, 0.5)}
${line(15, 30, 135, 30, dark, 0.5)}
${rect(15, 38, 60, 2, dark, 0.5)}
${contentLines(15, 46, 3, 110, 1.5, 4, light)}
${rect(15, 68, 60, 2, dark, 0.5)}
${contentLines(15, 76, 3, 105, 1.5, 4, light)}
${rect(15, 98, 60, 2, dark, 0.5)}
${contentLines(15, 106, 2, 80, 1.5, 4, light)}`,
  ]

  const fn = styles[i % styles.length]
  return `<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`
}

function twoColPreview(i: number): string {
  const accent = 'currentColor'
  const dark = '#1A1A2E'
  const light = '#E0DDD7'
  const muted = '#8E8E9A'
  const sideBg = '#F5F2ED'

  const styles = [
    // 0: left sidebar
    () => `${rect(0, 0, 50, 200, sideBg)}
${rect(10, 12, 30, 2, accent, 1)}
${contentLines(10, 18, 3, 25, 0.8, 3, muted)}
${rect(10, 38, 30, 2, accent, 1)}
${contentLines(10, 44, 4, 28, 0.8, 2, muted)}
${rect(58, 12, 80, 3, dark, 1)}
${rect(58, 19, 55, 1.5, muted, 0.5)}
${sectionTitle(58, 32, 40, accent)}
${contentLines(58, 39, 3, 75, 1.5, 4, light)}
${sectionTitle(58, 62, 40, accent)}
${contentLines(58, 69, 2, 70, 1.5, 4, light)}`,
    // 1: even split
    () => `${rect(0, 0, 72, 200, '#FAFAFA')}
${rect(10, 12, 50, 2, dark, 1)}
${contentLines(10, 18, 2, 45, 1, 4, light)}
${sectionTitle(10, 35, 35, accent)}
${contentLines(10, 42, 4, 50, 1, 3, light)}
${rect(78, 12, 65, 2, dark, 1)}
${rect(78, 18, 45, 1, muted, 0.5)}
${sectionTitle(78, 32, 40, accent)}
${contentLines(78, 39, 3, 55, 1.5, 4, light)}
${sectionTitle(78, 62, 40, accent)}
${contentLines(78, 69, 2, 50, 1.5, 4, light)}`,
    // 2: accent sidebar
    () => `${rect(0, 0, 48, 200, accent)}
${rect(8, 10, 32, 2, '#FFFFFF', 1)}
${contentLines(8, 16, 3, 28, 0.8, 3, 'rgba(255,255,255,0.4)')}
${rect(8, 36, 32, 2, '#FFFFFF', 1)}
${contentLines(8, 42, 3, 30, 0.8, 2.5, 'rgba(255,255,255,0.4)')}
${rect(54, 12, 85, 3, dark, 1)}
${rect(54, 19, 60, 1.5, muted, 0.5)}
${sectionTitle(54, 32, 40, accent)}
${contentLines(54, 39, 3, 80, 1.5, 4, light)}
${sectionTitle(54, 62, 40, accent)}
${contentLines(54, 69, 2, 70, 1.5, 4, light)}`,
    // 3: right sidebar
    () => `${rect(100, 0, 50, 200, sideBg)}
${rect(108, 12, 35, 2, accent, 1)}
${contentLines(108, 18, 3, 30, 0.8, 3, muted)}
${rect(108, 38, 35, 2, accent, 1)}
${contentLines(108, 44, 4, 32, 0.8, 2, muted)}
${rect(15, 12, 75, 3, dark, 1)}
${rect(15, 19, 55, 1.5, muted, 0.5)}
${sectionTitle(15, 32, 40, accent)}
${contentLines(15, 39, 3, 70, 1.5, 4, light)}
${sectionTitle(15, 62, 40, accent)}
${contentLines(15, 69, 2, 65, 1.5, 4, light)}`,
    // 4: narrow sidebar
    () => `${rect(0, 0, 38, 200, '#1A1A2E')}
${rect(8, 10, 22, 1.5, '#FFFFFF', 1)}
${contentLines(8, 15, 2, 20, 0.7, 3, 'rgba(255,255,255,0.3)')}
${rect(8, 28, 22, 1.5, '#FFFFFF', 1)}
${contentLines(8, 33, 3, 20, 0.7, 2.5, 'rgba(255,255,255,0.3)')}
${rect(44, 12, 95, 3, dark, 1)}
${rect(44, 19, 65, 1.5, muted, 0.5)}
${sectionTitle(44, 32, 40, accent)}
${contentLines(44, 39, 3, 85, 1.5, 4, light)}
${sectionTitle(44, 62, 40, accent)}
${contentLines(44, 69, 2, 75, 1.5, 4, light)}`,
    // 5: thirds
    () => `${rect(0, 0, 50, 200, sideBg)}
${rect(58, 12, 80, 3, dark, 1)}
${rect(58, 19, 55, 1.5, muted, 0.5)}
${rect(8, 12, 34, 1.5, accent, 0.5)}
${contentLines(8, 18, 2, 32, 1, 4, muted)}
${sectionTitle(58, 34, 40, accent)}
${contentLines(58, 41, 3, 75, 1.5, 4, light)}
${sectionTitle(58, 64, 40, accent)}
${contentLines(58, 71, 2, 70, 1.5, 4, light)}
${rect(8, 34, 34, 1.5, accent, 0.5)}
${contentLines(8, 40, 3, 30, 1, 3, muted)}`,
  ]

  const fn = styles[i % styles.length]
  return `<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`
}

function sidebarPreview(i: number): string {
  const accent = 'currentColor'
  const dark = '#1A1A2E'
  const light = '#E0DDD7'
  const muted = '#8E8E9A'
  const sideBg = '#F5F2ED'

  const styles = [
    // 0: classic sidebar
    () => `${rect(0, 0, 45, 200, sideBg)}
${rect(8, 12, 28, 2, accent, 1)}
${contentLines(8, 18, 4, 25, 0.8, 3, muted)}
${rect(8, 40, 28, 2, accent, 1)}
${contentLines(8, 46, 3, 28, 0.8, 2.5, muted)}
${rect(52, 12, 85, 3, dark, 1)}
${rect(52, 19, 60, 1.5, muted, 0.5)}
${sectionTitle(52, 32, 40, accent)}
${contentLines(52, 39, 3, 75, 1.5, 4, light)}
${sectionTitle(52, 62, 40, accent)}
${contentLines(52, 69, 2, 70, 1.5, 4, light)}`,
    // 1: minimal sidebar
    () => `${rect(0, 0, 42, 200, '#FFFFFF')}
${line(42, 10, 42, 190, light)}
${rect(10, 12, 22, 1.5, accent, 0.5)}
${contentLines(10, 17, 3, 20, 0.7, 3, muted)}
${rect(10, 34, 22, 1.5, accent, 0.5)}
${contentLines(10, 39, 4, 22, 0.7, 2.5, muted)}
${rect(50, 12, 88, 2.5, dark, 1)}
${rect(50, 18, 60, 1.5, muted, 0.5)}
${sectionTitle(50, 30, 40, accent)}
${contentLines(50, 37, 3, 78, 1.5, 4, light)}
${sectionTitle(50, 60, 40, accent)}
${contentLines(50, 67, 2, 72, 1.5, 4, light)}`,
    // 2: dark sidebar
    () => `${rect(0, 0, 48, 200, dark)}
${rect(10, 12, 28, 1.5, '#FFFFFF', 0.5)}
${contentLines(10, 17, 3, 25, 0.7, 3, 'rgba(255,255,255,0.3)')}
${rect(10, 36, 28, 1.5, '#FFFFFF', 0.5)}
${contentLines(10, 41, 4, 25, 0.7, 2.5, 'rgba(255,255,255,0.3)')}
${rect(54, 12, 85, 3, dark, 1)}
${rect(54, 19, 60, 1.5, muted, 0.5)}
${sectionTitle(54, 32, 40, accent)}
${contentLines(54, 39, 3, 75, 1.5, 4, light)}
${sectionTitle(54, 62, 40, accent)}
${contentLines(54, 69, 2, 70, 1.5, 4, light)}`,
    // 3: accent sidebar top
    () => `${rect(0, 0, 150, 8, accent)}
${rect(0, 8, 150, 3, dark)}
${rect(8, 16, 30, 1.5, '#FFFFFF', 0.5)}
${rect(8, 21, 22, 0.8, 'rgba(255,255,255,0.4)')}
${rect(48, 16, 90, 2, '#FFFFFF', 1)}
${rect(48, 22, 60, 1, 'rgba(255,255,255,0.4)')}
${rect(8, 38, 32, 1.5, accent, 0.5)}
${contentLines(8, 44, 4, 28, 0.8, 3, muted)}
${rect(48, 38, 90, 1, light)}
${sectionTitle(48, 46, 40, accent)}
${contentLines(48, 53, 3, 78, 1.5, 4, light)}
${sectionTitle(48, 76, 40, accent)}
${contentLines(48, 83, 2, 70, 1.5, 4, light)}`,
    // 4: colored side panel
    () => `${rect(0, 0, 45, 200, accent)}
${rect(8, 10, 28, 2, '#FFFFFF', 1)}
${contentLines(8, 16, 5, 25, 0.7, 3, 'rgba(255,255,255,0.35)')}
${rect(52, 12, 85, 3, dark, 1)}
${rect(52, 19, 60, 1.5, muted, 0.5)}
${sectionTitle(52, 34, 40, accent)}
${contentLines(52, 41, 3, 75, 1.5, 4, light)}
${sectionTitle(52, 64, 40, accent)}
${contentLines(52, 71, 2, 68, 1.5, 4, light)}`,
  ]

  const fn = styles[i % styles.length]
  return `<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`
}

function pickPreview(layout: 'single-column' | 'two-column' | 'sidebar', idx: number): string {
  if (layout === 'two-column') return twoColPreview(idx)
  if (layout === 'sidebar') return sidebarPreview(idx)
  return singleColPreview(idx)
}

// ---- Templates ----

const TEMPLATE_DEFS: Array<Omit<ResumeTemplate, 'preview'> & { _idx: number }> = [
  { id: 'minimal', name: 'Minimal', description: 'Clean single column. Best for ATS parsing and traditional roles.', layout: 'single-column', _idx: 0 },
  { id: 'modern', name: 'Modern', description: 'Two-column with teal sidebar. Great for tech and creative roles.', layout: 'two-column', _idx: 0 },
  { id: 'executive', name: 'Executive', description: 'Bold name block with serif headings. For senior roles.', layout: 'single-column', _idx: 1 },
  { id: 'compact', name: 'Compact', description: 'Dense single-column. Fits more content per page.', layout: 'single-column', _idx: 5 },
  { id: 'sidepanel', name: 'Side Panel', description: 'Left sidebar with contact and skills. Clean main area.', layout: 'sidebar', _idx: 0 },
  { id: 'split', name: 'Split', description: 'Even two-column split. Balanced visual presentation.', layout: 'two-column', _idx: 1 },
  { id: 'accent', name: 'Accent', description: 'Bold color accents on headers. Modern and eye-catching.', layout: 'single-column', _idx: 6 },
  { id: 'timeline', name: 'Timeline', description: 'Experience shown as a visual timeline.', layout: 'single-column', _idx: 8 },
  { id: 'minimalist', name: 'Minimalist', description: 'Extra whitespace. Elegant layout for design roles.', layout: 'single-column', _idx: 4 },
  { id: 'classic', name: 'Classic', description: 'Traditional resume format. Universally accepted.', layout: 'single-column', _idx: 9 },
  { id: 'clean', name: 'Clean', description: 'Serif body text with generous spacing for readability.', layout: 'single-column', _idx: 7 },
  { id: 'sharp', name: 'Sharp', description: 'Bold black headers with thin separator rules.', layout: 'single-column', _idx: 2 },
  { id: 'airy', name: 'Airy', description: 'Maximum whitespace and minimal visual rules.', layout: 'single-column', _idx: 4 },
  { id: 'formal', name: 'Formal', description: 'Traditional serif layout for conservative industries.', layout: 'single-column', _idx: 3 },
  { id: 'modern-clean', name: 'Modern Clean', description: 'Sans-serif with clean layout lines.', layout: 'single-column', _idx: 0 },
  { id: 'slate', name: 'Slate', description: 'Dark header block for bold first impression.', layout: 'single-column', _idx: 2 },
  { id: 'editorial', name: 'Editorial', description: 'Magazine-inspired layout for creative fields.', layout: 'single-column', _idx: 1 },
  { id: 'mono', name: 'Mono', description: 'Monospace font throughout for engineering roles.', layout: 'single-column', _idx: 7 },
  { id: 'columns', name: 'Columns', description: 'Equal two-column with thin divider line.', layout: 'two-column', _idx: 1 },
  { id: 'sidebar-right', name: 'Sidebar Right', description: 'Right sidebar variant for contact and skills.', layout: 'two-column', _idx: 3 },
  { id: 'profile', name: 'Profile', description: 'Photo-friendly sidebar for consulting roles.', layout: 'sidebar', _idx: 1 },
  { id: 'metrics', name: 'Metrics', description: 'Data-focused layout with KPI highlight sections.', layout: 'two-column', _idx: 5 },
  { id: 'technical', name: 'Technical', description: 'Code-friendly monospace sidebar for engineers.', layout: 'two-column', _idx: 4 },
  { id: 'creative', name: 'Creative', description: 'Asymmetric colorful layout for design roles.', layout: 'two-column', _idx: 2 },
  { id: 'dashboard', name: 'Dashboard', description: 'Left sidebar with colored icon indicators.', layout: 'sidebar', _idx: 4 },
  { id: 'expertise', name: 'Expertise', description: 'Skills-focused two-column for specialists.', layout: 'two-column', _idx: 0 },
  { id: 'left-brand', name: 'Left Brand', description: 'Branded left panel with accent color header.', layout: 'sidebar', _idx: 2 },
  { id: 'contact-left', name: 'Contact Left', description: 'Contact information prominent in sidebar.', layout: 'sidebar', _idx: 0 },
  { id: 'skills-left', name: 'Skills Left', description: 'Skills-focused sidebar for technical roles.', layout: 'sidebar', _idx: 1 },
  { id: 'compact-sidebar', name: 'Compact Sidebar', description: 'Dense sidebar layout for one-page resumes.', layout: 'sidebar', _idx: 3 },
  { id: 'modern-sidebar', name: 'Modern Sidebar', description: 'Modern sidebar with icon-friendly layout.', layout: 'sidebar', _idx: 4 },
  { id: 'executive-sidebar', name: 'Executive Sidebar', description: 'Executive sidebar with distinguished header.', layout: 'sidebar', _idx: 2 },
  { id: 'ats-optimized', name: 'ATS Optimized', description: 'No columns. Maximum ATS parsing compatibility.', layout: 'single-column', _idx: 5 },
  { id: 'career-change', name: 'Career Change', description: 'Functional skills-focused layout for pivots.', layout: 'single-column', _idx: 8 },
  { id: 'entry-level', name: 'Entry Level', description: 'Education-first layout for new graduates.', layout: 'single-column', _idx: 3 },
  { id: 'academic', name: 'Academic', description: 'Research and publications emphasis layout.', layout: 'single-column', _idx: 9 },
  { id: 'federal', name: 'Federal', description: 'Government resume format with required sections.', layout: 'single-column', _idx: 2 },
  { id: 'consulting', name: 'Consulting', description: 'Metrics-driven with project impact highlights.', layout: 'two-column', _idx: 5 },
  { id: 'executive-brief', name: 'Executive Brief', description: 'One-page executive summary format.', layout: 'single-column', _idx: 1 },
  { id: 'board', name: 'Board', description: 'Board of directors and advisory roles format.', layout: 'single-column', _idx: 6 },
  { id: 'intern', name: 'Intern', description: 'Internship-focused with education emphasis.', layout: 'single-column', _idx: 7 },
  { id: 'saas', name: 'SaaS', description: 'SaaS role focused with product metrics.', layout: 'two-column', _idx: 4 },
  { id: 'remote', name: 'Remote', description: 'Remote work focused with distributed skills.', layout: 'sidebar', _idx: 1 },
  { id: 'startup', name: 'Startup', description: 'Startup culture focused, concise and bold.', layout: 'single-column', _idx: 0 },
  { id: 'freelance', name: 'Freelance', description: 'Freelancer portfolio style with project list.', layout: 'sidebar', _idx: 3 },
  { id: 'bilingual', name: 'Bilingual', description: 'Side-by-side language layout for dual roles.', layout: 'two-column', _idx: 1 },
  { id: 'gradient-sidebar', name: 'Gradient Sidebar', description: 'Gradient sidebar background for modern look.', layout: 'sidebar', _idx: 4 },
  { id: 'dark-sidebar', name: 'Dark Sidebar', description: 'Dark sidebar with light text for contrast.', layout: 'sidebar', _idx: 2 },
  { id: 'minimal-sidebar', name: 'Minimal Sidebar', description: 'Clean sidebar layout with thin divider.', layout: 'sidebar', _idx: 1 },
  { id: 'marginalia', name: 'Marginalia', description: 'Notes in the margin style for creative roles.', layout: 'sidebar', _idx: 3 },
  { id: 'portfolio', name: 'Portfolio', description: 'Visual portfolio layout with project grid.', layout: 'two-column', _idx: 2 },
  { id: 'leadership', name: 'Leadership', description: 'Leadership-focused with team impact metrics.', layout: 'single-column', _idx: 6 },
]

export const TEMPLATES: ResumeTemplate[] = TEMPLATE_DEFS.map((def) => ({
  id: def.id,
  name: def.name,
  description: def.description,
  layout: def.layout,
  preview: pickPreview(def.layout, def._idx),
}))

export const TEMPLATE_PREVIEWS: Record<string, string> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t.preview]),
)

export const COLOR_THEMES: ResumeColorTheme[] = [
  { id: 'teal', name: 'Teal', primary: '#0F6E56' },
  { id: 'navy', name: 'Navy', primary: '#1A365D' },
  { id: 'slate', name: 'Slate', primary: '#475569' },
  { id: 'emerald', name: 'Emerald', primary: '#059669' },
  { id: 'indigo', name: 'Indigo', primary: '#4F46E5' },
  { id: 'rose', name: 'Rose', primary: '#E11D48' },
  { id: 'amber-dark', name: 'Amber', primary: '#B45309' },
  { id: 'sky', name: 'Sky', primary: '#0284C7' },
  { id: 'purple', name: 'Purple', primary: '#7C3AED' },
  { id: 'graphite', name: 'Graphite', primary: '#334155' },
]
