import {createClient} from '@supabase/supabase-js';
import ws from 'ws';
import {env, hasSupabase} from './env';

export const supabase = hasSupabase
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
      realtime: {
        transport: ws as any,
      },
    })
  : null;