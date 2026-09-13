/**
 * GET /api/auth/callback
 * ========================
 * Step 2 of "Fill in with LinkedIn": LinkedIn redirects here with a
 * one-time `code` after someone approves the sign-in screen. This
 * function does the part that must never happen in browser JS — trading
 * that code for an access token using LINKEDIN_CLIENT_SECRET, which would
 * leak instantly if it were sent to the client — then:
 *
 *   1. Exchanges the code for an access token (server-to-server, secret required).
 *   2. Calls LinkedIn's /v2/userinfo with that token to get the person's
 *      verified name, profile photo, and member id (`sub`).
 *   3. Signs a session cookie with name/photo/sub *and* the access token
 *      itself, then sends them back to the form. js/app.js reads the
 *      name/photo (via /api/me) to fill in the Name and Photo fields —
 *      everything else (title, company) is still typed by hand, since
 *      LinkedIn's basic sign-in doesn't expose job title or company. The access token stays server-side always — /api/me
 *      only ever tells the frontend whether one exists (`canPublish`), never
 *      the token itself — and is what api/publish/linkedin.js uses later,
 *      only when the attendee explicitly clicks "Publish," to actually post
 *      on their behalf via LinkedIn's Posts API.
 *
 *      The session cookie's lifetime is clamped to whatever LinkedIn says
 *      the access token is good for (`expires_in`), so we never hold a
 *      token longer than LinkedIn considers it valid.
 *
 * Note: this app has no attendee database to check someone's email against
 * — anyone can sign in and fill in the form (same as anyone can just type
 * their name in by hand). LinkedIn Sign-In here is a convenience, not an
 * access gate.
 */
import { signSession } from "../../lib/session.js";
import { parseCookies } from "../../lib/cookies.js";

export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const redirectHome = (errorCode) => {
    res.writeHead(302, { Location: errorCode ? `/?error=${errorCode}` : "/" });
    res.end();
  };

  if (oauthError) return redirectHome("linkedin_denied");

  const cookies = parseCookies(req.headers.cookie || "");
  if (!state || !cookies.li_oauth_state || state !== cookies.li_oauth_state) {
    return redirectHome("state_mismatch");
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectHome("not_configured");
  }

  try {
    // ── 1. Exchange the code for an access token ──
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("LinkedIn token exchange failed:", tokenData);
      return redirectHome("token_exchange_failed");
    }

    // ── 2. Fetch the signed-in person's profile ──
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    // profile looks like: { sub, name, given_name, family_name, email, email_verified, picture }
    // (no job title / headline — not part of this OpenID Connect scope)

    // ── 3. Sign them in, carrying what api/publish/linkedin.js needs later ──
    // Session lifetime never outlives what LinkedIn says the token is good
    // for (falls back to 60 days, LinkedIn's usual default, if omitted).
    const maxAgeSeconds = Math.min(tokenData.expires_in || 60 * 24 * 60 * 60, 60 * 24 * 60 * 60);
    const session = signSession(
      {
        name: profile.name,
        picture: profile.picture || null,
        sub: profile.sub,
        accessToken: tokenData.access_token,
      },
      maxAgeSeconds
    );

    res.setHeader("Set-Cookie", [
      `pb_session=${session}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; Secure`,
      `li_oauth_state=; Path=/; Max-Age=0`,
    ]);
    res.writeHead(302, { Location: "/" });
    res.end();
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err);
    redirectHome("oauth_failed");
  }
}
