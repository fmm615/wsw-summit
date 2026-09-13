# Setting up "Fill in with LinkedIn" (and real publishing)

This app can pull an attendee's **name and profile photo** straight from
LinkedIn, so they don't have to type or upload either — and, once signed
in, it can also **publish their post directly to their own LinkedIn
profile** (caption + graphic, via LinkedIn's official Posts API), no
copy/paste needed. The code for both is already built
(`api/auth/linkedin.js`, `api/auth/callback.js`, `api/me.js`,
`api/publish/linkedin.js`). To make it work for real, you need two things
only you can set up: a LinkedIn app (with two products enabled — both
self-serve, no LinkedIn review needed), and a deployment with the right
environment variables.

**Read this first if you're expecting LinkedIn to fill in job title or
company too — it can't.** LinkedIn's standard "Sign In with LinkedIn using
OpenID Connect" product (the one every app uses, including this one) only
ever returns a person's name, email, and profile photo. Job title,
headline and current employer are not part of that product — they live
behind LinkedIn's separate Marketing/Talent Partner APIs, which require a
formal partnership LinkedIn grants selectively and which no app can just
sign up for. So in this app, **name and photo auto-fill; job title and
company are always typed in by hand.** That's a platform limit, not
something more setup effort gets around.

## Why this needs a real server (not just a link you can open)

LinkedIn's sign-in flow requires a **client secret** to complete — and a
client secret must never be visible in a browser (anyone could open dev
tools and steal it). That's why this isn't purely client-side: the code
under `api/` runs on the server, keeps the secret there, and only ever
sends the browser a normal cookie. Deploying to Vercel (or similar) is
what turns this on for real.

## Step 1 — Create a LinkedIn app

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) and click **Create app**.
2. Fill in the app name (e.g. "Women Shaping Wealth Summit 2026"), and
   link it to a LinkedIn **Company Page** you administer (LinkedIn
   requires every app to be tied to a Page — use PLAYBOOK's or Women
   Spark's page; create one first under "Create a Company Page" if you
   don't have one yet).
3. Upload a logo, accept the terms, and create the app.
4. Open the **Products** tab and add **both** of these — each is
   self-serve (switches on instantly, no application or review):
   - **"Sign In with LinkedIn using OpenID Connect"** — gives you the
     name/photo autofill.
   - **"Share on LinkedIn"** — gives you the `w_member_social` permission
     that lets a signed-in attendee actually publish a post through this
     app. (Everything beyond posting to a *member's own* profile — Pages,
     analytics, ads — sits behind LinkedIn's Marketing/Community
     Management APIs, which *do* require a formal application; this app
     doesn't use or need any of that.)
5. Open the **Auth** tab. You'll see your **Client ID** and **Client
   Secret** — you'll need both in Step 3. Under **Authorized redirect URLs
   for your app**, add:
   ```
   https://YOUR-DOMAIN.com/api/auth/callback
   ```
   (Use your real domain once you know it — see Step 2. You can add more
   than one redirect URL, e.g. one for a Vercel preview URL and one for
   your final custom domain.)

## Step 2 — Deploy the app

This project deploys to Vercel with zero configuration (the `api/` folder
becomes serverless functions automatically; `vercel.json` already handles
routing). From a terminal, inside the project folder:

```
npx vercel
```

Follow the prompts (log in with your own Vercel account if asked — this
does not require anything from us). Vercel will give you a live URL like
`https://wsw-summit-2026.vercel.app`. Note it down — that's your
`YOUR-DOMAIN.com` above (go back and add it to LinkedIn's redirect URLs if
you used a placeholder).

Prefer a UI over a terminal? Go to [vercel.com/new](https://vercel.com/new)
or [vercel.com/drop](https://vercel.com/drop), upload/import this folder,
and click Deploy — same result. Ask if you'd like the click-by-click
version of these steps.

Once you have a custom domain, add it in Vercel's project settings and add
its `/api/auth/callback` URL to LinkedIn too (LinkedIn checks for an exact
match, so keep both the `.vercel.app` and your custom domain registered
while you're testing).

## Step 3 — Set environment variables

In your Vercel project: **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `LINKEDIN_CLIENT_ID` | from the LinkedIn app's Auth tab |
| `LINKEDIN_CLIENT_SECRET` | from the LinkedIn app's Auth tab (keep this private) |
| `LINKEDIN_REDIRECT_URI` | `https://YOUR-DOMAIN.com/api/auth/callback` — must exactly match what you added in LinkedIn |
| `SESSION_SECRET` | any long random string, e.g. run `openssl rand -hex 32` locally and paste the result |

Redeploy after adding these — Vercel does **not** auto-redeploy when you
add environment variables. Go to **Deployments**, open the "..." menu on
the latest deployment, and choose **Redeploy**.

## Step 4 — Test it

Visit `https://YOUR-DOMAIN.com` and click **"Fill in with LinkedIn."**
You'll be sent to LinkedIn's real sign-in/consent screen — since the
"Share on LinkedIn" product is on, this screen will mention posting on
your behalf, not just sharing your name and photo; that's expected and
correct. After approving, you're sent straight back to the page with your
name and photo already in the form, and the "Post to LinkedIn" button has
become **"Publish to LinkedIn."** Click it, confirm in the panel that
appears, and check your LinkedIn profile — you should see a real post
with your caption and graphic. Job title and company stay blank, waiting
for you to type them — that's expected (see the note at the top of this
file).

If publishing fails, check your server logs (Vercel's function logs) for
the actual LinkedIn API error — `api/publish/linkedin.js` logs the full
response before returning a generic message to the browser.

## What "Fill in with LinkedIn" does and doesn't do

- It **verifies who someone is** and hands back their name and photo —
  nothing about the Summit, and nothing about their job.
- With "Share on LinkedIn" enabled, it also grants this app permission to
  **publish a post on that person's behalf** — but only when they
  explicitly click "Publish to LinkedIn" and then confirm; signing in by
  itself never posts anything.
- It does **not** look anyone up against an attendee list, because this
  app doesn't have one — every visitor uses the same link and personalizes
  their own copy of the page. There's nothing to "match" against.
- Job title and company are **always manual** — this is a LinkedIn
  platform limit (see the top of this file), not a step you can configure
  your way around.
