alter table public.vscd_projects
alter column providers set default
  '{"deployment":{"provider":"vercel"},"backend":{"provider":"supabase"},"designSystem":true}'::jsonb;

update public.vscd_projects
set providers =
  jsonb_build_object(
    'deployment',
      jsonb_build_object(
        'provider',
        case
          when providers ? 'netlify' and providers -> 'netlify' <> 'false'::jsonb then 'netlify'
          else 'vercel'
        end
      ) || case
        when jsonb_typeof(providers -> 'netlify') = 'object' then providers -> 'netlify'
        when jsonb_typeof(providers -> 'vercel') = 'object' then providers -> 'vercel'
        else '{}'::jsonb
      end,
    'backend',
      jsonb_build_object(
        'provider',
        case
          when providers ? 'firebase' and providers -> 'firebase' <> 'false'::jsonb then 'firebase'
          else 'supabase'
        end
      ) || case
        when jsonb_typeof(providers -> 'firebase') = 'object' then providers -> 'firebase'
        when jsonb_typeof(providers -> 'supabase') = 'object' then providers -> 'supabase'
        else '{}'::jsonb
      end,
    'designSystem', coalesce(providers -> 'designSystem', 'true'::jsonb)
  )
  || case
    when providers ? 'hostinger' and providers -> 'hostinger' <> 'false'::jsonb then
      jsonb_build_object(
        'dns',
        jsonb_build_object('provider', 'hostinger') || case
          when jsonb_typeof(providers -> 'hostinger') = 'object'
            then (providers -> 'hostinger') - 'mail'
          else '{}'::jsonb
        end
      )
    when providers ? 'cloudflare' and providers -> 'cloudflare' <> 'false'::jsonb then
      jsonb_build_object(
        'dns',
        jsonb_build_object('provider', 'cloudflare', 'proxied', false) || case
          when jsonb_typeof(providers -> 'cloudflare') = 'object' then providers -> 'cloudflare'
          else '{}'::jsonb
        end
      )
    else '{}'::jsonb
  end
  || case
    when jsonb_typeof(providers #> '{hostinger,mail}') = 'object'
      then jsonb_build_object('mail', providers #> '{hostinger,mail}')
    else '{}'::jsonb
  end
where not (providers ? 'deployment' and providers ? 'backend');
