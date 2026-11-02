/**
 * Who licenses each HireAnyPro trade in Florida, and where a homeowner checks it.
 * Used by /guides/florida-contractor-license-check and the "Check the license" box on listing pages.
 * Keep it factual and conservative: "usually", "check your county" where the rule is local.
 */
export const GUIDE_PATH = '/guides/florida-contractor-license-check';
export const DBPR_URL = 'https://www.myfloridalicense.com/';
export const FDACS_URL = 'https://www.fdacs.gov/';
export const FMCSA_URL = 'https://safer.fmcsa.dot.gov/';

export type LicenseRule = {
  slug: string;
  trade: string;
  /** state = a Florida license is required for the work; local = no statewide license, counties/cities may require one. */
  level: 'state' | 'local';
  /** Who issues it. */
  issuer: string;
  /** One or two plain sentences. */
  rule: string;
  checkLabel: string;
  checkUrl: string;
};

const DBPR = { checkLabel: 'DBPR license search (myfloridalicense.com)', checkUrl: DBPR_URL };

export const LICENSE_RULES: LicenseRule[] = [
  { slug: 'general-contractor', trade: 'General contractors', level: 'state', issuer: 'Construction Industry Licensing Board (DBPR)',
    rule: 'Building, remodeling and structural work needs a general, building or residential contractor license. Certified licenses (CGC, CBC, CRC) are valid statewide; registered ones (RG, RB, RR) only where the contractor holds a local license.', ...DBPR },
  { slug: 'roofing', trade: 'Roofers', level: 'state', issuer: 'Construction Industry Licensing Board (DBPR)',
    rule: 'Roof installation and re-roofing need a roofing contractor license (certified CCC or registered RC) and, in most places, a building permit.', ...DBPR },
  { slug: 'plumbing', trade: 'Plumbers', level: 'state', issuer: 'Construction Industry Licensing Board (DBPR)',
    rule: 'Plumbing contractors need a state license (certified CFC or registered RF). Water heater replacements and repiping usually need a permit too.', ...DBPR },
  { slug: 'hvac', trade: 'HVAC contractors', level: 'state', issuer: 'Construction Industry Licensing Board (DBPR)',
    rule: 'Air-conditioning and heating work needs an air-conditioning contractor (CAC, RA) or mechanical contractor (CMC, RM) license. Technicians who handle refrigerant also need EPA Section 608 certification.', ...DBPR },
  { slug: 'pool-service', trade: 'Pool contractors', level: 'state', issuer: 'Construction Industry Licensing Board (DBPR)',
    rule: 'Building, remodeling or repairing a pool or its equipment needs a pool/spa contractor license (CPC certified, RP registered). Routine cleaning and chemical service usually does not.', ...DBPR },
  { slug: 'solar-installation', trade: 'Solar installers', level: 'state', issuer: 'Construction Industry Licensing Board / Electrical Contractors\u2019 Licensing Board (DBPR)',
    rule: 'Solar systems are installed under a solar contractor license (CVC) or by a licensed electrical contractor for the electrical side.', ...DBPR },
  { slug: 'electrical', trade: 'Electricians', level: 'state', issuer: 'Electrical Contractors\u2019 Licensing Board (DBPR)',
    rule: 'Electrical contractors need a state license: certified (EC, valid statewide) or registered (ER, valid locally).', ...DBPR },
  { slug: 'security-alarm', trade: 'Alarm and security installers', level: 'state', issuer: 'Electrical Contractors\u2019 Licensing Board (DBPR)',
    rule: 'Installing or servicing alarm systems needs an alarm system contractor (or electrical contractor) license from the state.', ...DBPR },
  { slug: 'pest-control', trade: 'Pest control companies', level: 'state', issuer: 'Florida Department of Agriculture and Consumer Services (FDACS)',
    rule: 'Pest control businesses are licensed by FDACS under Chapter 482, Florida Statutes, not by DBPR.', checkLabel: 'FDACS (fdacs.gov) license lookup', checkUrl: FDACS_URL },
  { slug: 'moving-companies', trade: 'Movers', level: 'state', issuer: 'FDACS (moves within Florida); FMCSA (moves between states)',
    rule: 'Movers doing moves within Florida must register with FDACS under Chapter 507, Florida Statutes. Interstate movers need a USDOT number from the federal FMCSA.', checkLabel: 'FDACS registration, or FMCSA SAFER for interstate movers', checkUrl: FMCSA_URL },
  { slug: 'landscaping', trade: 'Landscapers', level: 'local', issuer: 'No statewide landscaping license',
    rule: 'Florida has no general landscaping license, but anyone applying fertilizer commercially needs an FDACS limited certification, and many counties require a local license or business tax receipt.', checkLabel: 'Your county licensing office', checkUrl: FDACS_URL },
  { slug: 'handyman', trade: 'Handymen', level: 'local', issuer: 'No statewide handyman license',
    rule: 'A handyman can do minor repairs, but work that needs a licensed contractor (structural, roofing, electrical, plumbing, HVAC) must be done by one. Some counties license handymen locally.', ...DBPR },
  { slug: 'locksmith', trade: 'Locksmiths', level: 'local', issuer: 'No statewide locksmith license',
    rule: 'Florida has no statewide locksmith license. Some counties, including Miami-Dade, license locksmiths locally.', checkLabel: 'Your county consumer protection office', checkUrl: DBPR_URL },
  { slug: 'appliance-repair', trade: 'Appliance repair', level: 'local', issuer: 'No statewide appliance repair license',
    rule: 'No state license is needed for appliance repair, but technicians who work with refrigerant need EPA Section 608 certification.', checkLabel: 'Ask for their EPA 608 card', checkUrl: DBPR_URL },
  { slug: 'tree-service', trade: 'Tree services', level: 'local', issuer: 'No statewide tree service license',
    rule: 'Florida does not license tree services statewide. ISA arborist certification is voluntary. Insurance matters most here: ask for liability and workers\u2019 compensation proof.', checkLabel: 'Ask for insurance certificates', checkUrl: DBPR_URL },
  ...([
    ['painting', 'Painters'], ['flooring', 'Flooring installers'], ['fencing', 'Fence installers'], ['garage-door', 'Garage door companies'],
    ['cleaning', 'House cleaners'], ['carpet-cleaning', 'Carpet cleaners'], ['window-cleaning', 'Window cleaners'],
  ] as const).map(([slug, trade]) => ({
    slug, trade, level: 'local' as const, issuer: 'No statewide license',
    rule: 'Florida has no statewide license for this trade. Many counties and cities require a local certificate of competency or business tax receipt, and some jobs (new fences, garage doors) need a permit.',
    ...DBPR,
  })),
];

export function licenseRuleFor(slug?: string | null): LicenseRule | null {
  return LICENSE_RULES.find((r) => r.slug === slug) || null;
}
