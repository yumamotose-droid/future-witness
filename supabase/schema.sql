-- FUTURE WITNESS — optional durable history.
--
-- This project stores deliberation records in the browser by default. Apply
-- this schema only if a deployment has decided it wants server-side history,
-- and read SECURITY.md first: these records describe someone's position on a
-- contested local decision before and after they changed their mind.

create table if not exists public.deliberations (
  id          text primary key,
  created_at  timestamptz not null default now(),
  lang        text not null check (lang in ('ja', 'en')),
  question    text not null,
  payload     jsonb not null
);

create index if not exists deliberations_created_at_idx
  on public.deliberations (created_at desc);

-- Row level security is enabled and NO policy is created.
--
-- With RLS on and no policy, the anon key can neither read nor write: the only
-- access is through the service role key held on the server. That is the
-- correct default for this table, because nothing in this application needs a
-- browser to read another person's deliberation. A deployment that wants
-- something else must write the narrowest policy its own threat model allows,
-- and must not reach for a blanket `using (true)`.
alter table public.deliberations enable row level security;

-- Retention: records are personal reflections, not operational data. A
-- deployment that keeps them should also schedule their deletion, for example:
--
--   delete from public.deliberations where created_at < now() - interval '90 days';
