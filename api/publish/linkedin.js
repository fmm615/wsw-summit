/**
 * POST /api/publish/linkedin
 * ============================
 * Publishes a real post — the attendee's caption + their personalized
 * graphic — straight to their own LinkedIn profile, using LinkedIn's
 * official Posts API. This is what "Publish to LinkedIn" calls once
 * someone has signed in with posting permission (the `w_member_social`
 * scope requested in api/auth/linkedin.js); the frontend only shows that
 * button, instead of the copy-caption-and-open-LinkedIn fallback, once
 * /api/me reports `canPublish: true` for their session.
 *
 * Needs LINKEDIN_CLIENT_ID/SECRET already configured for sign-in (see
 * LINKEDIN_SETUP.md) *and* the "Share on LinkedIn" product added to your
 * LinkedIn app (Products tab) — both are self-serve, no LinkedIn review.
 *
 * Request body: { caption: string, imageDataUrl: "data:image/png;base64,..." }
 * (the imageDataUrl comes straight from the already-drawn <canvas> via
 * canvas.toDataURL() — see js/components/shareSection.js).
 *
 * Two real LinkedIn API calls happen here, in order:
 *   1. Register + upload the image (LinkedIn's Images API) to get an image
 *      URN LinkedIn can attach to a post.
 *   2. Create the post itself (LinkedIn's Posts API) referencing that URN.
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 */
import { verifySession } from "../../lib/session.js";
import { parseCookies } from "../../lib/cookies.js";
import { readJsonBody } from "../../lib/readJsonBody.js";

// LinkedIn versions its REST API by calendar month ("vintage"). Bump this
// periodically per LinkedIn's versioning docs; old vintages keep working
// for a deprecation window, so this isn't urgent to keep perfectly current.
const LINKEDIN_API_VERSION = "202509";

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use POST." });
    return;
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const session = verifySession(cookies.pb_session);
  if (!session || !session.accessToken || !session.sub) {
    sendJson(res, 401, {
      error: "not_signed_in",
      message: "Sign in with LinkedIn first — that's what gives this app permission to post on your behalf.",
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "bad_request", message: "Couldn't read the request." });
    return;
  }

  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  if (!caption) {
    sendJson(res, 400, { error: "missing_caption", message: "Add a caption before publishing." });
    return;
  }
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(imageDataUrl);
  if (!match) {
    sendJson(res, 400, { error: "missing_image", message: "No graphic to attach yet — wait for your card to finish loading and try again." });
    return;
  }
  const imageBuffer = Buffer.from(match[2], "base64");

  const authorUrn = `urn:li:person:${session.sub}`;
  const liHeaders = {
    Authorization: `Bearer ${session.accessToken}`,
    "Linkedin-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };

  try {
    // ── 1. Register the image upload, then upload the bytes ──
    const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers: { ...liHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
    });
    const initData = await initRes.json().catch(() => null);
    const uploadUrl = initData?.value?.uploadUrl;
    const imageUrn = initData?.value?.image;
    if (!initRes.ok || !uploadUrl || !imageUrn) {
      console.error("LinkedIn image init failed:", initRes.status, initData);
      throw new Error("image_init_failed");
    }

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: imageBuffer,
    });
    if (!uploadRes.ok) {
      console.error("LinkedIn image upload failed:", uploadRes.status, await uploadRes.text().catch(() => ""));
      throw new Error("image_upload_failed");
    }

    // ── 2. Create the post, referencing the uploaded image ──
    const postRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: { ...liHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        author: authorUrn,
        commentary: caption,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: { media: { id: imageUrn } },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!postRes.ok) {
      console.error("LinkedIn post creation failed:", postRes.status, await postRes.text().catch(() => ""));
      throw new Error("post_failed");
    }

    const postId = postRes.headers.get("x-restli-id") || postRes.headers.get("x-linkedin-id");
    const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}/` : "https://www.linkedin.com/feed/";

    sendJson(res, 200, { ok: true, postUrl });
  } catch (err) {
    console.error("LinkedIn publish error:", err);
    sendJson(res, 502, {
      error: "publish_failed",
      message: "LinkedIn didn't accept the post. Please try again, or use \"Copy caption\" and post manually below.",
    });
  }
}
