import { buildDefaultCaption } from "../copy.js";
import { trackCaptionCopy, trackShareClick } from "../analytics.js";
import { downloadCurrentGraphic } from "./socialCard.js";

/**
 * REAL LINKEDIN PUBLISHING
 * ========================
 * When an attendee has signed in with posting permission (see
 * api/auth/linkedin.js's `w_member_social` scope), "Post to LinkedIn"
 * becomes "Publish to LinkedIn" and, on confirmation, calls
 * api/publish/linkedin.js to actually create the post — caption + graphic
 * — on their profile via LinkedIn's own API. No copy/paste needed. When
 * they haven't (or can't — e.g. a static-only deployment with no server),
 * it falls back to the copy-caption + auto-download + open-LinkedIn flow
 * below, which is the best any app can do without that permission.
 */

/**
 * SHARE SECTION COMPONENT
 * The caption textarea + LinkedIn / WhatsApp / Copy buttons.
 *
 * ── PLATFORM LIMIT, READ THIS BEFORE "FIXING" THE IMAGE ─────────────────
 * Neither LinkedIn's nor WhatsApp's share links can attach an image —
 * both only ever accept a URL (and optional text), then generate their own
 * preview by reading that URL's Open Graph tags. There is no parameter
 * that hands them a custom picture; every app that has a "share to
 * LinkedIn" button (Canva, Adobe Express, Kapwing, etc.) works around this
 * the same way we do here: download the image, then attach it to the post
 * by hand. So both buttons now trigger the PNG download automatically and
 * say so in the confirmation message — that's the real fix for "the
 * graphic doesn't show up," short of attendees pasting it in themselves.
 *
 * The link that DOES get shared is this page's own URL (not some other
 * site) — set proper Open Graph tags in index.html and that's what shows
 * up in the preview card instead of a generic/unrelated thumbnail.
 *
 * LinkedIn's share endpoint also doesn't support prefilling post text (that
 * API was deprecated) — so the LinkedIn button copies the caption to the
 * clipboard too, with a toast telling the person to paste. WhatsApp's share
 * link, by contrast, does support prefilled text directly.
 *
 * The caption textarea auto-fills from the name (+ title/company) as those
 * are typed in (see js/app.js's updatePreview) but stops overwriting the
 * moment someone edits it directly — same idea as most mail-merge tools.
 */
export function renderShareSection(profile) {
  const caption = buildDefaultCaption(profile);
  return `
    <section class="share">
      <h2 class="share__title">Share that you're attending</h2>

      <div class="share__actions">
        <button type="button" class="btn btn--linkedin" id="share-linkedin">
          ${linkedInIcon()} <span class="share__linkedin-label">Post to LinkedIn</span>
        </button>
        <button type="button" class="btn btn--whatsapp" id="share-whatsapp">
          ${whatsappIcon()} Share via WhatsApp
        </button>
        <button type="button" class="btn btn--outline" id="copy-caption">
          Copy caption
        </button>
      </div>

      <div class="share__caption-wrap">
        <label class="share__caption-label" for="caption-text">Your caption (feel free to edit)</label>
        <textarea id="caption-text" class="share__caption" rows="7"
          placeholder="Fill in your name above — your caption will appear here, ready to edit."
        >${caption ?? ""}</textarea>
        <p class="share__confirmation" id="copy-confirmation" role="status" aria-live="polite"></p>
      </div>

      <div class="share__publish-panel" id="linkedin-publish-panel" hidden></div>
    </section>
  `;
}

/**
 * Updates the "Post to LinkedIn" button's label/subtitle to reflect
 * whether real publishing is available right now. Call this whenever the
 * canPublish state changes (initially false; js/app.js re-calls it once
 * its /api/me check resolves).
 */
export function updateLinkedInShareMode(canPublish) {
  const linkedInBtn = document.getElementById("share-linkedin");
  if (!linkedInBtn) return;
  const label = linkedInBtn.querySelector(".share__linkedin-label");
  if (label) label.textContent = canPublish ? "Publish to LinkedIn" : "Post to LinkedIn";
}

export function mountShareSection(profile, onCaptionEdited, getCanPublish) {
  const captionEl = document.getElementById("caption-text");
  const confirmationEl = document.getElementById("copy-confirmation");
  const copyBtn = document.getElementById("copy-caption");
  const linkedInBtn = document.getElementById("share-linkedin");
  const whatsappBtn = document.getElementById("share-whatsapp");
  const publishPanel = document.getElementById("linkedin-publish-panel");

  captionEl?.addEventListener("input", () => onCaptionEdited?.());

  const showConfirmation = (msg) => {
    if (!confirmationEl) return;
    confirmationEl.textContent = msg;
    confirmationEl.classList.add("is-visible");
    clearTimeout(showConfirmation._t);
    showConfirmation._t = setTimeout(() => confirmationEl.classList.remove("is-visible"), 2600);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for browsers/contexts without Clipboard API access.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      textarea.remove();
      return ok;
    }
  };

  copyBtn?.addEventListener("click", async () => {
    const ok = await copyText(captionEl.value);
    showConfirmation(ok ? "Caption copied ✓" : "Couldn't copy — please select and copy manually.");
    if (ok) trackCaptionCopy(profile);
  });

  // The page's own URL — shared instead of some other site, so the link
  // preview LinkedIn/WhatsApp generate reflects THIS page (see the Open
  // Graph tags in index.html), and so people who click it land on their
  // own copy of this same personalization page.
  const pageUrl = () => window.location.origin + window.location.pathname;

  linkedInBtn?.addEventListener("click", async () => {
    if (getCanPublish?.()) {
      showPublishConfirm();
      return;
    }
    await copyText(captionEl.value);
    await downloadCurrentGraphic(profile);
    showConfirmation("Graphic downloaded + caption copied — attach the photo to your post, then paste.");
    trackShareClick(profile, "linkedin");
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl())}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600");
  });

  /**
   * Shows an inline "publish now?" confirmation instead of immediately
   * posting — even though we technically could publish on the first
   * click, a real post going live on someone's profile deserves a
   * deliberate confirm step, same as any "Publish"/"Send" action would.
   */
  function showPublishConfirm() {
    if (!publishPanel) return;
    publishPanel.hidden = false;
    publishPanel.innerHTML = `
      <p class="share__publish-copy"><strong>Publish this to your LinkedIn profile now?</strong> Your caption above (edit it first if you like) and your graphic go up immediately, visible to your LinkedIn network.</p>
      <div class="share__publish-actions">
        <button type="button" class="btn btn--linkedin" id="confirm-publish-btn">Yes, publish now</button>
        <button type="button" class="btn btn--ghost" id="cancel-publish-btn">Cancel</button>
      </div>
      <p class="share__publish-status" id="publish-status" role="status" aria-live="polite"></p>
    `;

    document.getElementById("cancel-publish-btn")?.addEventListener("click", () => {
      publishPanel.hidden = true;
      publishPanel.innerHTML = "";
    });

    document.getElementById("confirm-publish-btn")?.addEventListener("click", async () => {
      const statusEl = document.getElementById("publish-status");
      const confirmBtn = document.getElementById("confirm-publish-btn");
      const cancelBtn = document.getElementById("cancel-publish-btn");
      confirmBtn.disabled = true;
      statusEl.textContent = "Publishing…";

      try {
        const canvas = document.getElementById("profile-canvas");
        const imageDataUrl = canvas ? canvas.toDataURL("image/png") : null;
        const res = await fetch("/api/publish/linkedin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: captionEl.value, imageDataUrl }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok) {
          statusEl.innerHTML = `Posted ✓ — <a href="${data.postUrl}" target="_blank" rel="noopener noreferrer">view it on LinkedIn</a>`;
          confirmBtn.hidden = true;
          cancelBtn.textContent = "Close";
          trackShareClick(profile, "linkedin-publish");
        } else {
          statusEl.textContent = data.message || "LinkedIn didn't accept the post. Please try again.";
          confirmBtn.disabled = false;
        }
      } catch {
        statusEl.textContent = "Couldn't reach the server. Please check your connection and try again.";
        confirmBtn.disabled = false;
      }
    });
  }

  whatsappBtn?.addEventListener("click", async () => {
    await downloadCurrentGraphic(profile);
    showConfirmation("Graphic downloaded — attach it in WhatsApp before you send.");
    trackShareClick(profile, "whatsapp");
    const text = `${captionEl.value}\n\n${pageUrl()}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  });
}

function linkedInIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>`;
}
function whatsappIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.4 1.26 4.83L2 22l5.36-1.28a9.9 9.9 0 0 0 4.68 1.19h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm5.8 14.15c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.13.09-1.82-.11-.42-.13-.96-.3-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.14.07.15.11.32.02.52-.09.2-.14.32-.27.49-.14.17-.29.38-.41.51-.14.14-.28.3-.12.58.16.29.71 1.18 1.53 1.92 1.05.94 1.94 1.24 2.22 1.38.29.14.46.12.63-.07.17-.2.71-.83.9-1.11.19-.29.38-.24.63-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.35z"/></svg>`;
}
