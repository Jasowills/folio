export function validateEnv() {
  const required: [string, string][] = [
    ['MONGODB_URI', 'MongoDB connection string'],
    ['JWT_SECRET', 'JWT signing secret'],
    ['JWT_REFRESH_SECRET', 'JWT refresh token secret'],
    ['CLOUDINARY_CLOUD_NAME', 'Cloudinary cloud name'],
    ['CLOUDINARY_API_KEY', 'Cloudinary API key'],
    ['CLOUDINARY_API_SECRET', 'Cloudinary API secret'],
    ['GOOGLE_CLIENT_ID', 'Google OAuth client ID'],
    ['CLIENT_URL', 'Client application URL'],
  ];

  // OPENROUTER_API_KEY is required unless Ollama or Groq is configured
  if (!process.env.OLLAMA_BASE_URL && !process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY) {
    required.push(['OPENROUTER_API_KEY or GROQ_API_KEY', 'OpenRouter or Groq API key for AI calls — not needed if OLLAMA_BASE_URL is set']);
  }

  const missing: string[] = [];

  for (const [key, label] of required) {
    if (!process.env[key]) {
      missing.push(`${key} (${label})`);
    }
  }

  if (missing.length > 0) {
    const msg =
      '\n❌ Missing required environment variables:\n  ' +
        missing.join('\n  ') +
        '\n\nSet them in server/.env or export them.\n';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
    console.error(msg);
    process.exit(1);
  }
}
