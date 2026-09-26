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

const defaultUrl: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  "https://mcdudiiqjzsnthhbtgbm.supabase.co";

const defaultKey: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  "sb_publishable_TksVfQvHDU79LOESKxn-Ag_F47b_bBi";

const stored = getStoredSupabaseConfig();
export let supabaseUrl: string = stored?.url || defaultUrl;
export let supabaseKey: string = stored?.key || defaultKey;

export const createClientInstance = (url: string, key: string): SupabaseClient => {
  return createSupabaseClient(url, key, {
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
  supabaseUrl = defaultUrl;
  supabaseKey = defaultKey;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase_custom_url');
    localStorage.removeItem('supabase_custom_key');
  }
  supabase = createClientInstance(supabaseUrl, supabaseKey);
  return supabase;
};

