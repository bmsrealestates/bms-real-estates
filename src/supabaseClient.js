import { createClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

const isValidSupabaseUrl = (() => {
  try {
    const url = new URL(configuredUrl);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch {
    return false;
  }
})();

export const supabaseConfigured = isValidSupabaseUrl && Boolean(configuredAnonKey);
export const supabaseConfigError = supabaseConfigured
  ? ''
  : 'Portal connectivity is not configured. Set a valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart or redeploy.';

export const supabase = createClient(
  isValidSupabaseUrl ? configuredUrl : 'https://unconfigured.supabase.co',
  configuredAnonKey || 'missing-supabase-anon-key'
);
