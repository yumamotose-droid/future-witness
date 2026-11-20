import type { SessionRecord } from "@/lib/types";

/**
 * Optional server-side history.
 *
 * Not wired into the UI by default. It is here so a deployment that wants
 * durable, shareable records has a single file to turn on, with the row-level
 * security policy it requires documented next to it in SECURITY.md.
 *
 * Expected schema (apply with `supabase/schema.sql`):
 *
 *   create table public.deliberations (
 *     id text primary key,
 *     created_at timestamptz not null default now(),
 *     lang text not null,
 *     question text not null,
 *     payload jsonb not null
 *   );
 *   alter table public.deliberations enable row level security;
 *   -- No permissive policy is created: with RLS on and no policy, the anon key
 *   -- can neither read nor write. A deployment must add the narrowest policy
 *   -- its own threat model allows.
 */

export interface HistoryStore {
  list(): Promise<SessionRecord[]>;
  put(session: SessionRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function createSupabaseStore(): Promise<HistoryStore> {
  if (!supabaseConfigured()) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the server.",
    );
  }
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } },
  );

  return {
    async list() {
      const { data, error } = await client
        .from("deliberations")
        .select("payload")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => row.payload as SessionRecord);
    },
    async put(session) {
      const { error } = await client.from("deliberations").upsert({
        id: session.id,
        lang: session.lang,
        question: session.question,
        payload: session,
      });
      if (error) throw new Error(error.message);
    },
    async remove(id) {
      const { error } = await client
        .from("deliberations")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
