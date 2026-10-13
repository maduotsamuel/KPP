# Kushthii Supabase + PostgreSQL edition

This is a **static HTML/CSS/Bootstrap/JavaScript frontend** with a **Supabase PostgreSQL backend**. PHP and MySQL are no longer used. It can be hosted on InfinityFree, GitHub Pages, Cloudflare Pages, Netlify or any static web host. Existing logo, presenter hero and website stylesheet are included.

## 1. Create a Supabase project

Go to https://supabase.com/dashboard and create a project. Supabase provides PostgreSQL, Auth, Storage and an API. In **SQL Editor**, run `supabase/schema.sql` once. The script creates `portfolio`, `artists`, `enquiries`, `admins`, RLS policies and a `media` bucket. The example portfolio content will also be inserted.

## 2. Connect the frontend

Open `assets/js/config.js`. Replace the placeholders with your Supabase **Project URL** and **publishable / anon key** from Supabase settings. A publishable key is meant for frontend use. **Never use the service_role/secret key here.**

## 3. Create the first admin

In Supabase Dashboard, visit **Authentication > Users > Add user**. Create a user with an email you control and a strong unique password. In `supabase/grant-admin.sql`, replace `YOUR_ADMIN_EMAIL@example.com` with that email, then run the SQL in **SQL Editor**. This step is deliberately not public or automated. Enable MFA for the Supabase dashboard. In the website, use `admin.html` to sign in.

## 4. Upload

Upload the **contents** of the website folder directly to `htdocs/`, including `index.html`, other HTML pages, `assets/css/`, `assets/js/` and `assets/img/`. **Do not upload** `supabase/` or `README_DEPLOY.md` into the public web directory. Remove any old `index.php`, `config.php`, `admin/` PHP folder, and root `.htaccess` PHP-blocking rules from previous deployments. If an old PHP site exists, back it up before removing it. On InfinityFree, verify the domain maps to `htdocs`.

## 5. Verify

Check `index.html`, `portfolio.html`, `music.html`, `contact.html` and `admin.html`. Test booking submission, sign-in, item upload, publish/delete and enquiry status. The demo images are from Unsplash and can be replaced in the admin dashboard. `assets/js/config.js` must point to the deployed Supabase project for live content to load.

## Security and operational notes

- PostgreSQL Row Level Security is enabled on each public table. Only approved administrator UUIDs can read enquiries or modify content.
- Anonymous users can **only insert** enquiries, not read them. This needs **production spam protection**, ideally CAPTCHA + a protected Supabase Edge Function with rate limiting. The provided form uses a honeypot but it is not a substitute for server-side abuse prevention.
- Admin images are restricted to JPEG/PNG/WebP and 5 MB in Supabase Storage. Public reads are intentional. Content is HTML-escaped in the frontend.
- The admin sign-in uses Supabase Auth rather than a hard-coded account. Review Supabase Auth rate limits, email settings and password policy. The frontend's password change requires a signed-in administrator.
- Export your old **MySQL** records separately before retiring the existing MySQL database. This package creates new tables but does **not** automatically migrate the actual MySQL records or uploaded image files. Existing image URLs can be migrated manually or by uploading files to Supabase Storage.
- Keep all Supabase service-role and database passwords private. Do not publicly upload SQL files, old PHP config, credentials, local backups or environment files.
- No deployment or Supabase project was provisioned automatically. You must run the SQL and paste your own public credentials.
