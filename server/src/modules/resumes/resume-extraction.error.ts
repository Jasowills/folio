export class ResumeExtractionError extends Error {
  constructor(
    public readonly code: string,
    userMessage: string,
    public readonly detail: string,
  ) {
    super(userMessage);
    this.name = 'ResumeExtractionError';
  }
}
