/**
 * GET /api/me
 * ============
 * Reads the signed session cookie (set by api/auth/callback.js) and
 * returns whether someone is currently signed in via LinkedIn, and with
 * what profile. The frontend (js/app.js) calls this to decide what to
 * show — it never reads the cookie itself.
 *
 * `canPublish` tells the frontend whether api/publish/linkedin.js is
 * usable for this visitor (i.e. their session carries a LinkedIn access
 * token) — the token itself never leaves the server, only this boolean.
 */
import { verifySession } from "../lib/session.js";
import { parseCookies } from "../lib/cookies.js";

export default function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  const session = verifySession(cookies.pb_session);

  res.writeHead(200, { "Content-Type": "application/json" });
  if (!session) {
    res.end(JSON.stringify({ signedIn: false, canPublish: false }));
    return;
  }

  res.end(
    JSON.stringify({
      signedIn: true,
      name: session.name,
      picture: session.picture,
      canPublish: Boolean(session.accessToken && session.sub),
    })
  );
}
