import { heroCopy, EVENT_CONFIG } from "../copy.js";
import { firstNameOf } from "../nameUtils.js";

/**
 * HERO COMPONENT
 * The welcoming headline block. Reads live from the in-page profile object
 * (filled in by the form and/or LinkedIn) — before a name is entered it
 * shows a clearly-a-placeholder state rather than pretending someone is
 * already signed in.
 */
export function renderHero(profile) {
  const { kicker, subtitle } = heroCopy();
  const firstName = firstNameOf(profile.fullName);
  const nameDisplay = firstName || "there";

  return `
    <section class="hero">
      <p class="hero__kicker">${kicker}</p>
      <h1 class="hero__title">
        See you in ${EVENT_CONFIG.city}, <span class="hero__name" id="hero-name">${escapeHtml(nameDisplay)}</span>.
      </h1>
      <p class="hero__subtitle">${subtitle}</p>
      <p class="hero__event">${EVENT_CONFIG.eventName}</p>
      <p class="hero__dates">${EVENT_CONFIG.dateRange} &middot; ${EVENT_CONFIG.venue}, ${EVENT_CONFIG.city}</p>
    </section>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
