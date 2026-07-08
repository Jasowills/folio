import type { LocalData } from '../pages/editor/types'

export const SVG_TXT = {
  name: 'Alex Johnson',
  contact: 'alex@email.com  |  +44 7700 900123  |  London, UK',

  exp: 'EXPERIENCE',
  e1_t: 'Senior Product Designer',
  e1_c: 'Acme Corp, London',
  e1_d: 'Jan 2021 \u2014 Present',
  e1_b: 'Led redesign of core product interface, improving satisfaction by 35%',
  e1_b2: 'Built and maintained design system used by 12 product teams',
  e2_t: 'Product Designer',
  e2_c: 'Beta Labs, Manchester',
  e2_d: 'Jun 2018 \u2014 Dec 2020',
  e2_b: 'Designed and shipped 8 major features serving 100K+ users',

  edu: 'EDUCATION',
  edu1_s: 'University of Manchester',
  edu1_d: 'BSc Computer Science',
  edu1_da: '2014 \u2014 2018',

  skills: 'SKILLS',
  s1: 'Figma',
  s2: 'React',
  s3: 'Prototyping',
  s4: 'Design Systems',
  s5: 'User Research',
  s6: 'TypeScript',

  langs: 'LANGUAGES',
  l1: 'English  \u00b7  French (Professional)',
}

export function createBoilerplateLocalData(): LocalData {
  return {
    title: 'Senior Product Designer',
    name: 'Alex Johnson',
    summary: 'Product designer with 6 years of experience crafting user-centered digital products. Specialising in design systems, interaction design, and usability testing across web and mobile platforms.',
    contact: { email: 'alex@email.com', phone: '+44 7700 900123', location: 'London, UK', linkedin: 'linkedin.com/in/alexjohnson', website: 'alexjohnson.design' },
    experience: [
      {
        company: 'Acme Corp, London',
        title: 'Senior Product Designer',
        startDate: 'Jan 2021',
        endDate: 'Present',
        current: true,
        bullets: [
          'Led redesign of core product interface, improving user satisfaction scores by 35% and reducing support tickets by 28%',
          'Built and maintained a comprehensive design system used by 12 product teams across 3 product lines',
          'Conducted 50+ user research sessions and usability tests, translating findings into actionable product improvements',
        ],
      },
      {
        company: 'Beta Labs, Manchester',
        title: 'Product Designer',
        startDate: 'Jun 2018',
        endDate: 'Dec 2020',
        current: false,
        bullets: [
          'Designed and shipped 8 major product features from concept to launch, serving 100K+ monthly active users',
          'Established UX research practice including A/B testing framework, increasing conversion by 22%',
        ],
      },
    ],
    education: [
      {
        institution: 'University of Manchester',
        degree: 'BSc',
        field: 'Computer Science',
        startDate: '2014',
        endDate: '2018',
      },
    ],
    skills: [
      { name: 'Figma' },
      { name: 'React' },
      { name: 'Prototyping' },
      { name: 'User Research' },
      { name: 'Design Systems' },
      { name: 'Usability Testing' },
      { name: 'TypeScript' },
    ],
    certifications: [
      { name: 'Advanced UX Design', issuer: 'Google', date: '2022' },
    ],
    languages: ['English', 'French (Professional)'],
    links: [
      { title: 'LinkedIn', url: 'linkedin.com/in/alexjohnson' },
      { title: 'Portfolio', url: 'alexjohnson.design' },
    ],
    customSections: [],
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'certifications', 'languages', 'links'],
    design: {
      headingFont: 'DM Serif Display',
      bodyFont: 'Plus Jakarta Sans',
      bodyFontSize: 10,
      lineSpacing: 1.5,
      primaryColor: '#0F6E56',
      secondaryColor: '#475569',
      columnLayout: 'single-column',
      margins: 3,
      sectionSpacing: 3,
    },
    editMode: 'guided',
  }
}

export const BOILERPLATE_LOCAL_DATA = createBoilerplateLocalData()
