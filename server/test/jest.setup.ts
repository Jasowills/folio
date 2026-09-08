/**
 * Global jest setup.
 *
 * The `@opencode-ai/sdk` package ships pure ESM and cannot be loaded by
 * jest's CommonJS runtime. Every spec that transitively imports AiService /
 * OpencodeService would otherwise crash on `export` syntax. The SDK is never
 * exercised in unit tests, so we mock it globally. Individual specs
 * (opencode.service.spec.ts) override the mock with their own factories.
 */
jest.mock('@opencode-ai/sdk/v2', () => ({
  createOpencode: jest.fn(),
  createOpencodeClient: jest.fn(),
}));
