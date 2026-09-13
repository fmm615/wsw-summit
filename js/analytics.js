/**
 * ANALYTICS (STUB)
 * ================
 * Minimal, dependency-free event tracking so the prototype's interactions
 * are already instrumented. Right now this just logs to the console and
 * keeps a running count in localStorage (visible only to the current
 * browser) so you can see it working during a demo.
 *
 * TODO (production): replace the body of track() with a real call — e.g.
 * a GA4 gtag('event', ...) call, a Segment analytics.track(...) call, or a
 * fetch() POST to your own /api/events endpoint. Every call site below
 * (page views, graphic downloads, caption copies, share clicks) stays
 * exactly the same — only this file changes.
 */

const STORAGE_KEY = "wsw-summit:analytics-demo";

function readCounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeCounts(counts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    /* localStorage unavailable (private mode, etc.) — safe to ignore for the demo */
  }
}

export function track(eventName, payload = {}) {
  const counts = readCounts();
  counts[eventName] = (counts[eventName] || 0) + 1;
  writeCounts(counts);

  // eslint-disable-next-line no-console
  console.log(`[analytics] ${eventName}`, payload, `(local count: ${counts[eventName]})`);

  // TODO (production): send to a real analytics provider, e.g.
  // window.gtag?.('event', eventName, payload);
  // or: fetch('/api/events', { method: 'POST', body: JSON.stringify({ eventName, ...payload }) });
}

export const trackPageView = () => track("page_view", {});

export const trackGraphicDownload = (profile) =>
  track("graphic_download", { hasTitle: Boolean(profile.jobTitle) });

export const trackCaptionCopy = (profile) =>
  track("caption_copy", { hasTitle: Boolean(profile.jobTitle) });

export const trackShareClick = (profile, channel) =>
  track("share_click", { hasTitle: Boolean(profile.jobTitle), channel });

export const trackLinkedInFill = () => track("linkedin_autofill", {});
