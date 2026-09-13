/**
 * MINIMAL JSON BODY READER (no dependencies)
 * ===========================================
 * Vercel auto-parses JSON bodies in some setups, but this project sticks to
 * raw Node `http` primitives everywhere so the same handler code runs
 * unmodified on Vercel and under server.js locally (see api/me.js and
 * friends) — so POST handlers read their own body the plain way.
 */
export function readJsonBody(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
