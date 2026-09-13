import { renderHeader } from "./components/header.js";
import { renderFooter } from "./components/footer.js";
import { renderHero } from "./components/hero.js";
import { renderForm, mountForm, updatePhotoUI, markLinkedInUnavailable } from "./components/form.js";
import { renderSocialCard, mountSocialCard, redrawSocialCard } from "./components/socialCard.js";
import { renderShareSection, mountShareSection, updateLinkedInShareMode } from "./components/shareSection.js";
import { buildDefaultCaption } from "./copy.js";
import { trackPageView, trackLinkedInFill } from "./analytics.js";

/**
 * APP ENTRY POINT
 * ================
 * There is only one page. Everyone who gets the link lands here and fills
 * in their own details — no per-person URL, no pre-loaded attendee list.
 * `profile` below is the single source of truth for the whole page: the
 * form writes to it, and updatePreview() re-renders just the parts that
 * depend on it (the hero name, the graphic, the caption) without touching
 * the rest of the DOM — so typing in one field never disturbs focus or
 * unsaved edits in another.
 */

const root = document.getElementById("app");

const profile = {
  fullName: "",
  jobTitle: "",
  company: "",
  photo: null,
};

let captionTouched = false;
let redrawTimer = null;
// Whether the current session can actually publish to LinkedIn (i.e. signed
// in with posting permission) — see api/me.js's `canPublish` and
// shareSection.js's updateLinkedInShareMode()/mountShareSection().
let linkedInCanPublish = false;

function scheduleRedraw() {
  clearTimeout(redrawTimer);
  redrawTimer = setTimeout(() => redrawSocialCard(profile), 250);
}

function updateHero() {
  const nameEl = document.getElementById("hero-name");
  if (nameEl) nameEl.textContent = profile.fullName.trim().split(/\s+/)[0] || "there";
}

function updateCaption() {
  if (captionTouched) return;
  const captionEl = document.getElementById("caption-text");
  if (!captionEl) return;
  captionEl.value = buildDefaultCaption(profile) || "";
}

function updatePreview() {
  updateHero();
  updateCaption();
  updatePhotoUI(!!profile.photo);
  scheduleRedraw();
}

/**
 * Checks for a LinkedIn session (see api/me.js) and fills name + photo if
 * present. Also doubles as a one-time probe for whether /api functions
 * exist on this deployment at all (e.g. a static-only host has none) — if
 * the probe 404s or fails outright, the LinkedIn button is marked
 * unavailable instead of sending attendees to a dead link.
 */
async function tryFillFromLinkedIn() {
  try {
    const res = await fetch("/api/me", { headers: { Accept: "application/json" } });
    // Some static hosts (e.g. a catch-all SPA redirect rule) answer every
    // unknown path with 200 + the index page's own HTML instead of a real
    // 404. Checking content-type, not just res.ok, catches that case too —
    // otherwise res.json() below would throw on the HTML body anyway, just
    // less clearly.
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) {
      markLinkedInUnavailable();
      return;
    }
    const data = await res.json();
    linkedInCanPublish = Boolean(data.canPublish);
    updateLinkedInShareMode(linkedInCanPublish);
    if (data.signedIn) {
      profile.fullName = profile.fullName || data.name || "";
      profile.photo = profile.photo || data.picture || null;
      const nameInput = document.getElementById("field-name");
      if (nameInput) nameInput.value = profile.fullName;
      trackLinkedInFill();
      updatePreview();
    }
  } catch {
    // No /api on this host at all (e.g. a static-only deploy) — treat the
    // same as "not available" rather than "not signed in".
    markLinkedInUnavailable();
  }
}

function render() {
  root.innerHTML =
    renderHeader() +
    '<main class="page page--profile">' +
    renderHero(profile) +
    renderForm(profile) +
    renderSocialCard() +
    renderShareSection(profile) +
    "</main>" +
    renderFooter();

  mountForm((patch) => {
    Object.assign(profile, patch);
    updatePreview();
  });

  mountSocialCard(() => profile);
  mountShareSection(
    profile,
    () => {
      captionTouched = true;
    },
    () => linkedInCanPublish
  );

  trackPageView();
  tryFillFromLinkedIn();
}

render();
