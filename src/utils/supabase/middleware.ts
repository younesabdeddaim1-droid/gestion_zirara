import { createServerClient } from "@supabase/ssr";

// Mock Next.js types for compilation in Vite SPA environment
export interface NextRequest {
  cookies: {
    getAll: () => any[];
    get: (name: string) => any;
    set: (name: string, value: string) => void;
  };
  headers: any;
}

export class NextResponse {
  static next(options?: any) {
    return {
      cookies: {
        set: (name: string, value: string, options?: any) => {}
      }
    } as any;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mcdudiiqjzsnthhbtgbm.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_TksVfQvHDU79LOESKxn-Ag_F47b_bBi";

export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  return supabaseResponse;
};
