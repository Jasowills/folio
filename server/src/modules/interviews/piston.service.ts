import { Injectable, Logger } from '@nestjs/common';

interface PistonExecuteRequest {
  language: string;
  version: string;
  files: Array<{ name: string; content: string }>;
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  memory_limit?: number;
}

export interface PistonExecuteResult {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

const PISTON_API_URL =
  process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

@Injectable()
export class PistonService {
  private readonly logger = new Logger(PistonService.name);

  async execute(
    language: string,
    code: string,
    stdin?: string,
  ): Promise<PistonExecuteResult | null> {
    const runtime = this.getRuntime(language);
    if (!runtime) {
      this.logger.warn(`Unsupported language: ${language}`);
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(`${PISTON_API_URL}/execute`, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          files: [{ name: `main.${runtime.extension}`, content: code }],
          stdin: stdin || '',
          compile_timeout: 10000,
          run_timeout: 5000,
          memory_limit: 128,
        } satisfies PistonExecuteRequest),
      });

      clearTimeout(timeout);
      if (!res.ok) {
        this.logger.error(`Piston API returned ${res.status}`);
        return null;
      }

      return (await res.json()) as PistonExecuteResult;
    } catch (err) {
      clearTimeout(timeout);
      // ADV-0005: distinguish abort (timeout) from other errors
      if ((err as Error).name === 'AbortError') {
        this.logger.error('Piston execute timed out after 10s');
      } else {
        this.logger.error(`Piston execute failed: ${(err as Error).message}`);
      }
      return null;
    }
  }

  private getRuntime(
    language: string,
  ): { language: string; version: string; extension: string } | null {
    const runtimes: Record<
      string,
      { language: string; version: string; extension: string }
    > = {
      javascript: {
        language: 'javascript',
        version: '18.15.0',
        extension: 'js',
      },
      typescript: { language: 'typescript', version: '5.0.3', extension: 'ts' },
      python: { language: 'python', version: '3.10.0', extension: 'py' },
      java: { language: 'java', version: '15.0.2', extension: 'java' },
      go: { language: 'go', version: '1.16.0', extension: 'go' },
      rust: { language: 'rust', version: '1.68.0', extension: 'rs' },
      cpp: { language: 'c++', version: '10.2.0', extension: 'cpp' },
      c: { language: 'c', version: '10.2.0', extension: 'c' },
      ruby: { language: 'ruby', version: '3.0.1', extension: 'rb' },
      php: { language: 'php', version: '8.0.0', extension: 'php' },
      swift: { language: 'swift', version: '5.3.3', extension: 'swift' },
      kotlin: { language: 'kotlin', version: '1.8.0', extension: 'kt' },
    };
    return runtimes[language] || null;
  }
}
