import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import type { ApplyField } from '../schemas/apply-submission.schema';
import type { FillResult } from './greenhouse.adapter';

@Injectable()
export class WorkdayAdapter {
  private readonly logger = new Logger(WorkdayAdapter.name);

  async fillApplication(
    applicationUrl: string,
    resumeUrl: string,
    coverLetterContent?: string,
    userData?: {
      fullName?: string;
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      website?: string;
      githubUrl?: string;
    },
  ): Promise<FillResult> {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(applicationUrl, { waitUntil: 'networkidle', timeout: 30000 });

      const fields: ApplyField[] = [];
      const screeningQuestions: { question: string; inputType: string }[] = [];

      // Workday may have an "Apply" or "Start" button to click first
      const startButton = await page.$('button[aria-label*="Apply"], button[data-automation-id*="apply"], button:has-text("Apply"), button:has-text("Start")');
      if (startButton) {
        await startButton.click();
        await page.waitForTimeout(2000);
      }

      await page.waitForSelector('input[name], .wd-form, [data-automation-id]', { timeout: 15000 }).catch(() => {});

      // Full name
      if (userData?.fullName) {
        const nameParts = userData.fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const filledFirst = await this.fillField(page, firstName, [
          'input[data-automation-id*="firstName"]',
          'input[name*="first" i]',
          'input[aria-label*="first" i]',
        ]);
        if (filledFirst) fields.push({ fieldName: 'first_name', fieldValue: firstName, autoFilled: true, editable: true });

        const filledLast = await this.fillField(page, lastName, [
          'input[data-automation-id*="lastName"]',
          'input[name*="last" i]',
          'input[aria-label*="last" i]',
        ]);
        if (filledLast) fields.push({ fieldName: 'last_name', fieldValue: lastName, autoFilled: true, editable: true });
      }

      // Email
      if (userData?.email) {
        const filled = await this.fillField(page, userData.email, [
          'input[data-automation-id*="email"]',
          'input[name*="email" i]',
          'input[type="email"]',
        ]);
        if (filled) fields.push({ fieldName: 'email', fieldValue: userData.email, autoFilled: true, editable: true });
      }

      // Phone
      if (userData?.phone) {
        const filled = await this.fillField(page, userData.phone, [
          'input[data-automation-id*="phone"]',
          'input[name*="phone" i]',
          'input[aria-label*="phone" i]',
        ]);
        if (filled) fields.push({ fieldName: 'phone', fieldValue: userData.phone, autoFilled: true, editable: true });
      }

      // LinkedIn
      if (userData?.linkedinUrl) {
        const filled = await this.fillField(page, userData.linkedinUrl, [
          'input[data-automation-id*="linkedIn"]',
          'input[name*="linked" i]',
          'input[aria-label*="linked" i]',
        ]);
        if (filled) fields.push({ fieldName: 'linkedin_url', fieldValue: userData.linkedinUrl, autoFilled: true, editable: true });
      }

      // Resume upload
      if (resumeUrl) {
        try {
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) {
            await fileInput.setInputFiles(resumeUrl);
            fields.push({ fieldName: 'resume', fieldValue: resumeUrl, autoFilled: true, editable: false });
          }
        } catch {
          this.logger.debug('Resume upload field not found');
        }
      }

      // Cover letter
      if (coverLetterContent) {
        const filled = await this.fillField(page, coverLetterContent, [
          'textarea[data-automation-id*="cover"]',
          'textarea[name*="cover" i]',
          'textarea[aria-label*="cover" i]',
        ]);
        if (filled) fields.push({ fieldName: 'cover_letter', fieldValue: coverLetterContent, autoFilled: true, editable: true });
      }

      // Detect screening questions
      const questionEls = await page.$$('[data-automation-id*="question"], .wd-question, .form-group, label, [class*="question"]');
      for (const el of questionEls) {
        const text = await el.textContent().catch(() => '');
        if (text && text.trim().length > 5) {
          const selectInside = await el.$('select').catch(() => null);
          const inputInside = await el.$('input, textarea').catch(() => null);
          let inputType = 'text';
          if (selectInside) inputType = 'select';
          else if (inputInside) {
            inputType = await inputInside.getAttribute('type').catch(() => 'text') || 'text';
          }
          screeningQuestions.push({ question: text.trim().slice(0, 200), inputType });
        }
      }

      return { success: true, fields, screeningQuestions };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Workday fill failed: ${message}`);
      return { success: false, fields: [], screeningQuestions: [], error: message };
    } finally {
      if (browser) await browser.close();
    }
  }

  private async fillField(page: any, value: string, selectors: string[]): Promise<boolean> {
    for (const selector of selectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          await el.fill(value);
          await page.waitForTimeout(100);
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }
}
