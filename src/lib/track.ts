/** True for headless/automated browsers (email link scanners, crawlers running JS). Funnel events from these are noise:
 *  on Oct 27 every claim_view/owner_banner_view came from data-center scanners, none from owners. */
export function isAutomatedBrowser(): boolean {
  if (typeof navigator === 'undefined') return true;
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return true;
  return /HeadlessChrome|PhantomJS|Puppeteer|Playwright|bot|crawler|spider|Lighthouse|Chrome-Lighthouse/i.test(navigator.userAgent || '');
}
