import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SAMPLE_DATA = {
  name: 'Alex Johnson',
  summary:
    'Experienced software engineer with expertise in React, Node.js, and cloud architecture.',
  contact: {
    email: 'alex@example.com',
    phone: '(555) 123-4567',
    location: 'San Francisco, CA',
  },
  experience: [
    {
      company: 'TechCorp',
      title: 'Senior Software Engineer',
      startDate: '2021-01',
      endDate: '',
      current: true,
      bullets: [
        'Led development of microservices platform',
        'Reduced deployment time by 60%',
        'Mentored team of 5 engineers',
      ],
    },
    {
      company: 'StartupXYZ',
      title: 'Software Engineer',
      startDate: '2018-06',
      endDate: '2020-12',
      current: false,
      bullets: [
        'Built MVP from scratch',
        'Implemented CI/CD pipeline',
        'Achieved 95% test coverage',
      ],
    },
  ],
  education: [
    {
      institution: 'Stanford University',
      degree: 'BS',
      field: 'Computer Science',
      startDate: '2014-09',
      endDate: '2018-05',
      gpa: '3.8',
    },
  ],
  skills: [
    { name: 'React', category: 'Frontend' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'TypeScript', category: 'Languages' },
    { name: 'Python', category: 'Languages' },
    { name: 'AWS', category: 'Cloud' },
    { name: 'Docker', category: 'DevOps' },
  ],
  certifications: [
    { name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2022-03' },
  ],
  languages: ['English', 'Spanish'],
  links: [
    { title: 'GitHub', url: 'github.com/alexjohnson' },
    { title: 'LinkedIn', url: 'linkedin.com/in/alexjohnson' },
  ],
  sectionOrder: [
    'summary',
    'experience',
    'education',
    'skills',
    'certifications',
    'languages',
    'links',
  ],
};

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  async generateAll(
    clientUrl: string = 'http://localhost:5173',
  ): Promise<string[]> {
    const browser = await chromium.launch({
      channel: 'chromium',
      headless: true,
    });
    const page = await browser.newPage({
      viewport: { width: 800, height: 1100 },
    });

    const templateIds = [
      'ledger',
      'meridian',
      'foundry',
      'almanac',
      'bureau',
      'ironclad',
      'northline',
      'plainscript',
      'halcyon',
      'driftwood',
      'paperwhite',
      'fieldnote',
      'vellum',
      'meridian-split',
      'compass',
      'skyline',
      'atlas',
      'harbor',
      'boardroom',
      'summit',
      'chairman',
      'monarch',
      'statesman',
      'prism',
      'canvas-bold',
      'studio',
      'palette',
      'kinetic',
      'terminal',
      'commit',
      'syntax',
      'kernel',
      'stack',
      'thesis',
      'faculty',
      'curriculum',
      'archive',
      'portrait',
      'frame',
      'profile-card',
    ];

    const outputDir = path.join(process.cwd(), 'public', 'thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const generated: string[] = [];

    for (const templateId of templateIds) {
      try {
        const url = `${clientUrl}/thumbnails?template=${templateId}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1000);

        const screenshot = await page.screenshot({ type: 'png' });
        const filePath = path.join(outputDir, `${templateId}.png`);
        fs.writeFileSync(filePath, screenshot);
        generated.push(templateId);
        this.logger.log(`Generated thumbnail: ${templateId}`);
      } catch (error) {
        this.logger.error(`Failed thumbnail ${templateId}: ${error}`);
      }
    }

    await browser.close();
    return generated;
  }
}
