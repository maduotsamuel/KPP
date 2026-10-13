-- First: Supabase Authentication > Users > Add user (email/password).
-- Replace example email. Run in SQL Editor. Never use a public website signup to grant admin.
insert into public.admins(user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict(user_id) do nothing;
-- Confirm one row was returned:
select a.user_id, u.email from public.admins a join auth.users u on u.id=a.user_id;
