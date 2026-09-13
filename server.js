/**
 * Zero-dependency static file server for local preview/testing, with an
 * SPA fallback: any path that isn't a real file
 * serves index.html instead of 404-ing, exactly like the vercel.json /
 * netlify.toml rewrites do in production. Run: `node server.js` then open
 * http://localhost:5173
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5173;

/**
 * Local stand-in for Vercel's zero-config API routes: /api/auth/linkedin
 * maps to api/auth/linkedin.js, /api/me maps to api/me.js, etc. — the same
 * convention Vercel uses, so these handlers run unmodified in production.
 * This exists purely so `node server.js` can exercise the LinkedIn OAuth
 * flow locally; Vercel does this automatically once deployed.
 */
async function tryHandleApiRoute(req, res, urlPath) {
  if (!urlPath.startsWith("/api/")) return false;
  const modulePath = path.join(__dirname, `${urlPath}.js`);
  if (!fs.existsSync(modulePath)) return false;

  try {
    const mod = await import(pathToFileURL(modulePath).href);
    await mod.default(req, res);
  } catch (err) {
    console.error(`API route ${urlPath} failed:`, err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal error in local API route.");
    }
  }
  return true;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (await tryHandleApiRoute(req, res, urlPath)) return;

  let filePath = path.join(__dirname, urlPath === "/" ? "index.html" : urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback — unknown path, serve index.html so client-side
      // routing (js/router.js) can take over.
      fs.readFile(path.join(__dirname, "index.html"), (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(indexData);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`WSW Summit prototype running at http://localhost:${PORT}`);
});
