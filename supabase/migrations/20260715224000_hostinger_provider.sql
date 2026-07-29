alter table public.ribbon_projects
alter column providers set default
  '{"vercel":false,"supabase":false,"cloudflare":false,"hostinger":false,"designSystem":true}'::jsonb;

update public.ribbon_projects
set providers = jsonb_set(providers, '{hostinger}', 'true'::jsonb, true)
where slug in ('ribbon', 'people-aggregator');
