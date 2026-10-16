import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config.js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return supabaseClient;
  }
  return null;
}
