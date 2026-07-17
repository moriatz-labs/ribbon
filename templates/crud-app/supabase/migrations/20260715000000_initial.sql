create extension if not exists pgcrypto with schema extensions;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '',
  due_date date,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_owner_id_idx on public.items (owner_id);
create index items_owner_updated_idx on public.items (owner_id, updated_at desc);

create table public.auth_email_requests (
  id bigint generated always as identity primary key,
  email_hash text not null check (char_length(email_hash) = 64),
  ip_hash text not null check (char_length(ip_hash) = 64),
  created_at timestamptz not null default now()
);

create index auth_email_requests_email_created_idx
on public.auth_email_requests (email_hash, created_at desc);
create index auth_email_requests_ip_created_idx
on public.auth_email_requests (ip_hash, created_at desc);

alter table public.items enable row level security;
alter table public.auth_email_requests enable row level security;

create policy "Owners read items" on public.items for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);
create policy "Owners create items" on public.items for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = owner_id);
create policy "Owners update items" on public.items for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = owner_id);
create policy "Owners delete items" on public.items for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

grant select, insert, update, delete on table public.items to authenticated;
revoke all on table public.items from anon;
revoke all on table public.auth_email_requests from public, anon, authenticated;
grant select, insert, delete on table public.auth_email_requests to service_role;
grant usage, select on sequence public.auth_email_requests_id_seq to service_role;

create or replace function public.claim_auth_email_send(
  p_email_hash text,
  p_ip_hash text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_email_hash !~ '^[0-9a-f]{64}$' or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid request fingerprint' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_email_hash || p_ip_hash, 0));
  delete from public.auth_email_requests
  where created_at < pg_catalog.now() - interval '24 hours';

  if (
    select count(*)
    from public.auth_email_requests
    where email_hash = p_email_hash
      and created_at > pg_catalog.now() - interval '15 minutes'
  ) >= 3
  or (
    select count(*)
    from public.auth_email_requests
    where ip_hash = p_ip_hash
      and created_at > pg_catalog.now() - interval '15 minutes'
  ) >= 10 then
    return false;
  end if;

  insert into public.auth_email_requests (email_hash, ip_hash)
  values (p_email_hash, p_ip_hash);
  return true;
end;
$$;

revoke all on function public.claim_auth_email_send(text, text) from public, anon, authenticated;
grant execute on function public.claim_auth_email_send(text, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "Owners read attachments" on storage.objects for select to authenticated
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners upload attachments" on storage.objects for insert to authenticated
with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners update attachments" on storage.objects for update to authenticated
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners delete attachments" on storage.objects for delete to authenticated
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
