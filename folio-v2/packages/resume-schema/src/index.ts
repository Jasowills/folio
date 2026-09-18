import { z } from 'zod';

/**
 * Canonical resume JSON schema for Folio v2.
 * Merged from Folio Cloud's richest client type
 * (`client/src/pages/editor/types.ts` LocalData) and the persisted
 * server shape (`server/src/modules/resumes/schemas/resume.schema.ts`).
 *
 * Canonical decisions (documented mismatches in Cloud):
 * - skills are SkillEntry[] ({ name, category?, proficiency? }); the
 *   server's string[] form is a lossy projection — bridge with
 *   `s.name` when talking to Cloud APIs (see resumeBridge.ts).
 * - languages are plain string[] (Cloud's ParsedResume variant with
 *   { language, proficiency } is ingest-only, not canonical).
 */

export const SkillEntrySchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  proficiency: z.string().optional(),
});
export type SkillEntry = z.infer<typeof SkillEntrySchema>;

export const ContactSchema = z.object({
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  linkedin: z.string().default(''),
  website: z.string().default(''),
  github: z.string().default(''),
  photoUrl: z.string().default(''),
});
export type ResumeContact = z.infer<typeof ContactSchema>;

const EMPTY_CONTACT: ResumeContact = {
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  website: '',
  github: '',
  photoUrl: '',
};

export const ExperienceEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
});
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;

export const EducationEntrySchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  gpa: z.string().default(''),
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

export const CertificationEntrySchema = z.object({
  name: z.string(),
  issuer: z.string().default(''),
  date: z.string().default(''),
});
export type CertificationEntry = z.infer<typeof CertificationEntrySchema>;

export const LinkEntrySchema = z.object({
  title: z.string(),
  url: z.string(),
});
export type LinkEntry = z.infer<typeof LinkEntrySchema>;

export const CustomSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.array(z.string()).default([]),
  type: z.enum(['text', 'bullets']).default('bullets'),
});
export type CustomSection = z.infer<typeof CustomSectionSchema>;

export const ColumnLayoutSchema = z.enum([
  'single-column',
  'two-column',
  'sidebar-left',
  'sidebar-right',
  'header-band-plus-single',
  'asymmetric-grid',
]);
export type ColumnLayout = z.infer<typeof ColumnLayoutSchema>;

export const DesignSettingsSchema = z.object({
  headingFont: z.string().default('Inter'),
  bodyFont: z.string().default('Inter'),
  bodyFontSize: z.number().default(10),
  lineSpacing: z.number().default(1.4),
  primaryColor: z.string().default('#0f766e'),
  secondaryColor: z.string().default('#64748b'),
  columnLayout: ColumnLayoutSchema.default('single-column'),
  margins: z.string().default('0.6in'),
  sectionSpacing: z.string().default('0.35rem'),
});
export type DesignSettings = z.infer<typeof DesignSettingsSchema>;

const EMPTY_DESIGN: DesignSettings = {
  headingFont: 'Inter',
  bodyFont: 'Inter',
  bodyFontSize: 10,
  lineSpacing: 1.4,
  primaryColor: '#0f766e',
  secondaryColor: '#64748b',
  columnLayout: 'single-column',
  margins: '0.6in',
  sectionSpacing: '0.35rem',
};

const EMPTY_RESUME_INPUT = {
  title: 'Untitled Resume',
  name: '',
  summary: '',
  contact: EMPTY_CONTACT,
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  languages: [],
  links: [],
  customSections: [],
  sectionOrder: [
    'summary',
    'experience',
    'education',
    'skills',
    'certifications',
    'languages',
    'links',
  ],
  design: EMPTY_DESIGN,
  editMode: 'guided',
  templateId: 'ledger',
} as const;

export const ResumeDataSchema = z.object({
  title: z.string().default(EMPTY_RESUME_INPUT.title),
  name: z.string().default(''),
  summary: z.string().default(''),
  contact: ContactSchema.default(EMPTY_CONTACT),
  experience: z.array(ExperienceEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  skills: z.array(SkillEntrySchema).default([]),
  certifications: z.array(CertificationEntrySchema).default([]),
  languages: z.array(z.string()).default([]),
  links: z.array(LinkEntrySchema).default([]),
  customSections: z.array(CustomSectionSchema).default([]),
  sectionOrder: z.array(z.string()).default([...EMPTY_RESUME_INPUT.sectionOrder]),
  design: DesignSettingsSchema.default(EMPTY_DESIGN),
  editMode: z.enum(['guided', 'direct']).default('guided'),
  templateId: z.string().default('ledger'),
});
export type ResumeData = z.infer<typeof ResumeDataSchema>;

export function createEmptyResume(): ResumeData {
  return ResumeDataSchema.parse({});
}

export function parseResumeData(input: unknown): ResumeData {
  return ResumeDataSchema.parse(input);
}

export function safeParseResumeData(input: unknown) {
  return ResumeDataSchema.safeParse(input);
}
