import { EVENT_CONFIG } from "../copy.js";

export function renderFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <p class="site-footer__title">${EVENT_CONFIG.eventName}</p>
      <p class="site-footer__sub">In alignment with ${EVENT_CONFIG.alignedWith}, powered by ${EVENT_CONFIG.host}</p>
      <p class="site-footer__legal">&copy; ${year} ${EVENT_CONFIG.host}. All rights reserved.</p>
    </footer>
  `;
}
