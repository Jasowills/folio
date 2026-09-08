import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import type { ApplyField } from '../schemas/apply-submission.schema';
import type { FillResult } from './greenhouse.adapter';

@Injectable()
export class ICIMSAdapter {
  private readonly logger = new Logger(ICIMSAdapter.name);

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
      await page.goto(applicationUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      const fields: ApplyField[] = [];
      const screeningQuestions: { question: string; inputType: string }[] = [];

      // iCIMS often has an "Apply Now" button to click first
      const applyBtn = await page.$(
        'a[href*="apply"], button:has-text("Apply Now"), a:has-text("Apply")',
      );
      if (applyBtn) {
        await applyBtn.click();
        await page.waitForTimeout(2000);
      }

      await page
        .waitForSelector('form, input[name], .icims-form', { timeout: 15000 })
        .catch(() => {});

      // Full name
      if (userData?.fullName) {
        const nameParts = userData.fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const filledFirst = await this.fillFieldByName(
          page,
          'FirstName',
          firstName,
        );
        if (filledFirst)
          fields.push({
            fieldName: 'first_name',
            fieldValue: firstName,
            autoFilled: true,
            editable: true,
          });

        const filledLast = await this.fillFieldByName(
          page,
          'LastName',
          lastName,
        );
        if (filledLast)
          fields.push({
            fieldName: 'last_name',
            fieldValue: lastName,
            autoFilled: true,
            editable: true,
          });
      }

      // Email
      if (userData?.email) {
        const filled = await this.fillFieldByName(
          page,
          'Email',
          userData.email,
        );
        if (filled)
          fields.push({
            fieldName: 'email',
            fieldValue: userData.email,
            autoFilled: true,
            editable: true,
          });
      }

      // Phone
      if (userData?.phone) {
        const filled = await this.fillFieldByName(
          page,
          'Phone',
          userData.phone,
        );
        if (filled)
          fields.push({
            fieldName: 'phone',
            fieldValue: userData.phone,
            autoFilled: true,
            editable: true,
          });
      }

      // LinkedIn
      if (userData?.linkedinUrl) {
        const filled = await this.fillFieldByName(
          page,
          'LinkedIn',
          userData.linkedinUrl,
        );
        if (filled)
          fields.push({
            fieldName: 'linkedin_url',
            fieldValue: userData.linkedinUrl,
            autoFilled: true,
            editable: true,
          });
      }

      // Website
      if (userData?.website) {
        const filled = await this.fillFieldByName(
          page,
          'Website',
          userData.website,
        );
        if (filled)
          fields.push({
            fieldName: 'website_url',
            fieldValue: userData.website,
            autoFilled: true,
            editable: true,
          });
      }

      // Resume upload
      if (resumeUrl) {
        try {
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) {
            await fileInput.setInputFiles(resumeUrl);
            fields.push({
              fieldName: 'resume',
              fieldValue: resumeUrl,
              autoFilled: true,
              editable: false,
            });
          }
        } catch {
          this.logger.debug('Resume upload field not found');
        }
      }

      // Cover letter
      if (coverLetterContent) {
        const filled = await this.fillFieldByName(
          page,
          'CoverLetter',
          coverLetterContent,
        );
        if (filled)
          fields.push({
            fieldName: 'cover_letter',
            fieldValue: coverLetterContent,
            autoFilled: true,
            editable: true,
          });

        if (!filled) {
          const filledTa = await this.fillFieldBySelector(
            page,
            'textarea',
            coverLetterContent,
          );
          if (filledTa)
            fields.push({
              fieldName: 'cover_letter',
              fieldValue: coverLetterContent,
              autoFilled: true,
              editable: true,
            });
        }
      }

      // Detect screening questions
      const questionEls = await page.$$(
        '.question, .field, .form-group, label, [class*="question"]',
      );
      for (const el of questionEls) {
        const text = await el.textContent().catch(() => '');
        if (text && text.trim().length > 5) {
          const selectInside = await el.$('select').catch(() => null);
          const inputInside = await el.$('input, textarea').catch(() => null);
          let inputType = 'text';
          if (selectInside) inputType = 'select';
          else if (inputInside) {
            inputType =
              (await inputInside.getAttribute('type').catch(() => 'text')) ||
              'text';
          }
          screeningQuestions.push({
            question: text.trim().slice(0, 200),
            inputType,
          });
        }
      }

      return { success: true, fields, screeningQuestions };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`iCIMS fill failed: ${message}`);
      return {
        success: false,
        fields: [],
        screeningQuestions: [],
        error: message,
      };
    } finally {
      if (browser) await browser.close();
    }
  }

  private async fillFieldByName(
    page: any,
    name: string,
    value: string,
  ): Promise<boolean> {
    try {
      const el = await page.$(
        `input[name="${name}"], input[aria-label*="${name}" i], input[id*="${name}"]`,
      );
      if (!el) return false;
      await el.fill(value);
      await page.waitForTimeout(100);
      return true;
    } catch {
      return false;
    }
  }

  private async fillFieldBySelector(
    page: any,
    selector: string,
    value: string,
  ): Promise<boolean> {
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
