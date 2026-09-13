/**
 * MINIMAL SIGNED SESSION (no dependencies)
 * =========================================
 * A tiny stand-in for a real session/JWT library, since this project is
 * intentionally zero-dependency. It signs a JSON payload with HMAC-SHA256
 * so the browser can hold it in a cookie without being able to forge or
 * read secrets out of it — it can still read the payload itself (it's
 * base64, not encrypted), so never put anything truly secret in here
 * (this app only ever stores a name and a photo URL, which is fine).
 *
 * SESSION_SECRET must be set in your deployment's environment variables
 * (Vercel → Project → Settings → Environment Variables). Locally, a dev
 * fallback is used so the app doesn't crash — never rely on that in
 * production.
 */
import crypto from "node:crypto";

const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecodeToString(str) {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  return Buffer.from(padded, "base64").toString("utf8");
}

function hmac(data) {
  return base64url(crypto.createHmac("sha256", SECRET).update(data).digest());
}

/** Signs `payload` (a plain object) into a compact `data.signature` token. */
export function signSession(payload, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const body = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
  const data = base64url(JSON.stringify(body));
  return `${data}.${hmac(data)}`;
}

/** Verifies a token from signSession(); returns the payload or null. */
export function verifySession(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [data, signature] = token.split(".");
  const expected = hmac(data);

  const a = Buffer.from(signature || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64urlDecodeToString(data));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
