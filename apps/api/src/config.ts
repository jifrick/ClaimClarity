import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const EnvSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STORAGE_MODE: z.enum(['memory', 'supabase']).default('memory'),
  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic', 'demo']).default('demo'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  OCR_PROVIDER: z.enum(['none', 'mock', 'cloud_vision', 'textract']).default('none'),
  OCR_API_KEY: z.string().optional(),
  OCR_TIMEOUT_MS: z.string().default('15000').transform(Number),
  MAX_FILE_SIZE_MB: z.string().default('15').transform(Number),
  MAX_DOCUMENTS_PER_CASE: z.string().default('10').transform(Number),
  AI_TIMEOUT_MS: z.string().default('30000').transform(Number),
});

export const env = EnvSchema.parse(process.env);
