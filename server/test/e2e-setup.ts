process.env.JWT_SECRET = 'e2e-test-secret';
process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.CLIENT_URL = 'http://localhost:5173';

jest.mock('@opencode-ai/sdk/v2', () => ({
  createOpencode: jest.fn(),
  createOpencodeClient: jest.fn(),
}));
