import { Injectable, Logger } from '@nestjs/common';
import { chromium, Page } from 'playwright';
import type { ApplyField } from '../schemas/apply-submission.schema';
import type { FillResult } from './greenhouse.adapter';

@Injectable()
export class LeverAdapter {
  private readonly logger = new Logger(LeverAdapter.name);

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

      // Lever uses a modal/panel for the application form
      // Look for "Apply for this job" button and click it
      const applyButton = await page.$('a[href*="apply"], button:has-text("Apply"), a:has-text("Apply for")');
      if (applyButton) {
        await applyButton.click();
        await page.waitForTimeout(2000);
      }

      await page.waitForSelector('input[name="name"], input[placeholder*="Name"], .application-form', { timeout: 10000 }).catch(() => {});

      // Standard fields - Lever uses name-based selectors
      if (userData?.fullName) {
        const filled = await this.fillFieldByName(page, 'name', userData.fullName);
        if (filled) fields.push({ fieldName: 'full_name', fieldValue: userData.fullName, autoFilled: true, editable: true });
      }

      if (userData?.email) {
        const filled = await this.fillFieldByName(page, 'email', userData.email);
        if (filled) fields.push({ fieldName: 'email', fieldValue: userData.email, autoFilled: true, editable: true });
      }

      if (userData?.phone) {
        const filled = await this.fillFieldByName(page, 'phone', userData.phone);
        if (filled) fields.push({ fieldName: 'phone', fieldValue: userData.phone, autoFilled: true, editable: true });
      }

      if (userData?.linkedinUrl) {
        const filled = await this.fillFieldByName(page, 'linkedIn', userData.linkedinUrl);
        if (filled) fields.push({ fieldName: 'linkedin_url', fieldValue: userData.linkedinUrl, autoFilled: true, editable: true });
      }

      if (userData?.website) {
        const filled = await this.fillFieldByName(page, 'website', userData.website);
        if (filled) fields.push({ fieldName: 'website_url', fieldValue: userData.website, autoFilled: true, editable: true });
      }

      // Resume upload - Lever uses file input with name "resume"
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
        try {
          const clInput = await page.$('textarea[name*="cover"], textarea[placeholder*="cover"], textarea:not([name="name"])');
          if (clInput) {
            await clInput.fill(coverLetterContent);
            fields.push({ fieldName: 'cover_letter', fieldValue: coverLetterContent, autoFilled: true, editable: true });
          }
        } catch {
          this.logger.debug('Cover letter textarea not found');
        }
      }

      // Detect screening questions
      const questionEls = await page.$$('.application-question, .field, .form-group, [class*="question"], label');
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
      this.logger.error(`Lever fill failed: ${message}`);
      return { success: false, fields: [], screeningQuestions: [], error: message };
    } finally {
      if (browser) await browser.close();
    }
  }

  async submitApplication(page: Page): Promise<boolean> {
    try {
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")');
      if (!submitBtn) return false;
      await submitBtn.click();
      await page.waitForTimeout(3000);
      return true;
    } catch {
      return false;
    }
  }

  private async fillFieldByName(page: Page, name: string, value: string): Promise<boolean> {
    try {
      const el = await page.$(`input[name="${name}"], input[placeholder*="${name}" i]`);
      if (!el) return false;
      await el.fill(value);
      await page.waitForTimeout(100);
      return true;
    } catch {
      return false;
    }
  }
}
