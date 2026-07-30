import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

interface SRCompany {
  name: string;
  companyId: string;
}

const SR_COMPANIES: SRCompany[] = [
  { name: 'Spotify', companyId: 'Spotify' },
  { name: 'Twilio', companyId: 'Twilio' },
  { name: 'Zendesk', companyId: 'Zendesk' },
  { name: 'Square', companyId: 'Square' },
  { name: 'Atlassian', companyId: 'Atlassian' },
  { name: 'HubSpot', companyId: 'HubSpot' },
  { name: 'Shopify', companyId: 'Shopify' },
  { name: 'Salesforce', companyId: 'Salesforce' },
  { name: 'Slack', companyId: 'Slack' },
  { name: 'Zoom', companyId: 'Zoom' },
  { name: 'Uber', companyId: 'Uber' },
  { name: 'DoorDash', companyId: 'DoorDash' },
  { name: 'Walmart', companyId: 'Walmart' },
  { name: 'Target', companyId: 'Target' },
  { name: 'Best Buy', companyId: 'BestBuy' },
  { name: 'Nike', companyId: 'Nike' },
  { name: 'Adidas', companyId: 'Adidas' },
  { name: 'Siemens', companyId: 'Siemens' },
  { name: 'Bosch', companyId: 'Bosch' },
  { name: 'SAP', companyId: 'SAP' },
  { name: 'VMware', companyId: 'VMware' },
  { name: 'Dell', companyId: 'Dell' },
  { name: 'HP', companyId: 'HP' },
  { name: 'Workday', companyId: 'Workday' },
  { name: 'ServiceNow', companyId: 'ServiceNow' },
  { name: 'Palantir', companyId: 'Palantir' },
  { name: 'Databricks', companyId: 'Databricks' },
  { name: 'Snowflake', companyId: 'Snowflake' },
  { name: 'Cloudflare', companyId: 'Cloudflare' },
  { name: 'Fastly', companyId: 'Fastly' },
  { name: 'Akamai', companyId: 'Akamai' },
  { name: 'Okta', companyId: 'Okta' },
  { name: 'CrowdStrike', companyId: 'CrowdStrike' },
  { name: 'Palo Alto Networks', companyId: 'PaloAltoNetworks' },
  { name: 'Fortinet', companyId: 'Fortinet' },
  { name: 'Autodesk', companyId: 'Autodesk' },
  { name: 'Intuit', companyId: 'Intuit' },
  { name: 'Adobe', companyId: 'Adobe' },
  { name: 'DocuSign', companyId: 'DocuSign' },
  { name: 'Box', companyId: 'Box' },
  { name: 'Dropbox', companyId: 'Dropbox' },
  { name: 'Evernote', companyId: 'Evernote' },
  { name: 'Hootsuite', companyId: 'Hootsuite' },
  { name: 'Mailchimp', companyId: 'Mailchimp' },
  { name: 'SurveyMonkey', companyId: 'SurveyMonkey' },
  { name: 'GoDaddy', companyId: 'GoDaddy' },
  { name: 'New Relic', companyId: 'NewRelic' },
  { name: 'Datadog', companyId: 'Datadog' },
  { name: 'Elastic', companyId: 'Elastic' },
  { name: 'Splunk', companyId: 'Splunk' },
  { name: 'Confluent', companyId: 'Confluent' },
  { name: 'HashiCorp', companyId: 'HashiCorp' },
  { name: 'GitLab', companyId: 'GitLab' },
  { name: 'PagerDuty', companyId: 'PagerDuty' },
  { name: 'Monday.com', companyId: 'Mondaycom' },
  { name: 'Asana', companyId: 'Asana' },
  { name: 'Canva', companyId: 'Canva' },
  { name: 'Figma', companyId: 'Figma' },
  { name: 'Miro', companyId: 'Miro' },
  { name: 'Whimsical', companyId: 'Whimsical' },
  { name: 'Trello', companyId: 'Trello' },
  { name: 'Notion', companyId: 'Notion' },
];

@Injectable()
export class SmartRecruitersCrawler extends BaseCrawler {
  source = 'smartrecruiters';

  async crawl(): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    for (const company of SR_COMPANIES) {
      await this.rateLimit();
      try {
        const jobs = await this.crawlCompany(company);
        allJobs.push(...jobs);
      } catch {
        continue;
      }
    }
    return allJobs;
  }

  private async crawlCompany(company: SRCompany): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${company.companyId}/postings?limit=100`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Folio/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return jobs;

    const data = await response.json() as any;
    const results = data?.content || data?.results || data?.data || [];

    if (!Array.isArray(results)) return jobs;

    for (const posting of results) {
      const title = posting.name || posting.title || '';
      if (!title) continue;

      const id = posting.id || '';
      const location = posting.location || {};
      const locationStr = typeof location === 'string' ? location : location.city || '';
      const isRemote = posting.remote || posting.remoteType === 'fully_remote'
        || (typeof locationStr === 'string' && locationStr.toLowerCase().includes('remote'));
      const description = (posting.description || posting.descriptionPlain || posting.jobDescription || '')
        .replace(/<[^>]*>/g, '').trim();
      const postedDate = posting.postedDate || posting.createdDate || posting.publicationDate || null;
      const url = posting.applyUrl || posting.applicationUrl
        || `https://jobs.smartrecruiters.com/${company.companyId}/${id}`;

      jobs.push({
        source: 'smartrecruiters',
        sourceId: `sr-${company.companyId}-${id}`,
        roleTitle: title,
        companyName: company.name,
        location: locationStr || null,
        isRemote,
        postedAt: postedDate ? new Date(postedDate) : null,
        descriptionRaw: description,
        applicationUrl: url,
        isVerified: true,
      });
    }

    return jobs;
  }
}
