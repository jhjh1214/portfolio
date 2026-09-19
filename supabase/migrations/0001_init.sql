-- Portfolio backend schema. Run once in the Supabase SQL editor (or `supabase db push`).
--
-- Security model
--   * Visitors are anonymous or signed in with an emailed one-time code (Supabase Auth, passwordless).
--   * The OWNER is whoever's email is in public.owner_emails AND has passed a second factor (TOTP, aal2).
--     Owner-only actions (edit content, read messages, upload media) are enforced HERE with row-level
--     security, so the UI can be bypassed without gaining access.
--   * Add your owner email once, from the SQL editor. Never commit it:
--       insert into public.owner_emails (email) values ('you@example.com');

-- ---------------------------------------------------------------- owner ---
create table if not exists public.owner_emails (
  email text primary key check (email = lower(email))
);
alter table public.owner_emails enable row level security;   -- no policies: unreachable through the API
revoke all on public.owner_emails from anon, authenticated;

create or replace function public.is_owner_email() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.owner_emails o where o.email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_owner_email() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

revoke all on function public.is_owner_email(), public.is_owner() from public;
grant execute on function public.is_owner_email(), public.is_owner() to anon, authenticated;

-- ---------------------------------------------------------- site content ---
create table if not exists public.site_content (
  id text primary key default 'main' check (id = 'main'),
  data jsonb not null check (pg_column_size(data) < 4000000),
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;

drop policy if exists "content is public" on public.site_content;
create policy "content is public" on public.site_content for select using (true);
drop policy if exists "owner inserts content" on public.site_content;
create policy "owner inserts content" on public.site_content for insert to authenticated with check (public.is_owner());
drop policy if exists "owner updates content" on public.site_content;
create policy "owner updates content" on public.site_content for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- -------------------------------------------------------------- profiles ---
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  theme text check (theme is null or theme in ('nyonya', 'steam', 'terminal', 'sakura', 'mono')),
  mode text check (mode is null or mode in ('system', 'light', 'dark')),
  progress jsonb not null default '{}'::jsonb check (pg_column_size(progress) < 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "read own profile or owner reads all" on public.profiles;
create policy "read own profile or owner reads all" on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_owner());
drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile" on public.profiles for delete to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 40))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Public counter for "friends" without exposing anyone.
create or replace function public.friend_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.profiles
$$;
revoke all on function public.friend_count() from public;
grant execute on function public.friend_count() to anon, authenticated;

-- -------------------------------------------------------------- messages ---
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_created_idx on public.messages (created_at desc);
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant select, update, delete on public.messages to authenticated;

drop policy if exists "anyone can send a message" on public.messages;
create policy "anyone can send a message" on public.messages for insert to anon, authenticated
  with check (read_at is null and (user_id is null or user_id = auth.uid()));
drop policy if exists "owner reads messages" on public.messages;
create policy "owner reads messages" on public.messages for select to authenticated using (public.is_owner());
drop policy if exists "owner updates messages" on public.messages;
create policy "owner updates messages" on public.messages for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "owner deletes messages" on public.messages;
create policy "owner deletes messages" on public.messages for delete to authenticated using (public.is_owner());

-- Flood control: 3 messages per email per hour, 120 per hour overall.
create or replace function public.limit_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.messages where created_at > now() - interval '1 hour') >= 120 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages for each row execute function public.limit_messages();

-- ------------------------------------------- realtime + media (Supabase) ---
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then null;
    end;
  end if;

  if to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
    on conflict (id) do nothing;

    execute 'drop policy if exists "media is public" on storage.objects';
    execute 'create policy "media is public" on storage.objects for select using (bucket_id = ''media'')';
    execute 'drop policy if exists "owner uploads media" on storage.objects';
    execute 'create policy "owner uploads media" on storage.objects for insert to authenticated with check (bucket_id = ''media'' and public.is_owner())';
    execute 'drop policy if exists "owner updates media" on storage.objects';
    execute 'create policy "owner updates media" on storage.objects for update to authenticated using (bucket_id = ''media'' and public.is_owner())';
    execute 'drop policy if exists "owner deletes media" on storage.objects';
    execute 'create policy "owner deletes media" on storage.objects for delete to authenticated using (bucket_id = ''media'' and public.is_owner())';
  end if;
end $$;
