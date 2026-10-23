import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env from backend directory reliably regardless of process.cwd()
const backendEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: backendEnvPath });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5001),
  SUPABASE_URL: z.string().optional().default('').transform(url => url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_TIMEOUT_MS: z.coerce.number().default(10000),
  REQUIRE_SUPABASE: z.coerce.boolean().default(false),
  JWT_SECRET: z.string().min(8).default('development-secret'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PLATFORM_ADMIN_USERNAME: z.string().optional().default(''),
  PLATFORM_ADMIN_PASSWORD_HASH: z.string().optional().default(''),
  CORS_ORIGIN: z.string().default('*'),
  AI_PROVIDER: z.string().optional().default('local'),
  AI_API_KEY: z.string().optional().default(''),
  OCR_PROVIDER: z.string().optional().default('local'),
  OCR_API_KEY: z.string().optional().default(''),
  OFFICE_LATITUDE: z.coerce.number().default(23.05288),
  OFFICE_LONGITUDE: z.coerce.number().default(72.61891),
  OFFICE_GEOFENCE_RADIUS: z.coerce.number().default(200),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  GOOGLE_ROUTES_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(4000),
  GEMINI_MAX_RETRIES: z.coerce.number().default(2),
  GEMINI_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(3),
  GEMINI_CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().default(30000),
  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_MODEL: z.string().default('qwen/qwen3.8-27b'),
  CEREBRAS_API_KEY: z.string().optional().default(''),
  CEREBRAS_MODEL: z.string().default('llama3.1-8b'),
  AI_PROVIDER_TIMEOUT_MS: z.coerce.number().default(4000),
  AI_PROVIDER_MAX_RETRIES: z.coerce.number().default(2),
  AI_CACHE_TTL_SECONDS: z.coerce.number().default(300),
  AI_CACHE_MAX_ENTRIES: z.coerce.number().default(500),
  OPENWEATHER_API_KEY: z.string().optional().default(''),
  OPENWEATHER_TIMEOUT_MS: z.coerce.number().default(5000),
});

export const env = schema.parse(process.env);
export const hasSupabase = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

if (!hasSupabase && (env.NODE_ENV === 'production' || env.REQUIRE_SUPABASE)) {
  throw new Error(
    'Fatal: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production mode or when REQUIRE_SUPABASE=true.'
  );
}
