begin;

select plan(9);

select has_table('public', 'vscd_projects', 'registry table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.vscd_projects'::regclass),
  'RLS is enabled'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'vscd_projects'),
  4,
  'all CRUD policies exist'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'vscd_projects'
      and indexdef like '%(owner_id)%'
  ),
  'owner policy column is indexed'
);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.test');

insert into public.vscd_projects (owner_id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Owner A project', 'owner-a-project'),
  ('22222222-2222-2222-2222-222222222222', 'Owner B project', 'owner-b-project');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is(
  (select count(*)::integer from public.vscd_projects),
  1,
  'an authenticated owner sees only their own rows'
);
select is(
  (select slug from public.vscd_projects limit 1),
  'owner-a-project',
  'cross-user rows are hidden'
);
select lives_ok(
  $$insert into public.vscd_projects (name, slug) values ('New project', 'new-project')$$,
  'owner can insert a row using auth.uid default'
);
select throws_ok(
  $$insert into public.vscd_projects (owner_id, name, slug) values ('22222222-2222-2222-2222-222222222222', 'Attack', 'cross-owner')$$,
  '42501',
  null,
  'owner cannot insert a row for another user'
);

reset role;
select ok(
  not has_table_privilege('anon', 'public.vscd_projects', 'select'),
  'anonymous requests cannot select registry rows'
);

select * from finish();
rollback;
