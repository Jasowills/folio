import type { Resume } from '../../../lib/queries'
import type { LocalData, DesignSettings, SkillEntry, CertificationEntry, LinkEntry } from '../../../pages/editor/types'
import { DEFAULT_DESIGN } from '../../../pages/editor/types'

export const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'links']

export function getSampleLocalData(): LocalData {
  return {
    title: 'Software Engineer',
    name: 'Your Name',
    summary: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.',
    contact: { email: 'no_reply@example.com', phone: '(123) 456-7890', location: 'Your City, ST 12345' },
    experience: [
      { company: 'Company, Location', title: 'Job Title', startDate: 'MONTH 20XX', endDate: 'Present', current: true, bullets: ['Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh.', 'Sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna.'] },
      { company: 'Company, Location', title: 'Job Title', startDate: 'MONTH 20XX', endDate: 'MONTH 20XX', current: false, bullets: ['Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh.'] },
      { company: 'Company, Location', title: 'Job Title', startDate: 'MONTH 20XX', endDate: 'MONTH 20XX', current: false, bullets: ['Lorem ipsum dolor sit amet, consectetuer adipiscing elit.'] },
    ],
    education: [
      { institution: 'School Name, Location', degree: 'Degree', field: 'Field of Study', startDate: 'MONTH 20XX', endDate: 'MONTH 20XX' },
      { institution: 'School Name, Location', degree: 'Degree', field: 'Field of Study', startDate: 'MONTH 20XX', endDate: 'MONTH 20XX' },
    ],
    skills: [
      { name: 'Lorem ipsum dolor sit amet' },
      { name: 'Consectetuer adipiscing elit' },
      { name: 'Sed diam nonummy nibh euismod' },
      { name: 'Laoreet dolore magna aliquam' },
    ],
    certifications: [
      { name: 'Lorem ipsum dolor sit amet', issuer: 'Consectetuer adipiscing', date: '20XX' },
      { name: 'Sed diam nonummy nibh', issuer: 'Euismod tincidunt', date: '20XX' },
    ],
    languages: ['Lorem ipsum', 'Dolor sit amet', 'Consectetuer adipiscing elit'],
    links: [
      { title: 'LinkedIn', url: 'linkedin.com/in/yourname' },
      { title: 'Portfolio', url: 'yourname.dev' },
    ],
    customSections: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    design: { ...DEFAULT_DESIGN },
    editMode: 'guided',
  }
}

export function getDefaultLocalData(): LocalData {
  return {
    title: '',
    name: '',
    summary: '',
    contact: { email: '', phone: '', location: '' },
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    links: [],
    customSections: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    design: { ...DEFAULT_DESIGN },
    editMode: 'guided',
  }
}

export function resumeToLocalData(
  resume: Resume,
  savedDesign?: DesignSettings,
  savedSectionOrder?: string[],
): LocalData {
  const design = savedDesign || DEFAULT_DESIGN
  const skills: SkillEntry[] = (resume.skills || []).map(s =>
    typeof s === 'string' ? { name: s } : s,
  )
  const certifications: CertificationEntry[] = (resume.certifications || []).map(c => ({
    name: c.name,
    issuer: c.issuer || '',
    date: c.date,
  }))
  const links: LinkEntry[] = (resume.links || []).map(l => ({
    title: l.title || '',
    url: l.url,
  }))
  const sectionOrder = savedSectionOrder || buildSectionOrder(resume)

  return {
    title: resume.title || '',
    name: resume.name || '',
    summary: resume.summary || '',
    contact: {
      email: resume.contact?.email || '',
      phone: resume.contact?.phone || '',
      location: resume.contact?.location || '',
      linkedin: resume.contact?.linkedin,
      website: resume.contact?.website,
      github: resume.contact?.github,
    },
    experience: (resume.experience || []).map(e => ({
      company: e.company,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      bullets: e.bullets || [''],
    })),
    education: (resume.education || []).map(e => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field || '',
      startDate: e.startDate,
      endDate: e.endDate,
      gpa: e.gpa,
    })),
    skills,
    certifications,
    languages: resume.languages || [],
    links,
    customSections: [],
    sectionOrder,
    design: { ...design },
    editMode: 'guided',
  }
}

export function localDataToResumeUpdates(local: LocalData): Record<string, unknown> {
  return {
    title: local.title,
    name: local.name,
    summary: local.summary,
    contact: local.contact,
    experience: local.experience,
    education: local.education,
    skills: local.skills.map(s => s.name),
    certifications: local.certifications,
    languages: local.languages,
    links: local.links,
    sectionOrder: local.sectionOrder,
    design: local.design,
  }
}

function buildSectionOrder(resume: Resume): string[] {
  const order: string[] = []
  if (resume.summary) order.push('summary')
  if (resume.experience?.length) order.push('experience')
  if (resume.education?.length) order.push('education')
  if (resume.skills?.length) order.push('skills')
  if (resume.certifications?.length) order.push('certifications')
  if (resume.languages?.length) order.push('languages')
  if (resume.links?.length) order.push('links')
  return order.length ? order : [...DEFAULT_SECTION_ORDER]
}
