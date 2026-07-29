update public.ribbon_projects
set urls = jsonb_set(
  urls,
  '{production}',
  '"https://people-aggregator.moriatz.com"'::jsonb,
  true
)
where slug = 'people-aggregator';
