/**
 * GET /api/auth/linkedin
 * =======================
 * Step 1 of "Sign in with LinkedIn": redirects the browser to LinkedIn's
 * OAuth authorization screen. Requires LINKEDIN_CLIENT_ID and
 * LINKEDIN_REDIRECT_URI to be set as environment variables in your
 * deployment (see LINKEDIN_SETUP.md) — LinkedIn only recognizes redirect
 * URIs you've registered on the app's Auth tab, exact match.
 *
 * The "state" value is a CSRF guard: we generate a random one, stash it in
 * a short-lived cookie, and check it matches when LinkedIn redirects back
 * to /api/auth/callback.
 *
 * Scope includes `w_member_social` (LinkedIn's "Share on LinkedIn" product
 * — self-serve, no app review needed, just switch it on in your LinkedIn
 * app's Products tab) alongside `openid profile email`. That's what lets
 * api/publish/linkedin.js actually publish a post on the signed-in
 * attendee's behalf later — see LINKEDIN_SETUP.md for the exact steps.
 */
import crypto from "node:crypto";

export default function handler(req, res) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(
      "LinkedIn Sign-In isn't configured yet on this deployment. " +
        "Set LINKEDIN_CLIENT_ID and LINKEDIN_REDIRECT_URI as environment " +
        "variables (see LINKEDIN_SETUP.md), then redeploy."
    );
    return;
  }

  const state = crypto.randomBytes(16).toString("hex");
  res.setHeader(
    "Set-Cookie",
    `li_oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email w_member_social",
    state,
  });

  res.writeHead(302, {
    Location: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
  });
  res.end();
}
