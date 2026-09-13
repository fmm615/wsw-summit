/**
 * HEADER COMPONENT
 * Pure presentational — takes no attendee data, so it's identical on every
 * page. Swap the wordmark/logo markup here if a real logo asset arrives
 * (the eyebrow text is a stand-in for the "WSW" wordmark used on the
 * supplied artwork).
 */
export function renderHeader() {
  return `
    <header class="site-header">
      <div class="site-header__inner">
        <span class="site-header__eyebrow">Women Shaping Wealth Summit 2026</span>
      </div>
    </header>
  `;
}
