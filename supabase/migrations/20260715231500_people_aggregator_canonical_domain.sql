update public.ribbon_projects
set urls = jsonb_set(
  urls,
  '{production}',
  '"https://people.moriatz.com"'::jsonb,
  true
)
where slug = 'people-aggregator';
