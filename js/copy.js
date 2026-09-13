/**
 * CAPTION / COPY GENERATION
 * =========================
 * All profile-facing text lives here so tone/wording can be tweaked in one
 * place. Everything is a template function — no profile data is baked in.
 *
 * EVENT_CONFIG is the other thing you'll want to edit if any Summit detail
 * changes: event name, host, dates, venue and the public event URL that
 * gets shared alongside the caption.
 */

export const EVENT_CONFIG = {
  eventName: "Women Shaping Wealth Summit 2026",
  host: "PLAYBOOK",
  alignedWith: "Women Spark",
  city: "Riyadh",
  country: "Saudi Arabia",
  dateRange: "28–29 September 2026",
  venue: "The Garage at KACST",
  hashtags: ["#WomenShapingWealth", "#WSW2026"],
  // The official event/ticketing page — not used by the share buttons
  // (those share this portal's own URL, so LinkedIn/WhatsApp show a
  // preview of THIS page instead of a generic thumbnail; see
  // shareSection.js and index.html's Open Graph tags). Kept here in case
  // you want to reference it in the caption or footer later.
  eventUrl: "https://get-playbook.com/women-shaping-wealth",
};

/**
 * Builds the default, editable LinkedIn/WhatsApp caption for a profile.
 * Returns null until there's a name to say something real with — the
 * caller shows an instructional placeholder until then. Job title and
 * company still appear on the graphic itself, but not in the caption text.
 */
export function buildDefaultCaption(profile) {
  if (!profile.fullName?.trim()) return null;

  const hashtags = EVENT_CONFIG.hashtags.join(" ");

  return `I'm heading to the ${EVENT_CONFIG.eventName} — ${EVENT_CONFIG.dateRange} in ${EVENT_CONFIG.city}.

Where women, capital, and power converge. Excited to connect with this incredible community — see you there!

${hashtags}`;
}

/** Kicker + subtitle strings used in the on-page hero. */
export function heroCopy() {
  return {
    kicker: "You're on the list",
    subtitle: "You're attending the",
  };
}
