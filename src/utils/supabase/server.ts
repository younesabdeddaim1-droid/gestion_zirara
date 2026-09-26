import { createServerClient } from "@supabase/ssr";

// Mock cookies helper for Vite/Express full-stack compatibility
export const cookies = () => {
  return {
    getAll: () => [],
    set: (name: string, value: string, options: any) => {},
    get: (name: string) => undefined,
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mcdudiiqjzsnthhbtgbm.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_TksVfQvHDU79LOESKxn-Ag_F47b_bBi";

export const createClient = (cookieStore: any) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (cookieStore?.set) {
                cookieStore.set(name, value, options);
              }
            });
          } catch {
            // Ignore
          }
        },
      },
    },
  );
};
