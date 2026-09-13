/**
 * MINIMAL ENCRYPTED SESSION (no dependencies)
 * =============================================
 * A tiny stand-in for a real session/JWT library, since this project is
 * intentionally zero-dependency. The session carries a LinkedIn access
 * token (see api/auth/callback.js) — a real bearer credential capable of
 * posting on someone's behalf — so the payload is encrypted with
 * AES-256-GCM (not just signed), meaning the cookie's contents can't be
 * read even by whoever holds the cookie value, only verified/decrypted by
 * this server. GCM's auth tag also rejects any tampering, so a forged or
 * modified cookie fails the same as an unreadable one.
 *
 * SESSION_SECRET must be set in your deployment's environment variables
 * (Vercel → Project → Settings → Environment Variables). Locally, a dev
 * fallback is used so the app doesn't crash — never rely on that in
 * production.
 */
import crypto from "node:crypto";

const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
const KEY = crypto.createHash("sha256").update(SECRET).digest(); // 32 bytes, for AES-256

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(str) {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  return Buffer.from(padded, "base64");
}

/** Encrypts `payload` (a plain object) into a compact, opaque token. */
export function signSession(payload, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const body = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(body), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${base64url(iv)}.${base64url(authTag)}.${base64url(ciphertext)}`;
}

/** Decrypts a token from signSession(); returns the payload or null if invalid/expired/tampered. */
export function verifySession(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const [ivPart, authTagPart, ciphertextPart] = parts;
    const iv = base64urlToBuffer(ivPart);
    const authTag = base64urlToBuffer(authTagPart);
    const ciphertext = base64urlToBuffer(ciphertextPart);

    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    const payload = JSON.parse(plaintext.toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    // Wrong key, tampered ciphertext/auth tag, or malformed token — all
    // treated the same as "not signed in".
    return null;
  }
}
