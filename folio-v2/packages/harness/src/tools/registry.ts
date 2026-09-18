import type { ToolDefinition } from '@folio/shared-types';

/**
 * Tool registry — typed tool interfaces the model can call (spec §5).
 * Milestone 1: registry skeleton + JSON-Schema definitions only.
 * Milestones 2/4+: real implementations per tool.
 */

export interface ToolHandler<TInput = unknown, TOutput = unknown> {
  definition: ToolDefinition;
  execute(input: TInput): Promise<TOutput>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'resume.tailor',
    description:
      'Reweight/reorder resume bullets and adjust summary against a job description within the existing schema. Returns a diff for user approval before saving.',
    parameters: {
      type: 'object',
      properties: {
        jobDescription: { type: 'string' },
        currentResumeId: { type: 'string' },
      },
      required: ['jobDescription', 'currentResumeId'],
    },
  },
  {
    name: 'resume.render',
    description: 'Deterministically render a resume to PDF/DOCX via the shared renderer. No AI involved.',
    parameters: {
      type: 'object',
      properties: {
        resumeId: { type: 'string' },
        templateId: { type: 'string' },
        format: { type: 'string', enum: ['pdf', 'docx'] },
      },
      required: ['resumeId', 'templateId', 'format'],
    },
  },
  {
    name: 'jobs.search',
    description: 'Search public postings (Greenhouse/Lever public feeds, web search, RSS) for open roles.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        filters: { type: 'object' },
      },
      required: ['query'],
    },
  },
  {
    name: 'jobs.verify_company',
    description: 'Cross-check company identity consistency, scam patterns, and posting boilerplate reuse.',
    parameters: {
      type: 'object',
      properties: { companyName: { type: 'string' } },
      required: ['companyName'],
    },
  },
  {
    name: 'outreach.find_contact',
    description: 'Find a real named contact with a confidence label (verified vs pattern-guessed vs general inbox). Never fabricate.',
    parameters: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        role: { type: 'string' },
      },
      required: ['companyName'],
    },
  },
  {
    name: 'outreach.draft',
    description: 'Draft a cold email/cover letter with house style rules. Draft-only — never sends.',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        hook: { type: 'string' },
        tone: { type: 'string' },
      },
      required: ['contactId', 'hook'],
    },
  },
  {
    name: 'email.read',
    description: 'Read a message from the local OAuth-connected mailbox.',
    parameters: {
      type: 'object',
      properties: { messageId: { type: 'string' } },
      required: ['messageId'],
    },
  },
  {
    name: 'email.search',
    description: 'Search the local OAuth-connected mailbox.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'email.draft',
    description: 'Create a draft in the local mailbox. Never sends without explicit user approval.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'tracker.upsert',
    description: 'Create or update a local application-tracker record.',
    parameters: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['company', 'role'],
    },
  },
];

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void {
    this.handlers.set(handler.definition.name, handler);
  }

  definitions(): ToolDefinition[] {
    return TOOL_DEFINITIONS;
  }

  async execute(name: string, input: unknown): Promise<unknown> {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(
        `Tool '${name}' has no implementation yet (Milestone ${toolMilestone(name)})`,
      );
    }
    return handler.execute(input);
  }
}

function toolMilestone(name: string): number {
  if (name.startsWith('resume.')) return 2;
  if (name.startsWith('outreach.') || name.startsWith('email.')) return 4;
  if (name === 'tracker.upsert' || name === 'jobs.verify_company') return 5;
  return 6;
}
