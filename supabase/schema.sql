-- Run in Supabase SQL Editor, in a new Supabase project.
-- Administrator access is assigned separately after creating a user in Authentication > Users.
create extension if not exists pgcrypto;
create table if not exists public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.portfolio (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 1 and 160),
 category text not null, image text not null, description text, storage_path text,
 created_at timestamptz not null default now()
);
create table if not exists public.artists (
 id uuid primary key default gen_random_uuid(), name text not null, genre text not null,
 image text not null, description text, storage_path text, created_at timestamptz not null default now()
);
create table if not exists public.enquiries (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) <= 120),
 email text not null check(char_length(email) <= 190), phone text, service text, event_date date,
 message text not null check(char_length(message) between 1 and 3000),
 status text not null default 'new' check(status in ('new','contacted','closed')),
 created_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
alter table public.admins enable row level security;
alter table public.portfolio enable row level security;
alter table public.artists enable row level security;
alter table public.enquiries enable row level security;
-- No admin INSERT or DELETE policy. Admin access is only granted via SQL Editor.
drop policy if exists "admins can view own role" on public.admins;
create policy "admins can view own role" on public.admins for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "public views portfolio" on public.portfolio;
create policy "public views portfolio" on public.portfolio for select to anon,authenticated using (true);
drop policy if exists "admin manages portfolio" on public.portfolio;
create policy "admin manages portfolio" on public.portfolio for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "public views artists" on public.artists;
create policy "public views artists" on public.artists for select to anon,authenticated using (true);
drop policy if exists "admin manages artists" on public.artists;
create policy "admin manages artists" on public.artists for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "visitors send enquiries" on public.enquiries;
create policy "visitors send enquiries" on public.enquiries for insert to anon, authenticated
 with check(status='new' and char_length(message)<=3000);
drop policy if exists "admins read enquiries" on public.enquiries;
create policy "admins read enquiries" on public.enquiries for select to authenticated using ((select public.is_admin()));
drop policy if exists "admins update enquiries" on public.enquiries;
create policy "admins update enquiries" on public.enquiries for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- Public read, admin-only write images.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('media','media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "public sees media" on storage.objects;
create policy "public sees media" on storage.objects for select to anon,authenticated using(bucket_id='media');
drop policy if exists "admins upload media" on storage.objects;
create policy "admins upload media" on storage.objects for insert to authenticated
with check(bucket_id='media' and (select public.is_admin()));
drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media" on storage.objects for delete to authenticated
using(bucket_id='media' and (select public.is_admin()));
-- Optional starting portfolio
insert into public.portfolio(title,category,image,description) values
('Stories in Motion','Portraits','https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80','Authentic portraits and creative direction.'),
('A Night to Remember','Events','https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80','Every moment deserves to be remembered.'),
('The Sound of the City','Music','https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=80','Putting new talent in the spotlight.');
