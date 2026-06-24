export function validateEnv() {
  const required = [
    ['MONGODB_URI', 'MongoDB connection string'],
    ['JWT_SECRET', 'JWT signing secret'],
    ['JWT_REFRESH_SECRET', 'JWT refresh token secret'],
    ['CLOUDINARY_CLOUD_NAME', 'Cloudinary cloud name'],
    ['CLOUDINARY_API_KEY', 'Cloudinary API key'],
    ['CLOUDINARY_API_SECRET', 'Cloudinary API secret'],
    ['GOOGLE_CLIENT_ID', 'Google OAuth client ID'],
    ['OPENROUTER_API_KEY', 'OpenRouter API key for AI calls'],
    ['CLIENT_URL', 'Client application URL'],
  ] as const;

  const missing: string[] = [];

  for (const [key, label] of required) {
    if (!process.env[key]) {
      missing.push(`${key} (${label})`);
    }
  }

  if (missing.length > 0) {
    console.error(
      '\n❌ Missing required environment variables:\n  ' +
        missing.join('\n  ') +
        '\n\nSet them in server/.env or export them.\n',
    );
    process.exit(1);
  }
}
