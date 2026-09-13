import { drawGraphic, canvasToBlob } from "../graphicGenerator.js";
import { trackGraphicDownload } from "../analytics.js";

/**
 * SOCIAL CARD COMPONENT
 * Renders the <canvas> that becomes the shareable graphic, plus the
 * "Download graphic" button beneath it. The canvas redraws live as the
 * form (js/components/form.js) changes — mountSocialCard() wires the
 * download button once; call redrawSocialCard() on every profile change
 * (js/app.js debounces this) rather than re-mounting.
 */
export function renderSocialCard() {
  return `
    <section class="social-card">
      <div class="social-card__frame" aria-label="Your personalized attendance graphic">
        <canvas class="social-card__canvas" id="profile-canvas"></canvas>
        <div class="social-card__loading" id="canvas-loading">Preparing your graphic…</div>
      </div>
      <button type="button" class="btn btn--ghost" id="download-btn">
        <span aria-hidden="true">&#8595;</span>&nbsp; Download graphic
      </button>
    </section>
  `;
}

function slugify(text) {
  const s = (text || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "wsw-summit-2026";
}

/**
 * Downloads the current graphic as a PNG. Shared by the "Download graphic"
 * button here and the "Post to LinkedIn"/"Share via WhatsApp" buttons in
 * shareSection.js — neither LinkedIn nor WhatsApp's share links can attach
 * an image directly (that's a platform limit, not something any app can
 * work around), so the practical flow is: download the graphic, then
 * attach it to the post by hand. Resolves true/false so a caller can tailor
 * its confirmation message.
 */
export async function downloadCurrentGraphic(profile) {
  const canvas = document.getElementById("profile-canvas");
  if (!canvas) return false;
  const blob = await canvasToBlob(canvas);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(profile.fullName)}-wsw-summit-2026.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  trackGraphicDownload(profile);
  return true;
}

/** Initial draw + wires the download button once. `getProfile` returns the live profile at click time. */
export async function mountSocialCard(getProfile) {
  const canvas = document.getElementById("profile-canvas");
  const loading = document.getElementById("canvas-loading");
  const downloadBtn = document.getElementById("download-btn");
  if (!canvas) return;

  await drawGraphic(canvas, getProfile());
  if (loading) loading.style.display = "none";

  downloadBtn?.addEventListener("click", () => downloadCurrentGraphic(getProfile()));
}

/** Redraws the canvas from the current profile — call on every form change. */
export function redrawSocialCard(profile) {
  const canvas = document.getElementById("profile-canvas");
  if (!canvas) return;
  drawGraphic(canvas, profile);
}
