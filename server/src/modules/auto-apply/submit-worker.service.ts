import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { ATSPlatform } from './ats-router.service';
import type { ApplyField } from './schemas/apply-submission.schema';

export interface SubmitResult {
  success: boolean;
  submittedAt?: Date;
  error?: string;
}

@Injectable()
export class SubmitWorkerService {
  private readonly logger = new Logger(SubmitWorkerService.name);

  async submit(
    applicationUrl: string,
    atsPlatform: ATSPlatform,
    filledFields?: ApplyField[],
  ): Promise<SubmitResult> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();

      await page.goto(applicationUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Re-apply filled fields so form has data before submitting
      if (filledFields && filledFields.length > 0) {
        await this.applyFields(page, filledFields);
      }

      const submitButton = await this.findSubmitButton(page, atsPlatform);
      if (!submitButton) {
        return { success: false, error: 'Submit button not found on page' };
      }

      await submitButton.click();
      await page.waitForTimeout(5000);

      const successText = (await page.textContent('body').catch(() => undefined)) ?? '';
      const successIndicators = [
        'application submitted', 'thank you', 'we received', 'application received',
        'successfully applied', 'got it', 'we\'ll be in touch',
      ];
      const hasSuccess = successIndicators.some((s) => successText.toLowerCase().includes(s));

      if (hasSuccess) {
        return { success: true, submittedAt: new Date() };
      }

      const errorText = await page.textContent('.error, .alert, .notification--error, [class*="error"]').catch(() => '');
      if (errorText) {
        return { success: false, error: `Form error: ${errorText.trim().slice(0, 300)}` };
      }

      return { success: false, error: 'Unknown result — no success message detected' };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Submit failed for ${applicationUrl}: ${message}`);
      return { success: false, error: message };
    } finally {
      if (browser) await browser.close();
    }
  }

  private async applyFields(page: Page, fields: ApplyField[]): Promise<void> {
    for (const field of fields) {
      const name = field.fieldName;
      const value = field.fieldValue;
      if (!value) continue;

      try {
        if (name === 'resume') {
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) await fileInput.setInputFiles(value);
          continue;
        }

        const selectors = [
          `[name="${name}"]`,
          `[data-automation-id*="${name}"]`,
          `#${name}`,
          `[id*="${name}"]`,
        ];

        for (const sel of selectors) {
          const el = await page.$(sel);
          if (el) {
            const tag = await el.evaluate((node: Element) => node.tagName.toLowerCase()).catch(() => '');
            if (tag === 'textarea') {
              await el.fill(value);
            } else if (tag === 'select') {
              await el.selectOption(value);
            } else {
              await el.fill(value);
            }
            break;
          }
        }
      } catch {
        // field not found — skip
      }
    }
  }

  private async findSubmitButton(page: Page, platform: ATSPlatform): Promise<any> {
    switch (platform) {
      case 'greenhouse':
        return page.$('button[type="submit"], #submit_app, .submit-button');
      case 'lever':
        return page.$('button[type="submit"], button:has-text("Submit"), button:has-text("Send Application")');
      case 'workday':
        return page.$('button[data-automation-id*="submit"], button[aria-label*="Submit"], button:has-text("Submit")');
      case 'icims':
        return page.$('input[type="submit"], button[type="submit"]');
      case 'ashby':
        return page.$('button[data-cy*="submit"], button:has-text("Submit application"), button:has-text("Submit")');
      default:
        return page.$('button[type="submit"], input[type="submit"]');
    }
  }
}
