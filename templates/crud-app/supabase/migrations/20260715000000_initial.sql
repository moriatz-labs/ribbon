create extension if not exists pgcrypto with schema extensions;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '',
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_owner_id_idx on public.items (owner_id);
create index items_owner_updated_idx on public.items (owner_id, updated_at desc);

alter table public.items enable row level security;

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
