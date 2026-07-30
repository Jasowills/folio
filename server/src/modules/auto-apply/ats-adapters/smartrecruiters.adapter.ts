import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import type { ApplyField } from '../schemas/apply-submission.schema';
import type { FillResult } from './greenhouse.adapter';

@Injectable()
export class SmartRecruitersAdapter {
  private readonly logger = new Logger(SmartRecruitersAdapter.name);

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

      // SmartRecruiters has an "Apply" button that opens a modal
      const applyBtn = await page.$('a[href*="apply"], button:has-text("Apply now"), button:has-text("Apply")');
      if (applyBtn) {
        await applyBtn.click();
        await page.waitForTimeout(2000);
      }

      await page.waitForSelector('input[name], form, [class*="application"]', { timeout: 10000 }).catch(() => {});

      // Full name
      if (userData?.fullName) {
        const filled = await this.fillFieldByName(page, 'fullName', userData.fullName);
        if (filled) fields.push({ fieldName: 'full_name', fieldValue: userData.fullName, autoFilled: true, editable: true });

        if (!filled) {
          const nameParts = userData.fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          const filledFirst = await this.fillFieldByName(page, 'firstName', firstName);
          if (filledFirst) fields.push({ fieldName: 'first_name', fieldValue: firstName, autoFilled: true, editable: true });
          const filledLast = await this.fillFieldByName(page, 'lastName', lastName);
          if (filledLast) fields.push({ fieldName: 'last_name', fieldValue: lastName, autoFilled: true, editable: true });
        }
      }

      // Email
      if (userData?.email) {
        const filled = await this.fillFieldByName(page, 'email', userData.email);
        if (filled) fields.push({ fieldName: 'email', fieldValue: userData.email, autoFilled: true, editable: true });
      }

      // Phone
      if (userData?.phone) {
        const filled = await this.fillFieldByName(page, 'phone', userData.phone);
        if (filled) fields.push({ fieldName: 'phone', fieldValue: userData.phone, autoFilled: true, editable: true });
      }

      // LinkedIn
      if (userData?.linkedinUrl) {
        const filled = await this.fillFieldByName(page, 'linkedIn', userData.linkedinUrl);
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
        const filled = await this.fillFieldByName(page, 'coverLetter', coverLetterContent);
        if (filled) fields.push({ fieldName: 'cover_letter', fieldValue: coverLetterContent, autoFilled: true, editable: true });
        if (!filled) {
          const filledTa = await this.fillFieldBySelector(page, 'textarea', coverLetterContent);
          if (filledTa) fields.push({ fieldName: 'cover_letter', fieldValue: coverLetterContent, autoFilled: true, editable: true });
        }
      }

      // Detect screening questions
      const questionEls = await page.$$('.field, .form-group, [class*="question"], label');
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
      this.logger.error(`SmartRecruiters fill failed: ${message}`);
      return { success: false, fields: [], screeningQuestions: [], error: message };
    } finally {
      if (browser) await browser.close();
    }
  }

  private async fillFieldByName(page: any, name: string, value: string): Promise<boolean> {
    try {
      const el = await page.$(
        `input[name="${name}"], input[data-ui="${name}"], input[id*="${name}" i]`,
      );
      if (!el) return false;
      await el.fill(value);
      await page.waitForTimeout(100);
      return true;
    } catch {
      return false;
    }
  }

  private async fillFieldBySelector(page: any, selector: string, value: string): Promise<boolean> {
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
