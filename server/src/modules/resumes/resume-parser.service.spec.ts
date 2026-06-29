import { ResumeParserService } from './resume-parser.service';

describe('ResumeParserService', () => {
  let service: ResumeParserService;

  beforeEach(() => {
    service = new ResumeParserService();
  });

  describe('assessQuality', () => {
    it('returns high score for quality text', () => {
      const text =
        'John Doe\njohn@example.com\n\nExperience\nEngineer at Acme 2020-2023\nDid things';
      const result = service.assessQuality(text, 1);
      expect(result.score).toBeGreaterThanOrEqual(0.6);
      expect(result.requiresFallback).toBe(false);
    });

    it('deducts for low text density', () => {
      const text = 'Hi';
      const result = service.assessQuality(text, 1);
      expect(result.score).toBeLessThan(0.6);
      expect(result.issues).toContain('low-text-density');
    });

    it('deducts for moderate non-ASCII ratio', () => {
      const text = '①②③④⑤⑥⑦⑧⑨⑩⑪' + 'a'.repeat(100) + '\n'.repeat(10) + 'john@example.com 2023';
      const result = service.assessQuality(text, 1);
      expect(result.issues).toContain('moderate-non-ascii');
    });

    it('deducts for repetition artifacts', () => {
      const text = 'aaaaaaa bbbbbbb ccccccc ddddddd eeeeeee fffffff\n'.repeat(5) + 'john@example.com 2023';
      const result = service.assessQuality(text, 1);
      expect(result.issues).toContain('repetition-artifacts');
    });

    it('deducts for missing email', () => {
      const text = 'Just some text without an email address 2023\n'.repeat(10);
      const result = service.assessQuality(text, 1);
      expect(result.issues).toContain('missing-email');
    });

    it('marks requiresFallback when score < 0.6', () => {
      const text = 'short';
      const result = service.assessQuality(text, 1);
      expect(result.requiresFallback).toBe(true);
    });
  });

  describe('detectSections', () => {
    it('detects standard resume sections', () => {
      const text = 'John Doe\njohn@example.com\n\nExperience\nEngineer at Acme\n2020-2023\n\nEducation\nMIT\nBSc 2016-2020\n\nSkills\nJavaScript, React';
      const result = service.detectSections(text);
      expect(result.sections.has('experience')).toBe(true);
      expect(result.sections.has('education')).toBe(true);
      expect(result.sections.has('skills')).toBe(true);
    });

    it('detects all-uppercase headings', () => {
      const text = 'Header\n\nEXPERIENCE\nEngineer\n\nEDUCATION\nMIT';
      const result = service.detectSections(text);
      expect(result.sections.has('experience')).toBe(true);
      expect(result.sections.has('education')).toBe(true);
    });

    it('creates unrecognized section for unknown heading', () => {
      const text = 'Name\n\nMy Custom Section\nSome content\n\nExperience\nJob';
      const result = service.detectSections(text);
      expect(result.unrecognized.length).toBeGreaterThanOrEqual(1);
    });

    it('assigns content to correct sections', () => {
      const text = 'Name\n\nExperience\nJob at Acme\n\nSkills\nPython';
      const result = service.detectSections(text);
      expect(result.sections.get('experience')).toContain('Job at Acme');
      expect(result.sections.get('skills')).toContain('Python');
    });

    it('calculates confidence based on found sections', () => {
      const text = 'Name\n\nExperience\nJob\n\nEducation\nSchool\n\nSkills\nJava\n\nSummary\nAbout me';
      const result = service.detectSections(text);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('returns low confidence with no sections', () => {
      const text = 'no real sections here just random text';
      const result = service.detectSections(text);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('parseContact', () => {
    it('extracts name from first line', () => {
      const result = service.parseContact('John Doe\njohn@example.com\n555-123-4567');
      expect(result.name).toBe('John Doe');
    });

    it('extracts email', () => {
      const result = service.parseContact('John Doe\njohn.doe@example.com');
      expect(result.email).toBe('john.doe@example.com');
    });

    it('extracts phone', () => {
      const result = service.parseContact('John Doe\njohn@example.com\n(555) 123-4567');
      expect(result.phone).toContain('555');
    });

    it('extracts LinkedIn URL', () => {
      const result = service.parseContact('John Doe\nlinkedin.com/in/johndoe');
      expect(result.linkedin).toBe('https://linkedin.com/in/johndoe');
    });

    it('extracts LinkedIn username pattern', () => {
      const result = service.parseContact('John Doe\nLinkedIn: johndoe');
      expect(result.linkedin).toBe('https://linkedin.com/in/johndoe');
    });

    it('extracts GitHub URL', () => {
      const result = service.parseContact('John Doe\ngithub.com/johndoe');
      expect(result.github).toBe('https://github.com/johndoe');
    });

    it('extracts website URL', () => {
      const result = service.parseContact('John Doe\nhttps://portfolio.dev');
      expect(result.website).toBe('https://portfolio.dev');
    });

    it('extracts bare domain website', () => {
      const result = service.parseContact('John Doe\nmyportfolio.vercel.app');
      expect(result.website).toBe('https://myportfolio.vercel.app');
    });

    it('extracts location (City, ST)', () => {
      const result = service.parseContact('John Doe\nSan Francisco, CA\njohn@example.com');
      expect(result.location).toBe('San Francisco, CA');
    });

    it('detects Remote location', () => {
      const result = service.parseContact('John Doe\nRemote');
      expect(result.location).toBe('Remote');
    });

    it('rejects name with email pattern', () => {
      const result = service.parseContact('admin@test.com\nadmin@test.com');
      expect(result.name).toBeNull();
    });

    it('excludes linkedin from website results', () => {
      const result = service.parseContact('John Doe\nhttps://linkedin.com/in/johndoe\nhttps://portfolio.dev');
      expect(result.website).toBe('https://portfolio.dev');
    });
  });

  describe('parseSummary', () => {
    it('returns null for empty section', () => {
      const sections = new Map<string, string>();
      expect(service['parseSummary'](sections)).toBeNull();
    });

    it('returns null for too-short content', () => {
      const sections = new Map<string, string>([['summary', 'short']]);
      expect(service['parseSummary'](sections)).toBeNull();
    });

    it('extracts and cleans summary content', () => {
      const summaryText = 'Professional Summary\nA highly skilled engineer with 10 years of experience in backend development.';
      const sections = new Map<string, string>([['summary', summaryText]]);
      const result = service['parseSummary'](sections);
      expect(result).toContain('highly skilled engineer');
      expect(result).not.toContain('Professional Summary');
    });
  });

  describe('parseExperience', () => {
    function makeSections(experienceText: string): Map<string, string> {
      const sections = new Map<string, string>();
      sections.set('experience', experienceText);
      return sections;
    }

    it('parses a simple job entry', () => {
      const text = 'Software Engineer at Acme Corp | 2020-2023\n- Built features\n- Fixed bugs';
      const result = service['parseExperience'](makeSections(text));
      expect(result.length).toBe(1);
      expect(result[0].title).toContain('Software Engineer');
      expect(result[0].company).toContain('Acme Corp');
    });

    it('parses multiple job entries', () => {
      const text = 'Senior Engineer at Company A | 2022-2023\n- Did X\n\nJunior Engineer at Company B | 2020-2022\n- Did Y';
      const result = service['parseExperience'](makeSections(text));
      expect(result.length).toBe(2);
    });

    it('collects bullet points', () => {
      const text = 'Engineer at Co | 2020-2023\n- Built a thing\n- Fixed another thing\n- Led a team';
      const result = service['parseExperience'](makeSections(text));
      expect(result[0].bullets.length).toBeGreaterThanOrEqual(2);
    });

    it('handles title-only lines followed by date line', () => {
      const text = 'Software Engineer\n2020-2023\n- Did work\n\nData Scientist\n2018-2020\n- Analyzed data';
      const result = service['parseExperience'](makeSections(text));
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('handles Present as current position', () => {
      const text = 'Engineer at Co | 2022-Present\n- Current work';
      const result = service['parseExperience'](makeSections(text));
      expect(result[0].current).toBe(true);
    });

    it('merges projects section into experience', () => {
      const sections = new Map<string, string>();
      sections.set('experience', 'Engineer at Co | 2020-2023\n- Work');
      sections.set('projects', 'Side Project | 2022\n- Built X');
      const result = service['parseExperience'](sections);
      expect(result.length).toBe(2);
    });

    it('returns empty array for no content', () => {
      const result = service['parseExperience'](new Map());
      expect(result).toEqual([]);
    });
  });

  describe('parseEducation', () => {
    function makeSections(educationText: string): Map<string, string> {
      const sections = new Map<string, string>();
      sections.set('education', educationText);
      return sections;
    }

    it('parses institution and degree', () => {
      const text = 'Massachusetts Institute of Technology\nBachelor of Science in Computer Science, 2016-2020';
      const result = service['parseEducation'](makeSections(text));
      expect(result.length).toBe(1);
      expect(result[0].institution).toContain('Massachusetts Institute of Technology');
      expect(result[0].degree).toBeTruthy();
    });

    it('parses degree on separate line', () => {
      const text = 'Stanford University\nBSc Computer Science\n2018-2022\nGPA 3.8';
      const result = service['parseEducation'](makeSections(text));
      expect(result.length).toBe(1);
      expect(result[0].institution).toContain('Stanford');
      expect(result[0].degree).toBe('BSc');
    });

    it('extracts GPA', () => {
      const text = 'MIT\nBSc\n2016-2020\nGPA: 3.9';
      const result = service['parseEducation'](makeSections(text));
      expect(result[0].gpa).toBe('3.9');
    });

    it('returns empty array for empty sections', () => {
      const result = service['parseEducation'](new Map());
      expect(result).toEqual([]);
    });
  });

  describe('parseSkills', () => {
    function makeSections(skillsText: string): Map<string, string> {
      const sections = new Map<string, string>();
      sections.set('skills', skillsText);
      return sections;
    }

    it('parses comma-separated skills', () => {
      const text = 'JavaScript, TypeScript, React, Node.js';
      const result = service['parseSkills'](makeSections(text));
      expect(result).toContain('JavaScript');
      expect(result).toContain('TypeScript');
      expect(result).toContain('React');
      expect(result).toContain('Node.js');
    });

    it('strips category labels', () => {
      const text = 'Languages: JavaScript, Python\nFrontend: React, CSS';
      const result = service['parseSkills'](makeSections(text));
      expect(result).toContain('JavaScript');
      expect(result).toContain('React');
    });

    it('normalizes skill names via dictionary', () => {
      const text = 'javascript, nodejs, aws, react';
      const result = service['parseSkills'](makeSections(text));
      expect(result).toContain('JavaScript');
      expect(result).toContain('Node.js');
      expect(result).toContain('AWS');
    });

    it('deduplicates skills', () => {
      const text = 'JavaScript, javascript, JS';
      const result = service['parseSkills'](makeSections(text));
      const jsCount = result.filter(s => s.toLowerCase() === 'javascript').length;
      expect(jsCount).toBeLessThanOrEqual(1);
    });

    it('returns empty array for empty content', () => {
      const result = service['parseSkills'](new Map());
      expect(result).toEqual([]);
    });
  });

  describe('parseCertifications', () => {
    function makeSections(certsText: string): Map<string, string> {
      const sections = new Map<string, string>();
      sections.set('certifications', certsText);
      return sections;
    }

    it('parses certification with known issuer', () => {
      const text = 'AWS Solutions Architect – AWS 2023';
      const result = service['parseCertifications'](makeSections(text));
      expect(result.length).toBe(1);
      expect(result[0].name).toContain('Solutions Architect');
      expect(result[0].issuer).toMatch(/AWS/i);
    });

    it('parses certification with separated issuer', () => {
      const text = 'Certified Kubernetes Administrator issued by CNCF';
      const result = service['parseCertifications'](makeSections(text));
      expect(result.length).toBe(1);
      expect(result[0].name).toBeTruthy();
    });

    it('extracts year from certification', () => {
      const text = 'PMP – PMI 2022';
      const result = service['parseCertifications'](makeSections(text));
      expect(result[0].date).toBe('2022');
    });

    it('returns empty array for empty content', () => {
      const result = service['parseCertifications'](new Map());
      expect(result).toEqual([]);
    });
  });

  describe('parseLanguages', () => {
    function makeSections(langsText: string): Map<string, string> {
      const sections = new Map<string, string>();
      sections.set('languages', langsText);
      return sections;
    }

    it('parses language with proficiency', () => {
      const text = 'English (Native), Spanish (Fluent)';
      const result = service['parseLanguages'](makeSections(text));
      expect(result.some(l => l.language.toLowerCase() === 'english')).toBe(true);
      expect(result.some(l => l.language.toLowerCase() === 'spanish')).toBe(true);
    });

    it('assigns proficiency level', () => {
      const text = 'French (Native)';
      const result = service['parseLanguages'](makeSections(text));
      expect(result[0].proficiency).toBeTruthy();
    });

    it('deduplicates languages', () => {
      const text = 'English, English';
      const result = service['parseLanguages'](makeSections(text));
      const enCount = result.filter(l => l.language.toLowerCase() === 'english').length;
      expect(enCount).toBe(1);
    });

    it('returns empty array for empty content', () => {
      const result = service['parseLanguages'](new Map());
      expect(result).toEqual([]);
    });
  });

  describe('parse (full pipeline)', () => {
    it('parses a complete resume and returns ParsedResume', async () => {
      const rawText = [
        'John Doe',
        'john@example.com',
        'San Francisco, CA',
        '',
        'Summary',
        'Experienced software engineer with 5 years in full-stack development.',
        '',
        'Experience',
        'Senior Engineer at Acme Corp | 2020-2023',
        '- Led a team of 5 engineers',
        '- Built microservices architecture',
        '- Improved CI/CD pipeline',
        '',
        'Education',
        'MIT',
        'BSc Computer Science',
        '2016-2020',
        '',
        'Skills',
        'JavaScript, TypeScript, React, Node.js, Python, AWS',
        '',
        'Certifications',
        'AWS Solutions Architect – AWS 2022',
        '',
        'Languages',
        'English (Native)',
      ].join('\n');

      const result = await service.parse(rawText);
      expect(result.isResume).toBe(true);
      expect(result.name).toBe('John Doe');
      expect(result.contact.email).toBe('john@example.com');
      expect(result.contact.location).toBe('San Francisco, CA');
      expect(result.summary).toContain('Experienced software engineer');
      expect(result.experience.length).toBeGreaterThanOrEqual(1);
      expect(result.education.length).toBeGreaterThanOrEqual(1);
      expect(result.skills.length).toBeGreaterThanOrEqual(3);
      expect(result.certifications.length).toBeGreaterThanOrEqual(1);
      expect(result.languages.length).toBeGreaterThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('returns isResume=false for text that is not a resume', async () => {
      const result = await service.parse('');
      expect(result.isResume).toBe(false);
    });
  });

  describe('fuzzyMatch and levenshtein', () => {
    it('exact match returns true', () => {
      expect(service['fuzzyMatch']('experience', 'experience', 2)).toBe(true);
    });

    it('close match returns true', () => {
      expect(service['fuzzyMatch']('experiance', 'experience', 2)).toBe(true);
    });

    it('distant match returns false', () => {
      expect(service['fuzzyMatch']('abcdefgh', 'experience', 2)).toBe(false);
    });

    it('levenshtein distance is correct', () => {
      expect(service['levenshtein']('kitten', 'sitten')).toBe(1);
      expect(service['levenshtein']('kitten', 'sitting')).toBe(3);
      expect(service['levenshtein']('', 'abc')).toBe(3);
    });
  });

  describe('matchDegree', () => {
    it('recognizes BSc', () => {
      expect(service['matchDegree']('BSc Computer Science')).toBe('BSc');
    });

    it('recognizes Bachelor of Science', () => {
      expect(service['matchDegree']('Bachelor of Science in Engineering')).toBe('BSc');
    });

    it('recognizes MBA', () => {
      expect(service['matchDegree']('Master of Business Administration')).toBe('MBA');
    });

    it('recognizes PhD', () => {
      expect(service['matchDegree']('PhD in Physics')).toBe('PhD');
    });

    it('returns null for non-degree text', () => {
      expect(service['matchDegree']('Some random text')).toBeNull();
    });
  });

  describe('matchInstitution', () => {
    it('matches university in text', () => {
      const result = service['matchInstitution']('Massachusetts Institute of Technology');
      expect(result).toContain('Massachusetts Institute of Technology');
    });

    it('matches standalone abbreviation', () => {
      expect(service['matchInstitution']('MIT')).toBe('MIT');
      expect(service['matchInstitution']('Stanford University')).toContain('Stanford');
    });

    it('returns null for irrelevant text', () => {
      expect(service['matchInstitution']('Just a job title')).toBeNull();
    });
  });

  describe('matchesTitleKeyword', () => {
    it('matches common title words', () => {
      expect(service['matchesTitleKeyword']('Software Engineer')).toBe(true);
      expect(service['matchesTitleKeyword']('Product Manager')).toBe(true);
      expect(service['matchesTitleKeyword']('Data Analyst')).toBe(true);
    });

    it('does not match non-title text', () => {
      expect(service['matchesTitleKeyword']('The quick brown fox')).toBe(false);
    });
  });

  describe('looksLikeJobEntry', () => {
    it('identifies job entry lines', () => {
      expect(service['looksLikeJobEntry']('Software Engineer at Acme 2020')).toBe(true);
      expect(service['looksLikeJobEntry']('Senior Manager | 2022-2023')).toBe(true);
    });

    it('rejects bullet points', () => {
      expect(service['looksLikeJobEntry']('- Built a feature')).toBe(false);
    });
  });
});
