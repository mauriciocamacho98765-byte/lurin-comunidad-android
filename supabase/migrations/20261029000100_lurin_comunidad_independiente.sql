-- Lurín Comunidad - FUTURO backend opcional de la beta pública.
-- Aplicar solamente a un NUEVO proyecto Supabase de Lurín, NUNCA al de NEXUS.
-- El APK v0.1.0 funciona en modo local y no usa estas tablas todavía.

create extension if not exists pgcrypto with schema extensions;

create table public.lurin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 2 and 70),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_path text,
  created_at timestamptz not null default now()
);
create table public.lurin_places (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 130),
  summary text not null default '',
  category text not null check (category in ('historia','naturaleza','gastronomia','experiencias')),
  zone text not null default 'Lurín',
  cover_path text,
  published boolean not null default false
);
create table public.lurin_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.lurin_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 6 and 140),
  body text not null check (char_length(body) between 15 and 3500),
  category text not null default 'historia' check (category in ('historia','foto','tradicion','recomendacion')),
  image_path text,
  place_id uuid references public.lurin_places(id) on delete set null,
  state text not null default 'pending' check (state in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);
create index lurin_posts_recent on public.lurin_posts (created_at desc);
create index lurin_posts_author on public.lurin_posts (author_id, created_at desc);
create table public.lurin_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.lurin_posts(id) on delete cascade,
  author_id uuid not null references public.lurin_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 600),
  created_at timestamptz not null default now()
);
create index lurin_comments_post on public.lurin_comments (post_id, created_at);
create table public.lurin_likes (
  author_id uuid not null references public.lurin_profiles(id) on delete cascade,
  post_id uuid not null references public.lurin_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (author_id, post_id)
);
create index lurin_likes_post on public.lurin_likes (post_id);
create table public.lurin_follows (
  follower_id uuid not null references public.lurin_profiles(id) on delete cascade,
  followed_id uuid not null references public.lurin_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_follow check (follower_id <> followed_id),
  primary key (follower_id, followed_id)
);
create table public.lurin_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reward_points integer not null check (reward_points between 0 and 5000),
  active boolean not null default false,
  check (ends_at > starts_at)
);
create table public.lurin_challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.lurin_challenges(id) on delete cascade,
  author_id uuid not null references public.lurin_profiles(id) on delete cascade,
  description text not null check (char_length(description) between 20 and 800),
  photo_path text,
  review_state text not null default 'pending' check (review_state in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique(challenge_id, author_id)
);
create table public.lurin_point_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.lurin_profiles(id) on delete cascade,
  amount integer not null check (amount between -5000 and 5000 and amount <> 0),
  reason text not null,
  source_event uuid,
  created_at timestamptz not null default now()
);
create index lurin_points_user on public.lurin_point_ledger (user_id, created_at desc);
create table public.lurin_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  cost_points integer not null check (cost_points > 0),
  provider text not null,
  active boolean not null default false
);
create table public.lurin_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.lurin_profiles(id) on delete cascade,
  reward_id uuid not null references public.lurin_rewards(id),
  state text not null default 'pending' check (state in ('pending','validated','used','cancelled')),
  created_at timestamptz not null default now()
);
create table public.lurin_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  zone text not null default 'Lurín',
  visible boolean not null default false,
  check (ends_at > starts_at)
);
create table public.lurin_event_attendees (
  event_id uuid not null references public.lurin_events(id) on delete cascade,
  user_id uuid not null references public.lurin_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(event_id, user_id)
);
create table public.lurin_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 90),
  description text not null default '',
  is_public boolean not null default false
);
create table public.lurin_room_members (
  room_id uuid not null references public.lurin_rooms(id) on delete cascade,
  user_id uuid not null references public.lurin_profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(room_id, user_id)
);
create table public.lurin_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.lurin_rooms(id) on delete cascade,
  author_id uuid not null references public.lurin_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index lurin_messages_room on public.lurin_messages(room_id, created_at);
create table public.lurin_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.lurin_profiles(id) on delete cascade,
  post_id uuid references public.lurin_posts(id) on delete set null,
  reason text not null check (char_length(reason) between 10 and 700),
  created_at timestamptz not null default now(),
  check (post_id is not null)
);

-- Expose only narrow client privileges, RLS is mandatory on every table.
revoke all on table public.lurin_profiles,public.lurin_places,public.lurin_posts,
 public.lurin_comments,public.lurin_likes,public.lurin_follows,public.lurin_challenges,
 public.lurin_challenge_submissions,public.lurin_point_ledger,public.lurin_rewards,
 public.lurin_redemptions,public.lurin_events,public.lurin_event_attendees,
 public.lurin_rooms,public.lurin_room_members,public.lurin_messages,public.lurin_reports
 from anon, authenticated;

do $$ declare t text; begin
 foreach t in array array[
   'lurin_profiles','lurin_places','lurin_posts','lurin_comments','lurin_likes',
   'lurin_follows','lurin_challenges','lurin_challenge_submissions','lurin_point_ledger',
   'lurin_rewards','lurin_redemptions','lurin_events','lurin_event_attendees',
   'lurin_rooms','lurin_room_members','lurin_messages','lurin_reports']
 loop
   execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;

-- Profiles: public names and avatars, but only self can create/edit self.
grant select on public.lurin_profiles to anon, authenticated;
grant insert, update on public.lurin_profiles to authenticated;
create policy "public display profiles" on public.lurin_profiles for select using (true);
create policy "insert self" on public.lurin_profiles for insert to authenticated
 with check (id=(select auth.uid()));
create policy "update self" on public.lurin_profiles for update to authenticated
 using (id=(select auth.uid())) with check(id=(select auth.uid()));

-- Curated content is readable by anyone but writable only by server admins.
grant select on public.lurin_places, public.lurin_challenges, public.lurin_rewards,
 public.lurin_events, public.lurin_rooms to anon, authenticated;
create policy "published places" on public.lurin_places for select using (published);
create policy "active challenges" on public.lurin_challenges for select using (active);
create policy "active rewards" on public.lurin_rewards for select using (active);
create policy "visible events" on public.lurin_events for select using (visible);
create policy "public rooms" on public.lurin_rooms for select using (is_public);

-- Posts go to moderation queue: users cannot self-approve to public feed.
grant select on public.lurin_posts to anon,authenticated;
grant insert (author_id,title,body,category,image_path,place_id) on public.lurin_posts to authenticated;
create policy "published or own posts" on public.lurin_posts for select
 using (state='published' or author_id=(select auth.uid()));
create policy "submit own post pending moderation" on public.lurin_posts for insert to authenticated
 with check(author_id=(select auth.uid()) and state='pending');

-- Comments/likes only on published posts, and only with own identity.
grant select on public.lurin_comments,public.lurin_likes to anon,authenticated;
grant insert (post_id,author_id,body) on public.lurin_comments to authenticated;
grant insert (author_id,post_id) on public.lurin_likes to authenticated;
grant delete on public.lurin_likes to authenticated;
create policy "read public post comments" on public.lurin_comments for select using (
 exists(select 1 from public.lurin_posts p where p.id=post_id and p.state='published')
 or author_id=(select auth.uid()));
create policy "comment on public post" on public.lurin_comments for insert to authenticated with check (
 author_id=(select auth.uid()) and exists(select 1 from public.lurin_posts p where p.id=post_id and p.state='published'));
create policy "read likes on public posts" on public.lurin_likes for select using (
 exists(select 1 from public.lurin_posts p where p.id=post_id and p.state='published'));
create policy "like published post as self" on public.lurin_likes for insert to authenticated with check (
 author_id=(select auth.uid()) and exists(select 1 from public.lurin_posts p where p.id=post_id and p.state='published'));
create policy "unlike own" on public.lurin_likes for delete to authenticated using (author_id=(select auth.uid()));

grant select,insert,delete on public.lurin_follows to authenticated;
create policy "read follows" on public.lurin_follows for select to authenticated using(true);
create policy "follow as self" on public.lurin_follows for insert to authenticated
 with check(follower_id=(select auth.uid()));
create policy "unfollow as self" on public.lurin_follows for delete to authenticated
 using(follower_id=(select auth.uid()));

-- Submissions cannot be approved or rewarded from a client.
grant select on public.lurin_challenge_submissions to authenticated;
grant insert (challenge_id,author_id,description,photo_path) on public.lurin_challenge_submissions to authenticated;
create policy "own and approved challenge entries" on public.lurin_challenge_submissions for select to authenticated
 using(author_id=(select auth.uid()) or review_state='approved');
create policy "submit pending challenge" on public.lurin_challenge_submissions for insert to authenticated
 with check(author_id=(select auth.uid()) and review_state='pending');

-- Ledger and redemptions have no direct client write policy, protect against point minting.
grant select on public.lurin_point_ledger, public.lurin_redemptions to authenticated;
create policy "read own ledger" on public.lurin_point_ledger for select to authenticated
 using(user_id=(select auth.uid()));
create policy "read own redemptions" on public.lurin_redemptions for select to authenticated
 using(user_id=(select auth.uid()));

grant select,insert on public.lurin_event_attendees to authenticated;
grant delete on public.lurin_event_attendees to authenticated;
create policy "read own event subscriptions" on public.lurin_event_attendees for select to authenticated
 using(user_id=(select auth.uid()));
create policy "attend visible event" on public.lurin_event_attendees for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.lurin_events e where e.id=event_id and e.visible));
create policy "unattend own event" on public.lurin_event_attendees for delete to authenticated
 using(user_id=(select auth.uid()));

-- Public group membership, not private messages available by default.
grant select,insert,delete on public.lurin_room_members to authenticated;
create policy "see own membership" on public.lurin_room_members for select to authenticated
 using(user_id=(select auth.uid()));
create policy "join public room" on public.lurin_room_members for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.lurin_rooms r where r.id=room_id and r.is_public));
create policy "leave own room" on public.lurin_room_members for delete to authenticated
 using(user_id=(select auth.uid()));
grant select on public.lurin_messages to authenticated;
grant insert (room_id,author_id,body) on public.lurin_messages to authenticated;
create policy "messages in own rooms" on public.lurin_messages for select to authenticated using (
 exists(select 1 from public.lurin_room_members rm where rm.room_id=room_id and rm.user_id=(select auth.uid())));
create policy "message as member" on public.lurin_messages for insert to authenticated with check (
 author_id=(select auth.uid()) and exists(select 1 from public.lurin_room_members rm where rm.room_id=room_id and rm.user_id=(select auth.uid())));

-- Reports: private from other users.
grant insert (reporter_id,post_id,reason) on public.lurin_reports to authenticated;
grant select on public.lurin_reports to authenticated;
create policy "report as self" on public.lurin_reports for insert to authenticated
 with check(reporter_id=(select auth.uid()));
create policy "read own reports" on public.lurin_reports for select to authenticated
 using(reporter_id=(select auth.uid()));

-- IMPORTANT: No points RPC and no commercial redemptions are enabled until
-- server verification, rate limits, moderation and merchant agreements exist.
