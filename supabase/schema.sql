-- Core tables for Pitch. Run this in your Supabase project's SQL Editor
-- once, before running supabase/storage-setup.sql.

create table if not exists campaigns (
  id text primary key,
  user_id uuid references auth.users(id) not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists stories (
  id text primary key,
  user_id uuid references auth.users(id) not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Profile lives in its own table rather than auth.users.user_metadata:
-- user_metadata gets embedded directly in the session JWT/cookie on every
-- request, so a pasted resume/LinkedIn export there can push the cookie
-- past the edge's header-size limit (494 REQUEST_HEADER_TOO_LARGE) and
-- re-appear on every login even after clearing cookies, since the server
-- just re-issues the same oversized payload.
create table if not exists profiles (
  user_id uuid primary key references auth.users(id),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx on campaigns(user_id);
create index if not exists stories_user_id_idx on stories(user_id);

-- Row Level Security: every row is only ever readable/writable by the user
-- who owns it. Without this, any authenticated user could read or edit
-- everyone else's campaigns and stories.
alter table campaigns enable row level security;
alter table stories enable row level security;
alter table profiles enable row level security;

create policy "Users manage their own campaigns" on campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own stories" on stories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own profile" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
