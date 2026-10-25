import dotenv from 'dotenv';
dotenv.config();
// Reloaded with verified Google OAuth credentials

import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  GOOGLE_CLIENT_ID: z.string().default('placeholder-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().default('placeholder-client-secret'),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:4000/api/youtube/callback'),
  ELEVENLABS_API_KEY: z.string(),
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  TAVILY_API_KEY: z.string(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default('us-central1'),
  FRONTEND_URL: z.string().default('http://localhost:3001'),
  GENERATED_DIR: z.string().default('./generated'),
  PEXELS_API_KEY: z.string().optional(),
  PIXABAY_API_KEY: z.string().optional(),
  MAX_RETRY_COUNT: z.string().default('3'),
  QUALITY_THRESHOLD: z.string().default('70'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: parseInt(parsed.data.PORT, 10),
  MAX_RETRY_COUNT: parseInt(parsed.data.MAX_RETRY_COUNT, 10),
  QUALITY_THRESHOLD: parseInt(parsed.data.QUALITY_THRESHOLD, 10),
};
