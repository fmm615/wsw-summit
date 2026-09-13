/**
 * SHAREABLE GRAPHIC GENERATOR
 * ===========================
 * Draws the current profile's personalized "I'm Attending" card entirely in
 * <canvas>: the real Summit artwork (assets/template-bg.png) as a
 * background, with the person's name, title/company and photo painted on
 * top of the areas that were placeholder text ("ATTENDEE NAME" / "ATTENDEE
 * TITLE AND COMPANY") or a placeholder icon in the supplied design. This has
 * no idea where the profile's values came from — typed by hand or filled in
 * via LinkedIn — it just draws whatever js/app.js currently holds.
 *
 * ── HOW THE OVERLAY WORKS ───────────────────────────────────────────────
 * The supplied artwork is a flat, single PNG — the placeholder text isn't
 * an editable layer, it's baked into the pixels. So for each area we
 * overwrite (the name, the title/company), drawGraphic() first "erases" the
 * placeholder by stretching a thin sliver of the background from just above
 * that text over the text itself (this reproduces the local gradient
 * instead of slapping down a flat rectangle, so there's no visible patch).
 * Real text is then drawn on top of that patch, centered the same way the
 * placeholder text was. TEMPLATE.layout below has every coordinate used for
 * this, so a designer can nudge them without touching the drawing logic.
 *
 * Unlike the Gala version this artwork replaces, the headline ("I'm
 * Attending...") is fixed — there's no per-person status to swap in — so
 * it's left completely untouched; only the name, title/company and photo
 * circle are overlaid.
 *
 * ── IF THE REAL DESIGN CHANGES ─────────────────────────────────────────
 * 1. Replace assets/template-bg.png with the new export (keep it the same
 *    pixel size as TEMPLATE.width/height, or update those to match).
 * 2. Re-check TEMPLATE.layout's coordinates against the new artwork — they
 *    were measured directly off the current file (see the patch* rects and
 *    circle cx/cy/r). If the layout hasn't moved, no changes are needed.
 */

import { initialsOf } from "./nameUtils.js";

export const TEMPLATE = {
  width: 1920,
  height: 1080,
  backgroundImage: "/assets/template-bg.png",

  colors: {
    monogramBg: "#2C1B54",
    monogramText: "#A6FF3E",
    photoRing: "#A6FF3E",
    nameText: "#ffffff",
    titleText: "#ffffff",
  },

  fonts: {
    name: "800 42px 'Montserrat', sans-serif",
    title: "700 32px 'Montserrat', sans-serif",
  },

  // Every coordinate below was measured directly off assets/template-bg.png
  // (1920x1080). See the file-level comment if that artwork changes. Both
  // text lines are centered on centerX — that's how the supplied artwork's
  // placeholder text is set (not left- or right-aligned), so the overlay
  // text is centered the same way.
  layout: {
    centerX: 1513,
    // "ATTENDEE NAME" placeholder -> attendee's full name.
    name: {
      patch: { x: 1150, y: 748, w: 750, h: 46 },
      sample: { x: 1150, y: 742, w: 750 },
      textBaseline: 786,
      maxWidth: 700,
    },
    // "ATTENDEE TITLE AND COMPANY" placeholder -> job title (+ company).
    title: {
      patch: { x: 1150, y: 796, w: 750, h: 46 },
      sample: { x: 1150, y: 790, w: 750 },
      textBaseline: 828,
      maxWidth: 700,
    },
    // Placeholder cloud/hill icon circle -> headshot or monogram.
    photo: { cx: 1524, cy: 463, r: 241 },
  },
};

/** Loads the fonts used on the canvas so text is crisp on first draw. */
async function ensureFontsReady() {
  const specs = ["800 42px 'Montserrat'", "700 32px 'Montserrat'"];
  try {
    await Promise.all(specs.map((spec) => document.fonts.load(spec)));
    await document.fonts.ready;
  } catch {
    // Fonts API unsupported or fonts failed to load — canvas will fall back
    // to the browser's default sans-serif, which is fine.
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    // If the photo host doesn't allow CORS or the URL is broken, fall back
    // to the monogram rather than failing the whole graphic.
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * "Erases" a placeholder text region by stretching a thin slice of the
 * background (sampled from just above the text) over it — this regrows
 * the local gradient tone instead of leaving a flat, visibly-pasted
 * rectangle.
 */
function patchRegion(ctx, bgImg, patch, sample) {
  ctx.drawImage(
    bgImg,
    sample.x, sample.y, sample.w, 2,
    patch.x, patch.y, patch.w, patch.h
  );
}

/** Shrinks font-size (in px, from a "WEIGHT SIZEpx FAMILY" string) until text fits maxWidth. */
function fitText(ctx, text, fontTemplate, maxWidth, minSize = 20) {
  let size = parseInt(fontTemplate.match(/(\d+)px/)[1], 10);
  let font = fontTemplate;
  ctx.font = font;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2;
    font = fontTemplate.replace(/\d+px/, `${size}px`);
    ctx.font = font;
  }
  return font;
}

function drawMonogram(ctx, cx, cy, radius, fullName) {
  const initials = initialsOf(fullName);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = TEMPLATE.colors.monogramBg;
  ctx.fill();
  ctx.font = `800 ${Math.round(radius * 0.75)}px 'Montserrat', sans-serif`;
  ctx.fillStyle = TEMPLATE.colors.monogramText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, cx, cy + radius * 0.06);
  ctx.restore();
}

function drawPhoto(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Cover-fit the image into the circle.
  const scale = Math.max((radius * 2) / img.width, (radius * 2) / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}

/**
 * Renders the current profile onto the given <canvas> element. `profile`
 * is the live, editable state from the form (see js/app.js) — before
 * someone has filled anything in, this still draws a legible card with
 * plain-English placeholders ("YOUR NAME" / "YOUR TITLE") so the preview
 * never looks broken or shows a blank slate.
 * Returns a Promise that resolves once drawing is complete.
 */
export async function drawGraphic(canvas, profile) {
  const { width, height, colors, layout, fonts } = TEMPLATE;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  await ensureFontsReady();
  const [bg, photo] = await Promise.all([
    loadImage(TEMPLATE.backgroundImage),
    loadImage(profile.photo),
  ]);

  // ── Background: the real supplied Summit artwork ──
  if (bg) {
    ctx.drawImage(bg, 0, 0, width, height);
  } else {
    // Fallback if the artwork failed to load (e.g. bad path) so the
    // graphic still renders something legible rather than a blank canvas.
    ctx.fillStyle = "#1B0E3D";
    ctx.fillRect(0, 0, width, height);
  }

  if (bg) {
    // ── Name (replaces "ATTENDEE NAME") — centered, same as the artwork ──
    patchRegion(ctx, bg, layout.name.patch, layout.name.sample);
    ctx.save();
    ctx.fillStyle = colors.nameText;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const nameText = (profile.fullName || "Your Name").toUpperCase();
    ctx.font = fitText(ctx, nameText, fonts.name, layout.name.maxWidth, 22);
    ctx.fillText(nameText, layout.centerX, layout.name.textBaseline);
    ctx.restore();

    // ── Title (+ company) (replaces "ATTENDEE TITLE AND COMPANY") ──
    patchRegion(ctx, bg, layout.title.patch, layout.title.sample);
    ctx.save();
    ctx.fillStyle = colors.titleText;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const titleText = (
      profile.jobTitle
        ? profile.company ? `${profile.jobTitle}, ${profile.company}` : profile.jobTitle
        : "Your Title & Company"
    ).toUpperCase();
    ctx.font = fitText(ctx, titleText, fonts.title, layout.title.maxWidth, 18);
    ctx.fillText(titleText, layout.centerX, layout.title.textBaseline);
    ctx.restore();
  }

  // ── Headshot / monogram (replaces the placeholder cloud/hill icon) ──
  const { cx, cy, r } = layout.photo;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = colors.photoRing;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  if (photo) {
    drawPhoto(ctx, photo, cx, cy, r);
  } else {
    drawMonogram(ctx, cx, cy, r, profile.fullName);
  }

  return canvas;
}

/** Draws into an offscreen canvas and resolves with a PNG blob (for downloads). */
export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
}
