/** True for headless/automated browsers (email link scanners, crawlers running JS). Funnel events from these are noise:
 *  on Oct 27 every claim_view/owner_banner_view came from data-center scanners, none from owners. */
/**
 * Runs cb once the visitor shows a human signal (pointer, touch, key, scroll or wheel), or right away if one was
 * already seen on this page. Email link scanners render pages in real browsers from data centers (Ashburn,
 * Des Moines, Council Bluffs, Seattle) and never interact, so "view" funnel events gated by this count people only.
 * Returns a cleanup function.
 */
let humanSeen = false;
export function onHuman(cb: () => void): () => void {
  if (typeof window === 'undefined' || isAutomatedBrowser()) return () => {};
  if (humanSeen) { cb(); return () => {}; }
  const evs = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'scroll', 'wheel'] as const;
  let done = false;
  const fire = () => {
    if (done) return;
    done = true; humanSeen = true;
    evs.forEach((e) => window.removeEventListener(e, fire, true));
    cb();
  };
  evs.forEach((e) => window.addEventListener(e, fire, { capture: true, passive: true }));
  return () => { done = true; evs.forEach((e) => window.removeEventListener(e, fire, true)); };
}

export function isAutomatedBrowser(): boolean {
  if (typeof navigator === 'undefined') return true;
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return true;
  return /HeadlessChrome|PhantomJS|Puppeteer|Playwright|bot|crawler|spider|Lighthouse|Chrome-Lighthouse/i.test(navigator.userAgent || '');
}
