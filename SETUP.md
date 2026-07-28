# Setting up the admin dashboard

This connects your site to a free database (Supabase) and email sender (Resend) so the
newsletter signup, vendor applications, and admin dashboard actually work. Takes about
15-20 minutes, all free.

## 1. Create your Supabase project
1. Go to https://supabase.com, sign up, and create a new project (pick any name/region).
2. Wait ~2 minutes for it to finish setting up.
3. In the left sidebar, go to **Storage**, click **New bucket**, name it exactly
   `vendor-uploads`, and toggle it to **Public**. This is where vendor photo and
   COA certificate uploads get stored.
4. Then go to **SQL Editor** > **New query**:
   - **First time setting this up?** Paste in the entire contents of `supabase/schema.sql`
     and click **Run**. This creates your tables (subscribers, vendor_applications) and
     locks them down so only you can read them.
   - **Already ran schema.sql before?** Instead, paste in the contents of
     `supabase/migration_vendor_uploads.sql` and run that - it adds the new vendor form
     fields (website, social link, category, photo/COA uploads) without losing any
     applications you already have.

## 2. Get your API keys
1. In Supabase, go to **Project Settings > API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `config.js` in this folder and paste them in:
   ```js
   window.SUPABASE_URL = "https://xxxxx.supabase.co";
   window.SUPABASE_ANON_KEY = "eyJhbGciOि...";
   ```

## 3. Create your admin login
1. In Supabase, go to **Authentication > Users > Add user**.
2. Enter your own email and a password. Leave "Auto Confirm User" checked.
3. This is the email/password you'll use to log into `admin.html`.

## 4. Create a Resend account (for sending real emails)
1. Go to https://resend.com and sign up (free tier: 3,000 emails/month).
2. Go to **API Keys** and create one. Copy it (starts with `re_`).
3. Go to **Domains** and add your domain (`midrandfarmersmarket.co.za`), then add the DNS
   records Resend gives you into your GoDaddy DNS page (same place you edited the A records
   earlier). This step is what lets emails send *from* your own domain instead of a test
   address, so subscribers see it come from you. It can take up to a few hours to verify.
   - While waiting, you can still test everything using Resend's default
     `onboarding@resend.dev` sender address.

## 5. Deploy the two Edge Functions
These are the only two pieces of server-side code - they send the emails without ever
exposing your Resend key in the browser. You'll need Node.js installed on your computer.

1. Install the Supabase CLI:
   ```
   npm install -g supabase
   ```
2. Log in and link your project (find your project ref in the Supabase dashboard URL):
   ```
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   ```
3. Set your secrets (paste your real Resend key and sender address):
   ```
   supabase secrets set RESEND_API_KEY=re_your_key_here
   supabase secrets set RESEND_FROM="Midrand Farmers Market <news@midrandfarmersmarket.co.za>"
   ```
   (Use `onboarding@resend.dev` as the RESEND_FROM address until your domain is verified.)
4. Deploy both functions:
   ```
   supabase functions deploy send-newsletter
   supabase functions deploy notify-vendor
   ```

## 6. Push everything to GitHub
Commit and push all the files in this folder (including `config.js` with your real keys -
the anon key is safe to expose publicly, that's how Supabase is designed to work).
GitHub Pages will redeploy automatically.

## 7. Try it out
- Visit `yoursite.co.za/admin.html`, log in with the email/password from step 3.
- Sign up for the newsletter on the homepage, check it appears under Newsletter tab's
  subscriber count.
- Submit a test vendor application on `application.html`, then approve or decline it
  from the dashboard - the vendor should get an email automatically.

## Notes
- `admin.html` isn't linked anywhere in the site's navigation - only people with the
  direct URL and your login can reach it.
- If anything returns an error in the dashboard, open your browser's dev console
  (F12 > Console tab) - the error message there usually says exactly what's missing.
