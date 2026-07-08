import type { ResumeTemplate, ResumeColorTheme, TemplateStyle } from './types'
import { SVG_TXT as TXT } from './boilerplate'

// ---- SVG preview helpers ----

const _accent = 'currentColor'
const _dk = '#1A1A2E'
const _lt = '#E2DFD9'
const _mut = '#9A99A6'
const _bg = '#FAFAF8'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function _r(x: number, y: number, w: number, h: number, fill: string, r = 0): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`
}
function _ln(x1: number, y1: number, x2: number, y2: number, stroke: string, w = 0.5): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`
}

const _L = 14
const _R = 136 // right edge for text-anchor=end

const SANS = 'sans-serif'
const SERIF = 'Georgia, serif'

// ---- Text helpers ----

function _tx(x: number, y: number, s: number, text: string, fill = _dk, bold = false, family = SANS): string {
  return `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="${family}"${bold ? ' font-weight="700"' : ''}>${esc(text)}</text>`
}
function _txU(x: number, y: number, s: number, text: string, fill = _dk, bold = false, family = SANS): string {
  return _tx(x, y, s, text.toUpperCase(), fill, bold, family)
}
function _txC(x: number, y: number, s: number, text: string, fill = _dk, bold = false, family = SANS): string {
  return `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="${family}"${bold ? ' font-weight="700"' : ''} text-anchor="middle">${esc(text)}</text>`
}
function _txR(x: number, y: number, s: number, text: string, fill = _dk, bold = false, family = SANS): string {
  return `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="${family}"${bold ? ' font-weight="700"' : ''} text-anchor="end">${esc(text)}</text>`
}

// ---- Structural section builders (match actual template renderers) ----

function sectionHd(x: number, y: number, text: string, color = _accent, family = SANS): string {
  return _txU(x, y, 2.2, text, color, true, family)
}
function hdUnderline(y: number, x = _L): string {
  return _r(x, y + 1, 28, 0.8, _accent)
}
function hdLeftBar(y: number, x = _L): string {
  return _r(x - 3, y - 1.5, 2.5, 5, _accent)
}
function hdBadge(x: number, y: number, text: string, color = _accent): string {
  const w = text.length * 2.5 + 4
  return _r(x, y - 2.5, w, 6, color, 1) + _txC(x + w / 2, y + 1, 2, text, '#fff', true, SANS)
}

function headerBlock(y: number, centered = false, family = SANS): string {
  if (centered) {
    return _txC(75, y, 4, TXT.name, _dk, true, family)
      + _txC(75, y + 5, 1.5, TXT.contact, _mut, false, family)
  }
  return _tx(_L, y, 4, TXT.name, _dk, true, family)
    + _tx(_L, y + 4.5, 1.5, TXT.contact, _mut, false, family)
}

function expTitleRow(y: number, title: string, dates: string, family = SANS): string {
  return _txR(_R, y, 1.4, dates, _accent, true, family)
    + _tx(_L, y, 1.8, title, _dk, true, family)
}
function expCompany(y: number, company: string, family = SANS): string {
  return _tx(_L, y, 1.5, company, _mut, false, family)
}
function expBullet(y: number, text: string): string {
  return _tx(_L - 0.5, y, 1.4, '\u2022', _accent, true)
    + _tx(_L + 2.5, y, 1.5, text, _dk)
}
function expEntry(y: number, title: string, company: string, dates: string, bullets: string[], family = SANS): string {
  let o = expTitleRow(y, title, dates, family)
  o += expCompany(y + 2.3, company, family)
  bullets.forEach((b, i) => {
    o += expBullet(y + 4.5 + i * 2, b)
  })
  return o
}

function eduEntry(y: number, school: string, detail: string, dates: string, family = SANS): string {
  return _txR(_R, y, 1.4, dates, _accent, true, family)
    + _tx(_L, y, 1.8, school, _dk, true, family)
    + _tx(_L, y + 2.3, 1.5, detail, _dk, false, family)
}

function skillsTags(y: number, skills: string[], x = _L, color = _accent): string {
  let o = _txU(x, y, 2.2, TXT.skills, color, true, SANS)
  let cy = y + 4
  skills.forEach((s, i) => {
    const w = s.length * 2 + 4
    if (x + w > 140) { x = _L; cy += 3.5 }
    o += _r(x, cy - 1.2, w, 3, _lt, 1)
    o += _tx(x + 2, cy, 1.3, s, _mut)
    x += w + 3
  })
  return o
}

function langsLine(y: number, x = _L): string {
  return _txU(x, y, 2.2, TXT.langs, _accent, true, SANS)
    + _tx(x, y + 3.5, 1.5, TXT.l1, _dk)
}

// ---- Column-aware helpers for multi-column layouts ----
// These accept an explicit x position for the left edge of the content column
// (instead of using the global _L = 14).

function _eTR(x: number, y: number, title: string, dates: string, family = SANS): string {
  return _txR(_R, y, 1.4, dates, _accent, true, family)
    + _tx(x, y, 1.8, title, _dk, true, family)
}
function _eCO(x: number, y: number, company: string, family = SANS): string {
  return _tx(x, y, 1.5, company, _mut, false, family)
}
function _eBL(x: number, y: number, text: string): string {
  return _tx(x - 0.5, y, 1.4, '\u2022', _accent, true)
    + _tx(x + 2.5, y, 1.5, text, _dk)
}
function _eEN(x: number, y: number, school: string, detail: string, dates: string, family = SANS): string {
  return _txR(_R, y, 1.4, dates, _accent, true, family)
    + _tx(x, y, 1.8, school, _dk, true, family)
    + _tx(x, y + 2.3, 1.5, detail, _dk, false, family)
}

// Single column previews — 10 variants
function singleColPreview(i: number): string {
  const a = _accent, d = _dk, l = _lt, m = _mut, bg = _bg

  // Base content: header + 2 exp entries + 1 edu entry + skills tags + langs
  function body(family = SANS): string {
    return headerBlock(10, false, family)
      + '\n' + sectionHd(_L, 23, TXT.exp, a, family)
      + '\n' + expEntry(27, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b, TXT.e1_b2], family)
      + '\n' + expEntry(39, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], family)
      + '\n' + sectionHd(_L, 53, TXT.edu, a, family)
      + '\n' + eduEntry(57, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, family)
      + '\n' + skillsTags(66, [TXT.s1, TXT.s2, TXT.s3, TXT.s4])
      + '\n' + langsLine(82)
  }

  const variants: Array<() => string> = [
    // 0: Clean Minimal — left name, thin underline headings
    () => `<rect width="150" height="200" fill="${bg}"/>
${headerBlock(10, false, SANS)}
${_ln(14, 21, 136, 21, l)}
${sectionHd(_L, 24, TXT.exp, a, SANS)}${hdUnderline(24)}
${expEntry(28, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b, TXT.e1_b2], SANS)}
${expEntry(40, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SANS)}
${sectionHd(_L, 54, TXT.edu, a, SANS)}${hdUnderline(54)}
${eduEntry(58, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}
${skillsTags(67, [TXT.s1, TXT.s2, TXT.s3, TXT.s4])}
${langsLine(83)}`,

    // 1: Executive — centered serif name, dark divider
    () => `<rect width="150" height="200" fill="${bg}"/>
${_txC(75, 10, 4.5, TXT.name, d, true, SERIF)}
${_txC(75, 15.5, 1.5, TXT.contact, m, false, SERIF)}
${_ln(20, 21, 130, 21, d, 0.8)}
${sectionHd(_L, 26, TXT.exp, a, SERIF)}
${expEntry(30, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b], SERIF)}
${expEntry(42, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SERIF)}
${sectionHd(_L, 56, TXT.edu, a, SERIF)}
${eduEntry(60, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SERIF)}
${skillsTags(69, [TXT.s1, TXT.s2, TXT.s3, TXT.s4])}
${langsLine(85)}`,

    // 2: Sharp — dark header block, white name/contact
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 150, 26, d)}
${_tx(14, 8, 4, TXT.name, '#fff', true, SANS)}
${_tx(14, 13, 1.4, TXT.contact, 'rgba(255,255,255,0.6)', false, SANS)}
${sectionHd(_L, 32, TXT.exp, a, SANS)}
${expEntry(36, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b, TXT.e1_b2], SANS)}
${expEntry(48, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SANS)}
${sectionHd(_L, 62, TXT.edu, a, SANS)}
${eduEntry(66, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}
${skillsTags(75, [TXT.s1, TXT.s2, TXT.s3, TXT.s4])}`,

    // 3: Classic — centered name, serif, small-caps headings
    () => `<rect width="150" height="200" fill="${bg}"/>
${_txC(75, 10, 4, TXT.name, d, true, SERIF)}
${_txC(75, 15, 1.5, TXT.contact, m, false, SERIF)}
${_ln(20, 20, 130, 20, d, 0.5)}
${_txU(_L, 25, 2, TXT.exp, d, true, SERIF)}
${expEntry(29, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b], SERIF)}
${expEntry(41, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SERIF)}
${_txU(_L, 55, 2, TXT.edu, d, true, SERIF)}
${eduEntry(59, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SERIF)}
${_txU(_L, 68, 2, TXT.skills, d, true, SERIF)}
${_tx(_L, 72, 1.5, TXT.s1, d, false, SERIF)}
${_tx(_L, 74.5, 1.5, TXT.s2, d, false, SERIF)}`,

    // 4: Elegant — left accent bars
    () => `<rect width="150" height="200" fill="${bg}"/>
${headerBlock(10, false, SANS)}
${hdLeftBar(24)}
${sectionHd(_L, 24, TXT.exp, a, SANS)}
${expEntry(28, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b], SANS)}
${expEntry(40, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SANS)}
${hdLeftBar(54)}
${sectionHd(_L, 54, TXT.edu, a, SANS)}
${eduEntry(58, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}
${skillsTags(67, [TXT.s1, TXT.s2, TXT.s3, TXT.s4])}
${langsLine(83)}`,

    // 5: Academic — compact, indented body, serif
    () => `<rect width="150" height="200" fill="${bg}"/>
${_txC(75, 10, 4.5, TXT.name, d, true, SERIF)}
${_txC(75, 15, 1.5, TXT.contact, m, false, SERIF)}
${_ln(14, 20, 136, 20, l, 0.3)}
${_txU(14, 24, 2, TXT.exp, d, true, SERIF)}
${expTitleRow(28, TXT.e1_t, TXT.e1_d, SERIF)}
${_tx(20, 30.5, 1.5, TXT.e1_c, m, false, SERIF)}
${expBullet(33, TXT.e1_b)}
${expTitleRow(37, TXT.e2_t, TXT.e2_d, SERIF)}
${_tx(20, 39.5, 1.5, TXT.e2_c, m, false, SERIF)}
${expBullet(42, TXT.e2_b)}
${_txU(14, 47, 2, TXT.edu, d, true, SERIF)}
${_tx(20, 51, 1.8, TXT.edu1_s, d, true, SERIF)}
${_tx(20, 53.5, 1.5, TXT.edu1_d, d, false, SERIF)}
${_txR(_R, 53.5, 1.4, TXT.edu1_da, a, true, SERIF)}
${_txU(14, 59, 2, TXT.skills, d, true, SERIF)}
${_tx(20, 63, 1.5, TXT.s1, d, false, SERIF)}
${_tx(20, 65.5, 1.5, TXT.s2, d, false, SERIF)}`,

    // 6: Corporate — top accent stripe, clean sans
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 150, 4, a)}
${headerBlock(11, false, SANS)}
${_ln(14, 22, 136, 22, l, 0.3)}
${sectionHd(_L, 25, TXT.exp, a, SANS)}${hdUnderline(25)}
${expEntry(29, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b], SANS)}
${expEntry(41, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SANS)}
${sectionHd(_L, 55, TXT.edu, a, SANS)}${hdUnderline(55)}
${eduEntry(59, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}
${skillsTags(68, [TXT.s1, TXT.s2, TXT.s3, TXT.s4])}
${langsLine(84)}`,

    // 7: Journal — left accent bar on name, serif
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(8, 8, 3, 12, a)}
${_tx(14, 9, 4, TXT.name, d, true, SERIF)}
${_tx(14, 14, 1.5, TXT.contact, m, false, SERIF)}
${sectionHd(_L, 22, TXT.exp, a, SERIF)}
${expEntry(26, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b], SERIF)}
${expEntry(38, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SERIF)}
${sectionHd(_L, 52, TXT.edu, a, SERIF)}
${eduEntry(56, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SERIF)}
${skillsTags(65, [TXT.s1, TXT.s2, TXT.s3, TXT.s4])}
${langsLine(81)}`,

    // 8: Minimalist — extra whitespace, thin elements
    () => `<rect width="150" height="200" fill="${bg}"/>
${_tx(_L, 14, 3.5, TXT.name, d, true, SANS)}
${_tx(_L, 19, 1.5, TXT.contact, m, false, SANS)}
${hdUnderline(25)}
${expEntry(29, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b], SANS)}
${expEntry(41, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SANS)}
${hdUnderline(55)}
${eduEntry(59, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}
${_tx(_L, 68, 1.5, TXT.s1, d, false, SANS)}
${_tx(_L, 70.5, 1.5, TXT.s2, d, false, SANS)}
${hdUnderline(75)}
${langsLine(79)}`,

    // 9: Bold — badge-style headings
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 150, 4, a)}
${headerBlock(11, false, SANS)}
${hdBadge(_L, 26, TXT.exp)}
${expEntry(32, TXT.e1_t, TXT.e1_c, TXT.e1_d, [TXT.e1_b], SANS)}
${expEntry(44, TXT.e2_t, TXT.e2_c, TXT.e2_d, [TXT.e2_b], SANS)}
${hdBadge(_L, 58, TXT.edu)}
${eduEntry(64, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}
${hdBadge(_L, 74, TXT.skills)}
${_tx(_L, 80, 1.5, TXT.s1, d, false, SANS)}
${_tx(_L, 82.5, 1.5, TXT.s2, d, false, SANS)}
${hdBadge(_L, 88, TXT.langs)}
${_tx(_L, 94, 1.5, TXT.l1, d)}`,
  ]

  const fn = variants[i % variants.length]
  return `<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`
}

// Two-column previews — 6 layouts
function twoColPreview(i: number): string {
  const a = _accent, d = _dk, m = _mut, bg = _bg

  const variants: Array<() => string> = [
    // 0: Left sidebar (~32%) — warm panel, centered header
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 48, 200, '#F4F1EB')}
${_txC(75, 8, 4, TXT.name, d, true, SANS)}
${_txC(75, 12, 1.4, TXT.contact, m, false, SANS)}
${_txU(6, 20, 1.8, TXT.skills, a, true)}
${_tx(6, 24, 1.4, TXT.s1, m)}${_tx(6, 26.5, 1.4, TXT.s2, m)}${_tx(6, 29, 1.4, TXT.s3, m)}
${_txU(6, 34, 1.8, TXT.langs, a, true)}
${_tx(6, 38, 1.4, TXT.l1, m)}
${sectionHd(54, 20, TXT.exp, a, SANS)}
${_eTR(54, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(54, 26.5, TXT.e1_c, SANS)}
${_eBL(54, 29, TXT.e1_b)}${_eBL(54, 31, TXT.e1_b2)}
${_eTR(54, 35, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(54, 37.5, TXT.e2_c, SANS)}
${_eBL(54, 40, TXT.e2_b)}
${sectionHd(54, 45, TXT.edu, a, SANS)}
${_eEN(54, 49, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}`,

    // 1: Even split (~49/49), centered header
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 73, 200, '#F8F8F6')}
${_txC(75, 8, 4, TXT.name, d, true, SANS)}
${_txC(75, 12, 1.4, TXT.contact, m, false, SANS)}
${_txU(6, 20, 1.8, TXT.skills, a, true)}
${_tx(6, 24, 1.4, TXT.s1, m)}${_tx(6, 26.5, 1.4, TXT.s2, m)}${_tx(6, 29, 1.4, TXT.s3, m)}
${_txU(6, 34, 1.8, TXT.langs, a, true)}
${_tx(6, 38, 1.4, TXT.l1, m)}
${sectionHd(78, 20, TXT.exp, a, SANS)}
${_eTR(78, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(78, 26.5, TXT.e1_c, SANS)}
${_eBL(78, 29, TXT.e1_b)}
${_eTR(78, 33, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(78, 35.5, TXT.e2_c, SANS)}
${_eBL(78, 38, TXT.e2_b)}
${sectionHd(78, 43, TXT.edu, a, SANS)}
${_eEN(78, 47, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}`,

    // 2: Accent colored left sidebar, name in sidebar
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 48, 200, a)}
${_tx(6, 10, 3.5, TXT.name, '#fff', true, SANS)}
${_tx(6, 14.5, 1.4, TXT.contact, 'rgba(255,255,255,0.7)', false, SANS)}
${_txU(6, 22, 1.8, TXT.skills, '#fff', true)}
${_tx(6, 26, 1.4, TXT.s1, 'rgba(255,255,255,0.8)')}${_tx(6, 28.5, 1.4, TXT.s2, 'rgba(255,255,255,0.8)')}
${_txU(6, 36, 1.8, TXT.langs, '#fff', true)}
${_tx(6, 40, 1.4, TXT.l1, 'rgba(255,255,255,0.8)')}
${sectionHd(54, 20, TXT.exp, a, SANS)}
${_eTR(54, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(54, 26.5, TXT.e1_c, SANS)}
${_eBL(54, 29, TXT.e1_b)}
${_eTR(54, 33, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(54, 35.5, TXT.e2_c, SANS)}
${_eBL(54, 38, TXT.e2_b)}
${sectionHd(54, 43, TXT.edu, a, SANS)}
${_eEN(54, 47, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}`,

    // 3: Right sidebar — reversed, centered header
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(100, 0, 50, 200, '#F4F1EB')}
${_txC(75, 8, 4, TXT.name, d, true, SANS)}
${_txC(75, 12, 1.4, TXT.contact, m, false, SANS)}
${_txU(104, 20, 1.8, TXT.skills, a, true)}
${_tx(104, 24, 1.4, TXT.s1, m)}${_tx(104, 26.5, 1.4, TXT.s2, m)}
${_txU(104, 33, 1.8, TXT.langs, a, true)}
${_tx(104, 37, 1.4, TXT.l1, m)}
${sectionHd(12, 20, TXT.exp, a, SANS)}
${_eTR(12, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(12, 26.5, TXT.e1_c, SANS)}
${_eBL(12, 29, TXT.e1_b)}${_eBL(12, 31, TXT.e1_b2)}
${_eTR(12, 35, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(12, 37.5, TXT.e2_c, SANS)}
${_eBL(12, 40, TXT.e2_b)}
${sectionHd(12, 45, TXT.edu, a, SANS)}
${_eEN(12, 49, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}`,

    // 4: Narrow dark sidebar (24%), name in sidebar
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 36, 200, d)}
${_tx(4, 10, 3, TXT.name, '#fff', true, SANS)}
${_tx(4, 14, 1.2, TXT.contact, 'rgba(255,255,255,0.5)', false, SANS)}
${_txU(4, 21, 1.6, TXT.skills, '#fff', true)}
${_tx(4, 24.5, 1.2, TXT.s1, 'rgba(255,255,255,0.6)')}${_tx(4, 26.5, 1.2, TXT.s2, 'rgba(255,255,255,0.6)')}
${_txU(4, 32, 1.6, TXT.langs, '#fff', true)}
${_tx(4, 35.5, 1.2, TXT.l1, 'rgba(255,255,255,0.6)')}
${sectionHd(42, 20, TXT.exp, a, SANS)}
${_eTR(42, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(42, 26.5, TXT.e1_c, SANS)}
${_eBL(42, 29, TXT.e1_b)}
${_eTR(42, 33, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(42, 35.5, TXT.e2_c, SANS)}
${_eBL(42, 38, TXT.e2_b)}`,

    // 5: Thirds — balanced 1/3 + 2/3, centered header
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 50, 200, '#F8F8F6')}
${_txC(75, 8, 4, TXT.name, d, true, SANS)}
${_txC(75, 12, 1.4, TXT.contact, m, false, SANS)}
${_txU(6, 20, 1.8, TXT.skills, a, true)}
${_tx(6, 24, 1.4, TXT.s1, m)}${_tx(6, 26.5, 1.4, TXT.s2, m)}${_tx(6, 29, 1.4, TXT.s3, m)}
${_txU(6, 34, 1.8, TXT.langs, a, true)}
${_tx(6, 38, 1.4, TXT.l1, m)}
${sectionHd(56, 20, TXT.exp, a, SANS)}
${_eTR(56, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(56, 26.5, TXT.e1_c, SANS)}
${_eBL(56, 29, TXT.e1_b)}`,
  ]

  const fn = variants[i % variants.length]
  return `<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`
}

// Sidebar previews — 6 layouts
function sidebarPreview(i: number): string {
  const a = _accent, d = _dk, l = _lt, m = _mut, bg = _bg

  const variants: Array<() => string> = [
    // 0: Classic warm sidebar, centered header
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 44, 200, '#F4F1EB')}
${_txC(75, 8, 4, TXT.name, d, true, SANS)}
${_txC(75, 12, 1.4, TXT.contact, m, false, SANS)}
${_txU(6, 20, 1.8, TXT.skills, a, true)}
${_tx(6, 24, 1.4, TXT.s1, m)}${_tx(6, 26.5, 1.4, TXT.s2, m)}${_tx(6, 29, 1.4, TXT.s3, m)}
${_txU(6, 34, 1.8, TXT.langs, a, true)}
${_tx(6, 38, 1.4, TXT.l1, m)}
${sectionHd(50, 20, TXT.exp, a, SANS)}
${_eTR(50, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(50, 26.5, TXT.e1_c, SANS)}
${_eBL(50, 29, TXT.e1_b)}${_eBL(50, 31, TXT.e1_b2)}
${_eTR(50, 35, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(50, 37.5, TXT.e2_c, SANS)}
${_eBL(50, 40, TXT.e2_b)}
${sectionHd(50, 45, TXT.edu, a, SANS)}
${_eEN(50, 49, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}`,

    // 1: Minimal — thin divider line, centered header
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 42, 200, '#fff')}
${_ln(42, 4, 42, 196, l)}
${_txC(75, 8, 4, TXT.name, d, true, SANS)}
${_txC(75, 12, 1.4, TXT.contact, m, false, SANS)}
${_txU(5, 20, 1.8, TXT.skills, a, true)}
${_tx(5, 24, 1.4, TXT.s1, m)}${_tx(5, 26.5, 1.4, TXT.s2, m)}
${_txU(5, 34, 1.8, TXT.langs, a, true)}
${_tx(5, 38, 1.4, TXT.l1, m)}
${sectionHd(48, 20, TXT.exp, a, SANS)}
${_eTR(48, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(48, 26.5, TXT.e1_c, SANS)}
${_eBL(48, 29, TXT.e1_b)}
${_eTR(48, 33, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(48, 35.5, TXT.e2_c, SANS)}
${_eBL(48, 38, TXT.e2_b)}
${sectionHd(48, 43, TXT.edu, a, SANS)}
${_eEN(48, 47, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}`,

    // 2: Dark sidebar — black panel, name in sidebar
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 48, 200, d)}
${_tx(6, 10, 3.5, TXT.name, '#fff', true, SANS)}
${_tx(6, 14.5, 1.4, TXT.contact, 'rgba(255,255,255,0.5)', false, SANS)}
${_txU(6, 22, 1.8, TXT.skills, '#fff', true)}
${_tx(6, 26, 1.4, TXT.s1, 'rgba(255,255,255,0.6)')}${_tx(6, 28.5, 1.4, TXT.s2, 'rgba(255,255,255,0.6)')}
${_txU(6, 36, 1.8, TXT.langs, '#fff', true)}
${_tx(6, 40, 1.4, TXT.l1, 'rgba(255,255,255,0.6)')}
${sectionHd(54, 20, TXT.exp, a, SANS)}
${_eTR(54, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(54, 26.5, TXT.e1_c, SANS)}
${_eBL(54, 29, TXT.e1_b)}${_eBL(54, 31, TXT.e1_b2)}
${_eTR(54, 35, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(54, 37.5, TXT.e2_c, SANS)}
${_eBL(54, 40, TXT.e2_b)}
${sectionHd(54, 45, TXT.edu, a, SANS)}
${_eEN(54, 49, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}`,

    // 3: Top accent bar + sidebar, name in top bar
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 150, 8, a)}
${_r(0, 8, 150, 3, d)}
${_tx(6, 14, 3.5, TXT.name, '#fff', true, SANS)}
${_tx(6, 18.5, 1.4, TXT.contact, 'rgba(255,255,255,0.6)', false, SANS)}
${_txU(6, 26, 1.8, TXT.skills, '#fff', true)}
${_tx(6, 30, 1.4, TXT.s1, d)}${_tx(6, 32.5, 1.4, TXT.s2, d)}
${_txU(6, 39, 1.8, TXT.langs, '#fff', true)}
${_tx(6, 43, 1.4, TXT.l1, d)}
${sectionHd(54, 24, TXT.exp, a, SANS)}
${_eTR(54, 28, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(54, 30.5, TXT.e1_c, SANS)}
${_eBL(54, 33, TXT.e1_b)}
${_eTR(54, 37, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(54, 39.5, TXT.e2_c, SANS)}
${_eBL(54, 42, TXT.e2_b)}`,

    // 4: Colored accent sidebar, name in sidebar
    () => `<rect width="150" height="200" fill="${bg}"/>
${_r(0, 0, 46, 200, a)}
${_tx(6, 10, 3.5, TXT.name, '#fff', true, SANS)}
${_tx(6, 14.5, 1.4, TXT.contact, 'rgba(255,255,255,0.7)', false, SANS)}
${_txU(6, 22, 1.8, TXT.skills, '#fff', true)}
${_tx(6, 26, 1.4, TXT.s1, 'rgba(255,255,255,0.8)')}${_tx(6, 28.5, 1.4, TXT.s2, 'rgba(255,255,255,0.8)')}
${_txU(6, 36, 1.8, TXT.langs, '#fff', true)}
${_tx(6, 40, 1.4, TXT.l1, 'rgba(255,255,255,0.8)')}
${sectionHd(52, 20, TXT.exp, a, SANS)}
${_eTR(52, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(52, 26.5, TXT.e1_c, SANS)}
${_eBL(52, 29, TXT.e1_b)}${_eBL(52, 31, TXT.e1_b2)}
${_eTR(52, 35, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(52, 37.5, TXT.e2_c, SANS)}
${_eBL(52, 40, TXT.e2_b)}
${sectionHd(52, 45, TXT.edu, a, SANS)}
${_eEN(52, 49, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}`,

    // 5: Bottom-heavy — contact/skills at bottom
    () => `<rect width="150" height="200" fill="${bg}"/>
${_tx(_L, 10, 4, TXT.name, d, true, SANS)}
${_tx(_L, 15, 1.5, TXT.contact, m, false, SANS)}
${sectionHd(_L, 20, TXT.exp, a, SANS)}
${_eTR(_L, 24, TXT.e1_t, TXT.e1_d, SANS)}
${_eCO(_L, 26.5, TXT.e1_c, SANS)}
${_eBL(_L, 29, TXT.e1_b)}${_eBL(_L, 31, TXT.e1_b2)}
${_eTR(_L, 35, TXT.e2_t, TXT.e2_d, SANS)}
${_eCO(_L, 37.5, TXT.e2_c, SANS)}
${_eBL(_L, 40, TXT.e2_b)}
${sectionHd(_L, 45, TXT.edu, a, SANS)}
${_eEN(_L, 49, TXT.edu1_s, TXT.edu1_d, TXT.edu1_da, SANS)}
${_r(0, 116, 150, 84, '#F4F1EB')}
${_txU(_L, 136, 1.8, TXT.skills, a, true)}
${_tx(_L, 140, 1.5, TXT.s1, d)}${_tx(_L, 142.5, 1.5, TXT.s2, d)}
${_tx(_L, 145, 1.5, TXT.s3, d)}
${_txU(_L, 152, 1.8, TXT.langs, a, true)}
${_tx(_L, 156, 1.5, TXT.l1, d)}`,
  ]

  const fn = variants[i % variants.length]
  return `<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`
}

function pickPreview(layout: 'single-column' | 'two-column' | 'sidebar', idx: number): string {
  if (layout === 'two-column') return twoColPreview(idx)
  if (layout === 'sidebar') return sidebarPreview(idx)
  return singleColPreview(idx)
}

// ---- Style Presets ----

const STYLE_PRESETS: Record<string, TemplateStyle> = {
  clean:     { header: 'center',       heading: 'underline',  bullet: 'dot',   font: 'sans',    spacing: 'normal' },
  modern:    { header: 'thin-line',    heading: 'uppercase',  bullet: 'dash',  font: 'sans',    spacing: 'normal' },
  executive: { header: 'dark-block',   heading: 'underline',  bullet: 'dash',  font: 'serif',   spacing: 'normal' },
  compact:   { header: 'left-accent',  heading: 'uppercase',  bullet: 'dot',   font: 'sans',    spacing: 'compact' },
  elegant:   { header: 'centered-line',heading: 'small-caps', bullet: 'dash',  font: 'serif',   spacing: 'airy' },
  editorial: { header: 'left-accent',  heading: 'left-bar',   bullet: 'arrow', font: 'display', spacing: 'normal' },
  bold:      { header: 'top-stripe',   heading: 'badge',      bullet: 'check', font: 'sans',    spacing: 'compact' },
  classic:   { header: 'center',       heading: 'small-caps', bullet: 'dot',   font: 'serif',   spacing: 'airy' },
  sharp:     { header: 'thin-line',    heading: 'underline',  bullet: 'dash',  font: 'sans',    spacing: 'compact' },
  journal:   { header: 'paper',        heading: 'dot-accent', bullet: 'hyphen',font: 'serif',   spacing: 'normal' },
  minimal:   { header: 'minimal',      heading: 'uppercase',  bullet: 'dot',   font: 'sans',    spacing: 'airy' },
  accent:    { header: 'top-stripe',   heading: 'underline',  bullet: 'dot',   font: 'display', spacing: 'normal' },
  charter:   { header: 'dark-block',   heading: 'small-caps', bullet: 'arrow', font: 'serif',   spacing: 'normal' },
  prestige:  { header: 'centered-line',heading: 'dot-accent', bullet: 'check', font: 'sans',    spacing: 'airy' },
  engineer:  { header: 'minimal',      heading: 'badge',      bullet: 'hyphen',font: 'mono',    spacing: 'compact' },
  contemporary: { header: 'top-stripe',heading: 'left-bar',   bullet: 'dash',  font: 'sans',    spacing: 'airy' },
  folio:     { header: 'left-accent',  heading: 'small-caps', bullet: 'hyphen',font: 'display', spacing: 'normal' },
}

// ---- Templates ----

const TEMPLATE_DEFS: Array<Omit<ResumeTemplate, 'preview' | 'style'> & { _idx: number; _preset: string }> = [
  { id: 'minimal', name: 'Minimal', description: 'Clean single column. Best for ATS parsing and traditional roles.', layout: 'single-column', _idx: 0, _preset: 'clean' },
  { id: 'modern', name: 'Modern', description: 'Two-column with teal sidebar. Great for tech and creative roles.', layout: 'two-column', _idx: 0, _preset: 'modern' },
  { id: 'executive', name: 'Executive', description: 'Bold name block with serif headings. For senior roles.', layout: 'single-column', _idx: 1, _preset: 'executive' },
  { id: 'compact', name: 'Compact', description: 'Dense single-column. Fits more content per page.', layout: 'single-column', _idx: 5, _preset: 'compact' },
  { id: 'sidepanel', name: 'Side Panel', description: 'Left sidebar with contact and skills. Clean main area.', layout: 'sidebar', _idx: 0, _preset: 'editorial' },
  { id: 'split', name: 'Split', description: 'Even two-column split. Balanced visual presentation.', layout: 'two-column', _idx: 1, _preset: 'modern' },
  { id: 'accent', name: 'Accent', description: 'Bold color accents on headers. Modern and eye-catching.', layout: 'single-column', _idx: 6, _preset: 'accent' },
  { id: 'timeline', name: 'Timeline', description: 'Experience shown as a visual timeline.', layout: 'single-column', _idx: 8, _preset: 'journal' },
  { id: 'minimalist', name: 'Minimalist', description: 'Extra whitespace. Elegant layout for design roles.', layout: 'single-column', _idx: 4, _preset: 'minimal' },
  { id: 'classic', name: 'Classic', description: 'Traditional resume format. Universally accepted.', layout: 'single-column', _idx: 9, _preset: 'classic' },
  { id: 'clean', name: 'Clean', description: 'Serif body text with generous spacing for readability.', layout: 'single-column', _idx: 7, _preset: 'elegant' },
  { id: 'sharp', name: 'Sharp', description: 'Bold black headers with thin separator rules.', layout: 'single-column', _idx: 2, _preset: 'sharp' },
  { id: 'airy', name: 'Airy', description: 'Maximum whitespace and minimal visual rules.', layout: 'single-column', _idx: 4, _preset: 'minimal' },
  { id: 'formal', name: 'Formal', description: 'Traditional serif layout for conservative industries.', layout: 'single-column', _idx: 3, _preset: 'executive' },
  { id: 'modern-clean', name: 'Modern Clean', description: 'Sans-serif with clean layout lines.', layout: 'single-column', _idx: 0, _preset: 'clean' },
  { id: 'slate', name: 'Slate', description: 'Dark header block for bold first impression.', layout: 'single-column', _idx: 2, _preset: 'bold' },
  { id: 'editorial', name: 'Editorial', description: 'Magazine-inspired layout for creative fields.', layout: 'single-column', _idx: 1, _preset: 'editorial' },
  { id: 'mono', name: 'Mono', description: 'Monospace font throughout for engineering roles.', layout: 'single-column', _idx: 7, _preset: 'sharp' },
  { id: 'columns', name: 'Columns', description: 'Equal two-column with thin divider line.', layout: 'two-column', _idx: 1, _preset: 'modern' },
  { id: 'sidebar-right', name: 'Sidebar Right', description: 'Right sidebar variant for contact and skills.', layout: 'two-column', _idx: 3, _preset: 'sharp' },
  { id: 'profile', name: 'Profile', description: 'Photo-friendly sidebar for consulting roles.', layout: 'sidebar', _idx: 1, _preset: 'editorial' },
  { id: 'metrics', name: 'Metrics', description: 'Data-focused layout with KPI highlight sections.', layout: 'two-column', _idx: 5, _preset: 'bold' },
  { id: 'technical', name: 'Technical', description: 'Code-friendly monospace sidebar for engineers.', layout: 'two-column', _idx: 4, _preset: 'sharp' },
  { id: 'creative', name: 'Creative', description: 'Asymmetric colorful layout for design roles.', layout: 'two-column', _idx: 2, _preset: 'accent' },
  { id: 'dashboard', name: 'Dashboard', description: 'Left sidebar with colored icon indicators.', layout: 'sidebar', _idx: 4, _preset: 'bold' },
  { id: 'expertise', name: 'Expertise', description: 'Skills-focused two-column for specialists.', layout: 'two-column', _idx: 0, _preset: 'modern' },
  { id: 'left-brand', name: 'Left Brand', description: 'Branded left panel with accent color header.', layout: 'sidebar', _idx: 2, _preset: 'accent' },
  { id: 'contact-left', name: 'Contact Left', description: 'Contact information prominent in sidebar.', layout: 'sidebar', _idx: 0, _preset: 'clean' },
  { id: 'skills-left', name: 'Skills Left', description: 'Skills-focused sidebar for technical roles.', layout: 'sidebar', _idx: 1, _preset: 'editorial' },
  { id: 'compact-sidebar', name: 'Compact Sidebar', description: 'Dense sidebar layout for one-page resumes.', layout: 'sidebar', _idx: 3, _preset: 'compact' },
  { id: 'modern-sidebar', name: 'Modern Sidebar', description: 'Modern sidebar with icon-friendly layout.', layout: 'sidebar', _idx: 4, _preset: 'modern' },
  { id: 'executive-sidebar', name: 'Executive Sidebar', description: 'Executive sidebar with distinguished header.', layout: 'sidebar', _idx: 2, _preset: 'executive' },
  { id: 'ats-optimized', name: 'ATS Optimized', description: 'No columns. Maximum ATS parsing compatibility.', layout: 'single-column', _idx: 5, _preset: 'minimal' },
  { id: 'career-change', name: 'Career Change', description: 'Functional skills-focused layout for pivots.', layout: 'single-column', _idx: 8, _preset: 'journal' },
  { id: 'entry-level', name: 'Entry Level', description: 'Education-first layout for new graduates.', layout: 'single-column', _idx: 3, _preset: 'classic' },
  { id: 'academic', name: 'Academic', description: 'Research and publications emphasis layout.', layout: 'single-column', _idx: 9, _preset: 'classic' },
  { id: 'federal', name: 'Federal', description: 'Government resume format with required sections.', layout: 'single-column', _idx: 2, _preset: 'sharp' },
  { id: 'consulting', name: 'Consulting', description: 'Metrics-driven with project impact highlights.', layout: 'two-column', _idx: 5, _preset: 'bold' },
  { id: 'executive-brief', name: 'Executive Brief', description: 'One-page executive summary format.', layout: 'single-column', _idx: 1, _preset: 'executive' },
  { id: 'board', name: 'Board', description: 'Board of directors and advisory roles format.', layout: 'single-column', _idx: 6, _preset: 'executive' },
  { id: 'intern', name: 'Intern', description: 'Internship-focused with education emphasis.', layout: 'single-column', _idx: 7, _preset: 'clean' },
  { id: 'saas', name: 'SaaS', description: 'SaaS role focused with product metrics.', layout: 'two-column', _idx: 4, _preset: 'sharp' },
  { id: 'remote', name: 'Remote', description: 'Remote work focused with distributed skills.', layout: 'sidebar', _idx: 1, _preset: 'minimal' },
  { id: 'startup', name: 'Startup', description: 'Startup culture focused, concise and bold.', layout: 'single-column', _idx: 0, _preset: 'accent' },
  { id: 'freelance', name: 'Freelance', description: 'Freelancer portfolio style with project list.', layout: 'sidebar', _idx: 3, _preset: 'editorial' },
  { id: 'bilingual', name: 'Bilingual', description: 'Side-by-side language layout for dual roles.', layout: 'two-column', _idx: 1, _preset: 'modern' },
  { id: 'gradient-sidebar', name: 'Gradient Sidebar', description: 'Gradient sidebar background for modern look.', layout: 'sidebar', _idx: 4, _preset: 'accent' },
  { id: 'dark-sidebar', name: 'Dark Sidebar', description: 'Dark sidebar with light text for contrast.', layout: 'sidebar', _idx: 2, _preset: 'bold' },
  { id: 'minimal-sidebar', name: 'Minimal Sidebar', description: 'Clean sidebar layout with thin divider.', layout: 'sidebar', _idx: 1, _preset: 'minimal' },
  { id: 'marginalia', name: 'Marginalia', description: 'Notes in the margin style for creative roles.', layout: 'sidebar', _idx: 3, _preset: 'journal' },
  { id: 'portfolio', name: 'Portfolio', description: 'Visual portfolio layout with project grid.', layout: 'two-column', _idx: 2, _preset: 'accent' },
  { id: 'leadership', name: 'Leadership', description: 'Leadership-focused with team impact metrics.', layout: 'single-column', _idx: 6, _preset: 'executive' },

  // Renderer template entries (must match IDs in features/resume-editor/templates/types.ts)
  { id: 'sidebar', name: 'Sidebar', description: 'Left sidebar with contact and skills. Clean main area.', layout: 'sidebar', _idx: 0, _preset: 'editorial' },
  { id: 'bold', name: 'Bold', description: 'Top accent stripe with badge headings. Creative and impactful.', layout: 'single-column', _idx: 4, _preset: 'bold' },
  { id: 'tech', name: 'Tech', description: 'Clean two-column for engineering roles.', layout: 'two-column', _idx: 4, _preset: 'sharp' },

  // New unique templates
  { id: 'charter', name: 'Charter', description: 'Dark header block, serif, small-caps headings.', layout: 'single-column', _idx: 1, _preset: 'charter' },
  { id: 'prestige', name: 'Prestige', description: 'Centered-line header with check bullets, airy sidebar.', layout: 'sidebar', _idx: 3, _preset: 'prestige' },
  { id: 'engineer', name: 'Engineer', description: 'Monospace two-column with badge headings.', layout: 'two-column', _idx: 4, _preset: 'engineer' },
  { id: 'contemporary', name: 'Contemporary', description: 'Top-stripe header, left-bar sections, airy.', layout: 'two-column', _idx: 2, _preset: 'contemporary' },
  { id: 'folio', name: 'Folio', description: 'Left-accent headings, display font, clean.', layout: 'single-column', _idx: 7, _preset: 'folio' },
]

export const TEMPLATES: ResumeTemplate[] = TEMPLATE_DEFS.map((def) => ({
  id: def.id,
  name: def.name,
  description: def.description,
  layout: def.layout,
  preview: pickPreview(def.layout, def._idx),
  style: STYLE_PRESETS[def._preset] || STYLE_PRESETS.clean,
}))

export const TEMPLATE_STYLES: Record<string, TemplateStyle> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t.style]),
)

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
  { id: 'wine', name: 'Wine', primary: '#831843' },
  { id: 'forest', name: 'Forest', primary: '#166534' },
  { id: 'coral', name: 'Coral', primary: '#BE123C' },
  { id: 'violet', name: 'Violet', primary: '#6D28D9' },
  { id: 'stone', name: 'Stone', primary: '#57534E' },
]
