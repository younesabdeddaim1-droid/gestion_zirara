import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

// Helper to retrieve saved config from localStorage if present
export const getStoredSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('supabase_custom_url');
    const savedKey = localStorage.getItem('supabase_custom_key');
    if (savedUrl && savedKey) {
      return { url: savedUrl, key: savedKey };
    }
  }
  return null;
};

// Read from environment only — there is no working hardcoded fallback project.
// An unconfigured deployment should surface a clear "not configured" state
// rather than silently pointing at a project nobody owns.
const envUrl: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  "";

const envKey: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  "";

const stored = getStoredSupabaseConfig();
export let supabaseUrl: string = stored?.url || envUrl;
export let supabaseKey: string = stored?.key || envKey;

const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// True once a real project URL + key are available (from env vars or a saved
// custom config) — use this to distinguish "not configured yet" from "configured
// but unreachable" instead of guessing from a network error.
export const isSupabaseConfigured = isValidHttpUrl(supabaseUrl) && !!supabaseKey;

export const createClientInstance = (url: string, key: string): SupabaseClient => {
  // supabase-js requires a syntactically valid URL even before a real project is set.
  const safeUrl = isValidHttpUrl(url) ? url : 'https://not-configured.invalid';
  return createSupabaseClient(safeUrl, key || 'not-configured', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export let supabase: SupabaseClient = createClientInstance(supabaseUrl, supabaseKey);

export const updateSupabaseCredentials = (newUrl: string, newKey: string) => {
  supabaseUrl = newUrl.trim();
  supabaseKey = newKey.trim();
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_custom_url', supabaseUrl);
    localStorage.setItem('supabase_custom_key', supabaseKey);
  }
  supabase = createClientInstance(supabaseUrl, supabaseKey);
  return supabase;
};

export const resetSupabaseCredentials = () => {
  supabaseUrl = envUrl;
  supabaseKey = envKey;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase_custom_url');
    localStorage.removeItem('supabase_custom_key');
  }
  supabase = createClientInstance(supabaseUrl, supabaseKey);
  return supabase;
};

