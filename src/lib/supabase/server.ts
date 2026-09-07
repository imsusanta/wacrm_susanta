import { createServerClient } from '@supabase/ssr';
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  requireSupabasePublicConfig,
  requireSupabaseServiceRole,
} from '@/lib/runtime-config';

interface ServerClientOptions {
  /** When false, authentication cookies expire with the browser session. */
  persistentSession?: boolean;
}

export async function createClient(options: ServerClientOptions = {}) {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = null;
  }
  const { url: supabaseUrl, publishableKey: supabaseAnonKey } =
    requireSupabasePublicConfig();
  const persistentSession = options.persistentSession !== false;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore?.getAll() ?? [];
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
            const normalizedOptions = persistentSession
              ? cookieOptions
              : {
                  ...cookieOptions,
                  expires: undefined,
                  maxAge: undefined,
                };
            cookieStore?.set(name, value, normalizedOptions);
          });
        } catch {
          // Server Components cannot write cookies. The proxy refreshes them.
        }
      },
    },
  });
}

// Keep SDK method/query-builder types at the facade boundary. Table-specific
// generated types are a separate step once the canonical schema is verified.
let adminClientInstance: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (adminClientInstance && process.env.NODE_ENV === 'production') {
    return adminClientInstance;
  }
  const { url: supabaseUrl } = requireSupabasePublicConfig();
  const serviceRoleKey = requireSupabaseServiceRole();

  const client = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  if (process.env.NODE_ENV === 'production') {
    adminClientInstance = client;
  }
  return client;
}
