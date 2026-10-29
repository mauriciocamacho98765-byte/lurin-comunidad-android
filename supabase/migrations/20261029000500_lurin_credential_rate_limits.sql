create table if not exists public.lurin_identity_rate_limits(identity_bucket text primary key check(length(identity_bucket) between 20 and 130),window_started_at timestamptz not null default now(),hits integer not null default 0 check(hits>=0),updated_at timestamptz not null default now());
alter table public.lurin_identity_rate_limits enable row level security;
revoke all on public.lurin_identity_rate_limits from public,anon,authenticated;
create or replace function public.lurin_take_identity_quota(bucket text,max_hits integer,window_seconds integer)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare hits_now integer;
begin
 if bucket is null or length(bucket) not between 20 and 130 or max_hits not between 1 and 100 or window_seconds not between 30 and 86400 then return false; end if;
 insert into public.lurin_identity_rate_limits as r(identity_bucket,window_started_at,hits,updated_at)
 values(bucket,now(),1,now())
 on conflict(identity_bucket) do update
 set window_started_at=case when r.window_started_at<now()-make_interval(secs=>window_seconds) then now() else r.window_started_at end,
 hits=case when r.window_started_at<now()-make_interval(secs=>window_seconds) then 1 else r.hits+1 end,
 updated_at=now()
 returning hits into hits_now;
 return hits_now<=max_hits;
end;$$;
revoke all on function public.lurin_take_identity_quota(text,integer,integer) from public,anon,authenticated;
grant execute on function public.lurin_take_identity_quota(text,integer,integer) to service_role;
create table if not exists public.lurin_usernames(username text primary key check(username~'^[a-z][a-z0-9_]{2,23}$'),user_id uuid not null unique references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table public.lurin_usernames enable row level security;
revoke all on public.lurin_usernames from public,anon,authenticated;
create index if not exists lurin_identity_rate_limits_time on public.lurin_identity_rate_limits(updated_at);