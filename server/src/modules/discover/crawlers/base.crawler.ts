export interface RawJob {
  source: string;
  sourceId: string;
  roleTitle: string;
  companyName: string;
  location: string | null;
  isRemote: boolean;
  postedAt: Date | null;
  descriptionRaw: string;
  applicationUrl: string | null;
  isVerified: boolean;
}

export abstract class BaseCrawler {
  abstract source: string;
  abstract crawl(): Promise<RawJob[]>;

  protected readonly rateLimitMs = 3000;
  private lastRequestTime = 0;

  protected async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.rateLimitMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitMs - elapsed),
      );
    }
    this.lastRequestTime = Date.now();
  }
}
