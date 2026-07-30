import { Injectable, Logger } from '@nestjs/common';
import { chromium, Page } from 'playwright';
import type { ApplyField } from '../schemas/apply-submission.schema';

export interface FillResult {
  success: boolean;
  fields: ApplyField[];
  screeningQuestions: { question: string; inputType: string }[];
  error?: string;
}

@Injectable()
export class GreenhouseAdapter {
  private readonly logger = new Logger(GreenhouseAdapter.name);

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

      await page.waitForSelector('form', { timeout: 10000 }).catch(() => {});

      // Standard fields
      if (userData?.fullName) {
        const filled = await this.fillField(page, 'input#job_application_first_name', userData.fullName.split(' ')[0] || '');
        if (filled) fields.push({ fieldName: 'first_name', fieldValue: userData.fullName.split(' ')[0] || '', autoFilled: true, editable: true });
        const filledLast = await this.fillField(page, 'input#job_application_last_name', userData.fullName.split(' ').slice(1).join(' ') || '');
        if (filledLast) fields.push({ fieldName: 'last_name', fieldValue: userData.fullName.split(' ').slice(1).join(' ') || '', autoFilled: true, editable: true });
      }

      if (userData?.email) {
        const filled = await this.fillField(page, 'input#job_application_email', userData.email);
        if (filled) fields.push({ fieldName: 'email', fieldValue: userData.email, autoFilled: true, editable: true });
      }

      if (userData?.phone) {
        const filled = await this.fillField(page, 'input#job_application_phone', userData.phone);
        if (filled) fields.push({ fieldName: 'phone', fieldValue: userData.phone, autoFilled: true, editable: true });
      }

      if (userData?.linkedinUrl) {
        const filled = await this.fillField(page, 'input#job_application_linkedin_url', userData.linkedinUrl);
        if (filled) fields.push({ fieldName: 'linkedin_url', fieldValue: userData.linkedinUrl, autoFilled: true, editable: true });
      }

      if (userData?.website) {
        const filled = await this.fillField(page, 'input#job_application_website_url', userData.website);
        if (filled) fields.push({ fieldName: 'website_url', fieldValue: userData.website, autoFilled: true, editable: true });
      }

      // Resume upload
      if (resumeUrl) {
        try {
          const fileInput = await page.$('input#job_application_resume');
          if (fileInput) {
            await fileInput.setInputFiles(resumeUrl);
            fields.push({ fieldName: 'resume', fieldValue: resumeUrl, autoFilled: true, editable: false });
          }
        } catch {
          this.logger.debug('Resume upload field not found or failed');
        }
      }

      // Cover letter
      if (coverLetterContent) {
        try {
          const clInput = await page.$('textarea#job_application_cover_letter');
          if (clInput) {
            await clInput.fill(coverLetterContent);
            fields.push({ fieldName: 'cover_letter', fieldValue: coverLetterContent, autoFilled: true, editable: true });
          }
        } catch {
          this.logger.debug('Cover letter textarea not found');
        }
      }

      // Detect screening questions
      const questionElements = await page.$$('.application-question, .field, .form-group, [class*="question"]');
      for (const el of questionElements) {
        const text = await el.textContent().catch(() => '');
        if (text && text.trim().length > 5 && !text.includes('First Name') && !text.includes('Last Name')) {
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
      this.logger.error(`Greenhouse fill failed: ${message}`);
      return { success: false, fields: [], screeningQuestions: [], error: message };
    } finally {
      if (browser) await browser.close();
    }
  }

  async submitApplication(page: Page): Promise<boolean> {
    try {
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], .submit-button, #submit_app');
      if (!submitBtn) return false;
      await submitBtn.click();
      await page.waitForTimeout(3000);
      return true;
    } catch {
      return false;
    }
  }

  private async fillField(page: Page, selector: string, value: string): Promise<boolean> {
    try {
      const el = await page.$(selector);
      if (!el) return false;
      await el.fill(value);
      await page.waitForTimeout(100);
      return true;
    } catch {
      return false;
    }
  }
}
