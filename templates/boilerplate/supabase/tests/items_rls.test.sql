begin;
select plan(12);
select ok((select relrowsecurity from pg_class where oid = 'public.items'::regclass), 'items RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.auth_email_requests'::regclass), 'auth email request RLS enabled');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='items'), 4, 'all item policies exist');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='items' and indexdef like '%(owner_id)%'), 'owner_id indexed');
select is((select public from storage.buckets where id='attachments'), false, 'attachment bucket is private');
select is((select count(*)::integer from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'Owners%attachments'), 4, 'all storage policies exist');
select ok(
  not has_function_privilege('authenticated', 'public.claim_auth_email_send(text,text)', 'execute'),
  'auth rate-limit function is server-only'
);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.test');
insert into public.items (owner_id, title) values
  ('11111111-1111-1111-1111-111111111111', 'Owner A item'),
  ('22222222-2222-2222-2222-222222222222', 'Owner B item');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(*)::integer from public.items), 1, 'owner sees only one item');
select is((select title from public.items limit 1), 'Owner A item', 'cross-user item is hidden');
select lives_ok($$insert into public.items (title) values ('New owner item')$$, 'owner can insert own item');
select throws_ok(
  $$insert into public.items (owner_id, title) values ('22222222-2222-2222-2222-222222222222', 'Attack')$$,
  '42501',
  null,
  'owner cannot insert for another user'
);

reset role;
select ok(not has_table_privilege('anon', 'public.items', 'select'), 'anonymous users cannot select items');
select * from finish();
rollback;
