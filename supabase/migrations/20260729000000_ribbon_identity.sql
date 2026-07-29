do $$
begin
  if to_regclass('public.ribbon_projects') is null
     and to_regclass('public.vscd_projects') is not null then
    alter table public.vscd_projects rename to ribbon_projects;
  end if;
end
$$;

alter index if exists public.vscd_projects_owner_id_idx
  rename to ribbon_projects_owner_id_idx;
alter index if exists public.vscd_projects_owner_updated_idx
  rename to ribbon_projects_owner_updated_idx;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'vscd_projects_pkey'
      and conrelid = 'public.ribbon_projects'::regclass
  ) then
    alter table public.ribbon_projects
      rename constraint vscd_projects_pkey to ribbon_projects_pkey;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'vscd_projects_owner_id_slug_key'
      and conrelid = 'public.ribbon_projects'::regclass
  ) then
    alter table public.ribbon_projects
      rename constraint vscd_projects_owner_id_slug_key
      to ribbon_projects_owner_id_slug_key;
  end if;
end
$$;

do $$
begin
  if to_regprocedure('public.set_vscd_project_updated_at()') is not null
     and to_regprocedure('public.set_ribbon_project_updated_at()') is null then
    alter function public.set_vscd_project_updated_at()
      rename to set_ribbon_project_updated_at;
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgname = 'set_vscd_project_updated_at'
      and tgrelid = 'public.ribbon_projects'::regclass
      and not tgisinternal
  ) then
    alter trigger set_vscd_project_updated_at
      on public.ribbon_projects
      rename to set_ribbon_project_updated_at;
  end if;
end
$$;

do $$
declare
  policy_pair record;
begin
  for policy_pair in
    select *
    from (
      values
        ('Owners can read their VSCD projects', 'Owners can read their Ribbon projects'),
        ('Owners can create VSCD projects', 'Owners can create Ribbon projects'),
        ('Owners can update their VSCD projects', 'Owners can update their Ribbon projects'),
        ('Owners can delete their VSCD projects', 'Owners can delete their Ribbon projects')
    ) as policies(old_name, new_name)
  loop
    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'ribbon_projects'
        and policyname = policy_pair.old_name
    ) then
      execute format(
        'alter policy %I on public.ribbon_projects rename to %I',
        policy_pair.old_name,
        policy_pair.new_name
      );
    end if;
  end loop;
end
$$;

update public.ribbon_projects
set providers = jsonb_set(
  providers,
  '{designSystem}',
  '{
    "provider": "strawn",
    "source": "npm",
    "version": "0.1.0",
    "packages": ["strawn", "strawn-icons"],
    "requiredComponents": ["ThemeProvider", "TooltipProvider"]
  }'::jsonb,
  true
)
where providers ? 'designSystem';

update public.ribbon_projects
set
  name = 'Ribbon',
  slug = 'ribbon',
  status = 'local',
  urls = (urls - 'production' - 'repository')
    || '{"local":"http://localhost:4310"}'::jsonb
where slug = 'vscd';
