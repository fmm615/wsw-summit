/** GET /api/auth/signout — clears the session cookie, redirects home. */
export default function handler(req, res) {
  res.setHeader("Set-Cookie", "pb_session=; Path=/; Max-Age=0");
  res.writeHead(302, { Location: "/" });
  res.end();
}
