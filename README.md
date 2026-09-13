# Women Shaping Wealth Summit 2026 — Attendance Personalization Page

A single, shared "I'm Attending" page for the Women Shaping Wealth Summit
2026 — hosted by PLAYBOOK, in alignment with Women Spark, taking place
28–29 September 2026 at The Garage at KACST, Riyadh. This reuses the same
architecture built for the Playbook Awards nominee portal, adapted for
attendance instead of nomination.

**Everyone gets the same link.** There's no per-attendee URL and no
attendee database to maintain. Someone opens the link, types (or
LinkedIn-fills) their own name, job title and company, and the page
instantly builds their personalized graphic and a ready-to-edit
LinkedIn/WhatsApp caption — all client-side, live, as they type.

This is a static, no-build frontend (plain HTML/CSS/JS, ES modules) plus a
handful of small serverless functions under `api/` for one specific job:
completing "Sign in with LinkedIn" without ever exposing your LinkedIn
app's secret to the browser.

## Running it locally

```
node server.js
```

Then open `http://localhost:5173`. `server.js` also runs the `api/`
functions locally (the same files Vercel runs in production), so you can
exercise the LinkedIn flow's redirects and error states without deploying
— see `LINKEDIN_SETUP.md` for what does and doesn't work without real
LinkedIn credentials.

## 1. What was built

- **One shared personalization page.** No slugs, no lookup table, no
  "which attendee is this" logic anywhere in the app.
- A live form (Photo, Full name, Job title, Company) that updates the hero
  greeting, the graphic and the caption as you type — nothing is submitted
  anywhere; it all happens in the browser.
- **A manual photo upload**, so anyone can personalize their card with
  their own headshot even without LinkedIn — pick a file, see it in the
  graphic instantly, and remove it to fall back to their initials.
- **"Fill in with LinkedIn"** — see "How LinkedIn auto-fill actually works"
  below for exactly what this does and doesn't fill in.
- **Real one-click publishing to LinkedIn** (once signed in with posting
  permission) — "Post to LinkedIn" becomes "Publish to LinkedIn" and, after
  a confirmation step, actually posts the caption + graphic straight to the
  attendee's own LinkedIn profile via LinkedIn's official API. No
  copy/paste needed. Falls back to the copy-caption-and-open-LinkedIn flow
  for anyone who hasn't signed in (or on a deployment without the LinkedIn
  setup done — see `LINKEDIN_SETUP.md`).
- A canvas-generated, on-brand shareable graphic built from your supplied
  Summit artwork (name, title/company, headshot-or-monogram), downloadable
  as a PNG.
- A share section: a prominent "Post to LinkedIn" button, a "Share via
  WhatsApp" button with the caption pre-filled, and a "Copy caption" button
  with an editable caption textarea and an on-click confirmation.
- Mobile-first design matching the real Summit brand (white background,
  deep navy-purple ink, neon-green accent, bold geometric sans headlines) —
  colors and typography sampled directly from the supplied artwork and
  get-playbook.com/women-shaping-wealth, tested at phone and desktop
  widths.
- Empty-state placeholders everywhere (hero, graphic, caption) so the page
  looks intentional before anyone has typed anything.
- A lightweight local analytics stub (page views, downloads, caption
  copies, share clicks, LinkedIn fills) logging to the console now, with a
  single clearly marked spot to swap in real analytics later.
- Deploy-ready config (`vercel.json`) so the page and the `/api/*`
  LinkedIn routes resolve correctly once hosted on Vercel.

**Deliberately not built**: an attendee database, CSV upload UI, an admin
dashboard, and automated emails — same "don't overbuild" approach as the
Awards portal. There's also no "which track are you attending" field; if
you want one (the Summit's three tracks — Money in Motion, Wealth in
Wellbeing, Power in Networks — would be the natural options), it's a small
addition to `js/components/form.js` and `js/app.js`, just say the word.

## 2. How LinkedIn auto-fill actually works — and its one real limit

Clicking **"Fill in with LinkedIn"** sends the person through LinkedIn's
official sign-in screen. Once they approve, LinkedIn hands the app back:

- their **name**
- their **profile photo**

That's it. **LinkedIn's standard Sign-In product does not expose job
title, headline, or current company** — those fields live behind
LinkedIn's separate, invite-only Marketing/Talent partner APIs, which
aren't something any app can just apply for. So:

- **Full name** and **photo** → auto-filled from LinkedIn, editable after.
- **Job title** and **Company** → always typed in by hand. There's no way
  around this without a different, much more restricted LinkedIn API
  relationship — it's a platform limit, not a gap in this build.

The photo field also has a manual upload right next to it — anyone without
a LinkedIn photo they like (or who'd rather not sign in at all) can just
pick their own image file instead, at any time. Uploading always overrides
whatever's already there, including a LinkedIn photo, and a "Remove" link
clears it back to the initials monogram.

### Real publishing, not just autofill

Signing in also requests LinkedIn's `w_member_social` permission ("Share
on LinkedIn" — self-serve, no LinkedIn review needed, see
`LINKEDIN_SETUP.md`). That's what upgrades "Post to LinkedIn" into
"Publish to LinkedIn": clicking it shows a confirmation ("publish this
now?"), and confirming calls LinkedIn's own Posts API server-side to
create a real post — the caption and the personalized graphic — directly
on the attendee's profile. Nobody's post goes up without that explicit
confirm click; declining to sign in, or declining to confirm, always falls
back to the manual copy-caption-and-attach-the-photo flow instead. The
disclaimer text under the LinkedIn button is upfront about this — signing
in is what grants posting ability, not just autofill.

Full OAuth setup (LinkedIn app, environment variables, deploying so the
flow can complete) is in `LINKEDIN_SETUP.md`.

## 3. Editing the Summit details or caption

Open `js/copy.js` — `EVENT_CONFIG` at the top has the event name, host,
dates, venue and hashtags, and `buildDefaultCaption()` just below it is the
template for the default caption text. Edit either without touching
anything else; `js/components/hero.js` and `js/components/footer.js` both
read from `EVENT_CONFIG` directly.

## 4. How to replace the graphic/design

Done for this build — `assets/template-bg.png` is your supplied Summit
banner (1920×1080), and `js/graphicGenerator.js` draws it as the
background, then paints the attendee's name and title/company over the
areas that were placeholder content in that file ("ATTENDEE NAME" and
"ATTENDEE TITLE AND COMPANY"), and their headshot or initials over the
placeholder cloud/hill icon circle.

If you send an updated export of the artwork, drop it in as
`assets/template-bg.png` (same filename, same 1920×1080 size) and it'll
just work, as long as the layout hasn't moved. If the layout *has*
changed — text moved, the circle resized, etc. — re-check the pixel
coordinates in `TEMPLATE.layout` inside `js/graphicGenerator.js` (there's
one block per element, each with a comment) and adjust them to match; they
were measured directly off the current artwork.

## 5. Putting this on your own domain — and going live today

**Vercel is the recommended (and only fully wired-up) host**, because it
runs the `api/` folder as serverless functions with zero configuration —
which is what LinkedIn Sign-In needs.

From inside this folder:

```
npx vercel
```

(log in with your own free Vercel account when prompted — that step is
yours, not something I can do for you). That gives you a live URL in
under a minute, e.g. `https://wsw-summit-2026.vercel.app`. Attach a custom
domain afterward from the Vercel dashboard whenever you're ready — no code
changes needed. If you'd rather do this by clicking through the Vercel
dashboard instead of a terminal, that works too — just ask.

The page itself — form, live graphic, downloads, caption, sharing — is
fully live the moment it deploys. LinkedIn's name+photo auto-fill needs
one more step (your own LinkedIn app + a few environment variables) —
walked through start to finish in `LINKEDIN_SETUP.md`. Until that's set
up, "Fill in with LinkedIn" will show a friendly explanation instead of
signing anyone in.

*(Netlify would need the `api/` functions adapted to its own functions
convention — not done here, since Vercel's zero-config match to our
existing static setup made it the simpler choice for one platform to fully
support.)*

## 6. What still needs to be connected for production

- **Your LinkedIn app + environment variables** — the OAuth code is done,
  but it only activates once you create a LinkedIn Developer app and set
  `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`
  and `SESSION_SECRET` on your deployment. Full walkthrough in
  `LINKEDIN_SETUP.md`.
- **Real analytics** — `js/analytics.js` currently just logs events
  locally; wire in GA4/Segment/your own endpoint there (one file, five
  call sites already instrumented: page view, LinkedIn fill, download,
  caption copy, share click).
- **Distributing the one link** — since there's no per-attendee URL to
  send, decide how you'll get people to the shared link (email blast, a
  line in the confirmation email, a QR code on printed materials, etc.) —
  that's a messaging decision on your side, not a code change.
