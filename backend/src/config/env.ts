import dotenv from 'dotenv';
import {z} from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  SUPABASE_URL: z.string().optional().default('').transform(url => url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  JWT_SECRET: z.string().min(8).default('development-secret'),
  JWT_EXPIRES_IN: z.string().default('7d'),
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
  GEMINI_API_KEY: z.string().optional().default('')
});

export const env = schema.parse(process.env);
export const hasSupabase = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
