-- Public point totals with RLS; no publicly executable SECURITY DEFINER leaderboard RPC.
-- Applied to dedicated Lurin Comunidad Publica project 2026-10-29.
create table public.lurin_public_totals(
 user_id uuid primary key references public.lurin_profiles(id) on delete cascade,
 total_points bigint not null default 0 check(total_points>=0),
 updated_at timestamptz not null default now());
alter table public.lurin_public_totals enable row level security;
revoke all on public.lurin_public_totals from anon, authenticated;
grant select on public.lurin_public_totals to authenticated;
create policy "read public points totals" on public.lurin_public_totals
 for select to authenticated using(true);
create or replace function public.lurin_update_public_totals()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 insert into public.lurin_public_totals(user_id,total_points) values(new.user_id,new.amount)
 on conflict(user_id) do update
 set total_points=public.lurin_public_totals.total_points+excluded.total_points, updated_at=now();
 return new;
end;$$;
revoke all on function public.lurin_update_public_totals() from public,anon,authenticated;
create trigger tr_lurin_update_public_totals after insert on public.lurin_point_ledger
for each row execute function public.lurin_update_public_totals();
insert into public.lurin_public_totals(user_id,total_points)
select user_id,sum(amount)::bigint from public.lurin_point_ledger group by user_id
on conflict(user_id) do update set total_points=excluded.total_points,updated_at=now();
create or replace function public.lurin_top_raices()
returns table(user_id uuid,display_name text,total_points bigint)
language sql stable security invoker set search_path=pg_catalog,public as $$
select p.id,p.display_name,t.total_points
from public.lurin_public_totals t join public.lurin_profiles p on p.id=t.user_id
where auth.uid() is not null order by t.total_points desc,p.display_name asc limit 50;
$$;
revoke all on function public.lurin_top_raices() from public,anon;
grant execute on function public.lurin_top_raices() to authenticated;
create index if not exists lurin_comments_author_recent on public.lurin_comments(author_id,created_at desc);
create index if not exists lurin_submission_author on public.lurin_challenge_submissions(author_id);
create index if not exists lurin_event_attendees_user on public.lurin_event_attendees(user_id);
create index if not exists lurin_follows_followed on public.lurin_follows(followed_id);
create index if not exists lurin_messages_author on public.lurin_messages(author_id);
create index if not exists lurin_posts_place on public.lurin_posts(place_id);
create index if not exists lurin_redemptions_user on public.lurin_redemptions(user_id);
create index if not exists lurin_redemptions_reward on public.lurin_redemptions(reward_id);
create index if not exists lurin_reports_reporter on public.lurin_reports(reporter_id);
create index if not exists lurin_room_members_user on public.lurin_room_members(user_id);
create index if not exists lurin_points_daily on public.lurin_point_ledger(user_id,reason,created_at desc);
