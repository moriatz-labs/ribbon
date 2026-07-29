create extension if not exists pgcrypto with schema extensions;

create table public.ribbon_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  status text not null default 'draft' check (status in ('draft', 'local', 'preview', 'production', 'archived')),
  providers jsonb not null default '{"vercel":false,"supabase":false,"cloudflare":false,"designSystem":true}'::jsonb,
  provider_refs jsonb not null default '{}'::jsonb,
  urls jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create index ribbon_projects_owner_id_idx on public.ribbon_projects (owner_id);
create index ribbon_projects_owner_updated_idx on public.ribbon_projects (owner_id, updated_at desc);

alter table public.ribbon_projects enable row level security;

create policy "Owners can read their Ribbon projects"
on public.ribbon_projects
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

create policy "Owners can create Ribbon projects"
on public.ribbon_projects
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

create policy "Owners can update their Ribbon projects"
on public.ribbon_projects
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

create policy "Owners can delete their Ribbon projects"
on public.ribbon_projects
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

create or replace function public.set_ribbon_project_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_ribbon_project_updated_at() from public, anon, authenticated;

create trigger set_ribbon_project_updated_at
before update on public.ribbon_projects
for each row execute function public.set_ribbon_project_updated_at();

grant select, insert, update, delete on table public.ribbon_projects to authenticated;
revoke all on table public.ribbon_projects from anon;
