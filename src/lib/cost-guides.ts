/**
 * Florida cost guides (/costs/<trade>), one per directory category.
 * Ranges are 2026 planning estimates for typical Florida homes. Each trade’s headline job was checked on
 * 2026-11-05 against at least two public cost guides (preferring Angi, HomeGuide, Fixr, EnergySage, and Florida
 * contractor guides when available); secondary table rows use those guides or a closely related planning estimate
 * and are logged in data/cost-sources.md. They are not quotes; the page says so. Review once a year.
 */
export type CostJob = { job: string; low: number; high: number; unit?: string; note?: string };
export type CostGuide = {
  slug: string;
  /** "Plumber" in "Plumber Cost in Florida" */
  title: string;
  /** "plumber" for sentences: "How much does a plumber cost" */
  noun: string;
  /** Headline line shown on city x service pages and llms-full: the most-searched job. */
  headline: CostJob;
  jobs: CostJob[];
  drivers: string[];
  florida: string;
  tips: string[];
  faq: { q: string; a: string }[];
  /** Public cost guides checked 2026-11-05. Only URLs recorded in the cost-sources research. */
  sources?: { label: string; url: string }[];
};

export const COSTS_UPDATED = '2026-11-05';
export const COSTS_PATH = '/costs';
export const costPath = (slug: string) => `${COSTS_PATH}/${slug}`;

const usd = (n: number) => (Number.isInteger(n) ? `$${n.toLocaleString('en-US')}` : `$${n.toFixed(2)}`);
export const costRange = (j: CostJob) => {
  if (j.unit?.startsWith('%')) return `${j.low}–${j.high}${j.unit}`;
  // $1–$2.75 reads like a dropped cent. Show $1.00 when the low end is a small whole number and the high end has cents.
  const padLow = Number.isInteger(j.low) && !Number.isInteger(j.high) && j.low < 10 && j.high < 10;
  const money = (n: number, pad: boolean) => (pad || !Number.isInteger(n) ? `$${n.toFixed(2)}` : usd(n));
  return `${money(j.low, padLow)}–${money(j.high, false)}${j.unit ? ` ${j.unit}` : ''}`;
};

const G: CostGuide[] = [
  {
    slug: 'plumbing', title: 'Plumber', noun: 'plumber',
    headline: { job: 'Tank water heater replacement (40–50 gal, installed)', low: 1000, high: 2500 },
    jobs: [
      { job: 'Hourly rate (licensed plumber)', low: 75, high: 175, unit: 'per hour', note: 'Many Florida shops price by the job instead.' },
      { job: 'Service call / diagnostic', low: 75, high: 175 },
      { job: 'Clear a clogged drain', low: 150, high: 400 },
      { job: 'Replace a faucet (labor + standard faucet)', low: 200, high: 450 },
      { job: 'Replace a toilet (installed)', low: 250, high: 800 },
      { job: 'Tank water heater replacement (40–50 gal, installed)', low: 1000, high: 2500, note: 'Permit usually extra.' },
      { job: 'Tankless water heater (installed)', low: 1800, high: 5000 },
      { job: 'Slab leak detection and repair', low: 2000, high: 6000 },
      { job: 'Whole-house repipe (about 1,500 sq ft)', low: 4000, high: 12000 },
    ],
    drivers: ['After-hours and weekend calls (often 1.5x–2x)', 'Access: slab homes, tight crawl spaces and finished walls', 'Permits for water heaters, repipes and sewer work', 'Older pipe types (polybutylene, cast iron) that need replacing, not patching'],
    florida: 'Many Florida homes sit on concrete slabs, so leaks under the floor cost more to find and fix. Hard water in much of the state shortens water heater life, and South Florida labor rates run higher than the Panhandle.',
    tips: ['Ask whether the quote is flat-rate or hourly, and what happens if the job runs long.', 'For water heaters, confirm the price includes the permit, haul-away and code upgrades (expansion tank, pan).', 'Get 2–3 written quotes for anything over $1,000.'],
    faq: [{ q: 'Do Florida plumbers need a license?', a: 'Yes. Plumbing contractors in Florida must be licensed by the state (DBPR). Check the license at myfloridalicense.com before you hire.' }],
    sources: [
      { label: 'Angi: water heater installation', url: 'https://www.angi.com/articles/how-much-does-water-heater-installation-cost.htm' },
      { label: 'HomeGuide: water heater installation', url: 'https://homeguide.com/costs/water-heater-installation-cost' },
      { label: 'Angi: Tampa water heater cost', url: 'https://www.angi.com/articles/how-much-does-water-heater-installation-cost/fl/tampa' },
    ],
  },
  {
    slug: 'hvac', title: 'AC Repair and HVAC', noun: 'AC repair or HVAC job',
    headline: { job: 'Central AC or heat pump replacement (ducted, installed)', low: 6500, high: 12500 },
    jobs: [
      { job: 'AC tune-up / maintenance visit', low: 89, high: 300 },
      { job: 'Service call / diagnostic', low: 75, high: 175 },
      { job: 'Capacitor or contactor replacement', low: 150, high: 550 },
      { job: 'Clear a clogged condensate drain line', low: 150, high: 450 },
      { job: 'Refrigerant leak repair and recharge', low: 550, high: 2200 },
      { job: 'Blower or condenser fan motor replacement', low: 700, high: 1100 },
      { job: 'Ductless mini-split (single zone, installed)', low: 3000, high: 6000 },
      { job: 'Central AC or heat pump replacement (ducted, installed)', low: 6500, high: 12500, note: '3–4 ton systems are most common; permit often extra.' },
      { job: 'Ductwork replacement', low: 3500, high: 10000 },
    ],
    drivers: ['System size (tons) and efficiency rating (SEER2)', 'Whether the air handler and ductwork are replaced too', 'Attic or closet access and electrical upgrades', 'Emergency summer calls when demand peaks'],
    florida: 'Florida ACs run most of the year, so systems wear out faster (often 10–15 years) and summer is the busiest, most expensive season. Most homes use a heat pump or AC with electric heat rather than a furnace.',
    tips: ['Get the quote in writing with the brand, tonnage and SEER2 rating.', 'Ask if the price includes the permit, new pad, drain line and thermostat.', 'Schedule replacements in spring or fall if you can.'],
    faq: [{ q: 'How long does an AC last in Florida?', a: 'Often 10–15 years, less near the coast where salt air corrodes the outdoor unit. Regular maintenance and drain-line cleaning help.' }],
    sources: [
      { label: 'Space Coast Cooling: Florida AC replacement', url: 'https://www.spacecoastcooling.com/blog/new-ac-system-cost-florida' },
      { label: 'Costadia: Florida heat pump installation', url: 'https://www.costadia.com/hvac/heat-pump-installation/florida' },
      { label: 'HomeGuide: ductless mini-split cost', url: 'https://homeguide.com/costs/ductless-mini-split-ac-cost' },
      { label: 'Star Air: Central Florida AC installation', url: 'https://starairconditioning.com/blog/ac-installation-cost-central-florida' },
    ],
  },
  {
    slug: 'roofing', title: 'Roof Replacement and Repair', noun: 'roof replacement or repair',
    headline: { job: 'Shingle roof replacement (typical home)', low: 9000, high: 18000 },
    jobs: [
      { job: 'Roof inspection', low: 150, high: 400 },
      { job: 'Minor roof repair (leak, flashing, a few shingles or tiles)', low: 350, high: 1800 },
      { job: 'Shingle roof replacement', low: 4.5, high: 8, unit: 'per sq ft' },
      { job: 'Shingle roof replacement (typical home)', low: 9000, high: 18000 },
      { job: 'Metal roof replacement', low: 8, high: 15, unit: 'per sq ft' },
      { job: 'Concrete or clay tile roof replacement', low: 11, high: 22, unit: 'per sq ft' },
      { job: 'Flat roof replacement (modified bitumen / TPO)', low: 6, high: 12, unit: 'per sq ft' },
    ],
    drivers: ['Roof size and pitch', 'Material (shingle, metal, tile, flat)', 'Rotten decking that has to be replaced', 'Wind-code requirements, permits and inspections'],
    florida: 'Florida roofs must meet wind-load building codes, and Miami-Dade and Broward (the High-Velocity Hurricane Zone) have the strictest product approvals, which raises cost. Many insurers want roofs under 15–20 years old, and demand (and prices) spike after hurricanes.',
    tips: ['Ask for the price per square (100 sq ft) and how much decking replacement is included.', 'Confirm the roofer pulls the permit and holds a Florida roofing license.', 'Be careful with door-to-door crews after storms and never pay in full up front.'],
    faq: [{ q: 'Do roofers need a license in Florida?', a: 'Yes. Roofing contractors must hold a Florida roofing license (certified or registered) from DBPR, and most roof replacements need a permit.' }],
    sources: [
      { label: 'HomeGuide: roof replacement cost', url: 'https://homeguide.com/costs/roof-replacement-cost' },
      { label: 'Fixr: Florida roof replacement', url: 'https://www.fixr.com/costs/roof-replacement-florida' },
      { label: 'Pitch Roofing: Florida architectural shingles', url: 'https://pitchroofing.com/roofing/architectural-shingles-cost/' },
      { label: 'Florida Home Pros: new roof cost', url: 'https://www.theflhomepros.com/guides/new-roof-cost' },
    ],
  },
  {
    slug: 'electrical', title: 'Electrician', noun: 'electrician',
    headline: { job: 'Electrical panel upgrade (200 amp)', low: 1800, high: 4500 },
    jobs: [
      { job: 'Hourly rate (licensed electrician)', low: 65, high: 150, unit: 'per hour' },
      { job: 'Service call', low: 75, high: 175 },
      { job: 'Add or replace an outlet or switch', low: 100, high: 300 },
      { job: 'Install a ceiling fan (existing wiring)', low: 150, high: 450 },
      { job: 'Whole-house surge protector', low: 250, high: 700 },
      { job: 'Level 2 EV charger (installed)', low: 800, high: 2500 },
      { job: 'Electrical panel upgrade (200 amp)', low: 1800, high: 4500 },
      { job: 'Standby generator with transfer switch (installed)', low: 8000, high: 20000 },
    ],
    drivers: ['Distance from the panel and wall/attic access', 'Permits and utility coordination for panel work', 'Old wiring that has to be brought up to code', 'Fixture or equipment you supply vs. the electrician supplies'],
    florida: 'Lightning and hurricane outages make surge protection and generators common Florida jobs. Older homes with certain panel brands often need replacement before insurers will write a policy.',
    tips: ['Ask if a permit is needed and who pulls it.', 'Bundle small jobs into one visit to avoid several service-call fees.', 'Check the license: Florida electrical contractors are licensed by the state.'],
    faq: [{ q: 'Do electricians need a license in Florida?', a: 'Yes. Electrical contractors must be licensed by the Florida Electrical Contractors\u2019 Licensing Board (DBPR). Look them up at myfloridalicense.com.' }],
    sources: [
      { label: 'HomeGuide: electrical panel replacement', url: 'https://homeguide.com/costs/cost-to-replace-electrical-panel' },
      { label: 'Angi: 200-amp panel upgrade', url: 'https://www.angi.com/articles/ask-angie-what-does-it-cost-upgrade-200-amps.htm' },
      { label: 'HomeGuide: EV charger installation', url: 'https://homeguide.com/costs/electric-car-charging-stations-cost' },
      { label: 'Angi: EV charging station installation', url: 'https://www.angi.com/articles/installing-electric-car-charging-station.htm' },
    ],
  },
  {
    slug: 'painting', title: 'House Painting', noun: 'house painter',
    headline: { job: 'Exterior house painting (single-story home)', low: 3000, high: 8000 },
    jobs: [
      { job: 'Paint one interior room (walls)', low: 400, high: 1200 },
      { job: 'Interior painting', low: 2, high: 6, unit: 'per sq ft of floor' },
      { job: 'Exterior house painting (single-story home)', low: 3000, high: 8000 },
      { job: 'Exterior painting, two-story home', low: 4500, high: 8000 },
      { job: 'Kitchen cabinet painting', low: 3000, high: 8000 },
      { job: 'Pressure washing before painting', low: 150, high: 450 },
    ],
    drivers: ['Prep work: pressure washing, stucco crack repair, mildew treatment', 'Paint quality and number of coats', 'Ceilings, trim and doors (often priced separately)', 'Height and access'],
    florida: 'Most Florida homes are stucco, which needs crack repair and often elastomeric or high-build coatings. Sun, rain and humidity mean exterior paint usually lasts 5–10 years.',
    tips: ['Ask which paint line and how many coats are included.', 'Get the prep work spelled out (pressure washing, caulking, crack repair).', 'Painters have no statewide license in Florida, so check local licensing and insurance.'],
    faq: [{ q: 'How often should you paint a house in Florida?', a: 'Exterior paint usually lasts 5–10 years in Florida, depending on sun exposure, the paint used and how well the surface was prepared.' }],
    sources: [
      { label: 'Angi: exterior house painting', url: 'https://www.angi.com/articles/cost-paint-house-exterior.htm' },
      { label: 'HomeGuide: exterior house painting', url: 'https://homeguide.com/costs/cost-to-paint-exterior-of-house' },
      { label: 'Fixr: Florida exterior house painting', url: 'https://www.fixr.com/costs/paint-house-exterior-florida' },
    ],
  },
  {
    slug: 'landscaping', title: 'Landscaping and Lawn Care', noun: 'landscaper',
    headline: { job: 'Weekly lawn maintenance (small to medium yard)', low: 120, high: 300, unit: 'per month' },
    jobs: [
      { job: 'Lawn mowing (small to medium yard)', low: 30, high: 60, unit: 'per visit' },
      { job: 'Weekly lawn maintenance (small to medium yard)', low: 120, high: 300, unit: 'per month', note: 'Usually mow, edge and blow; many yards go every other week in winter.' },
      { job: 'Hedge and shrub trimming', low: 100, high: 400 },
      { job: 'Mulch (installed)', low: 50, high: 100, unit: 'per cubic yard' },
      { job: 'New sod (St. Augustine, installed)', low: 1, high: 2.75, unit: 'per sq ft' },
      { job: 'Irrigation repair', low: 100, high: 400 },
      { job: 'New irrigation system', low: 2500, high: 5000 },
    ],
    drivers: ['Yard size and how often you want service', 'Whether trimming, weeding and fertilizing are included', 'Sod type and site prep', 'Debris haul-away'],
    florida: 'Florida grass grows almost all year, so most homes need weekly service from about April to October. St. Augustine is the most common lawn and needs regular irrigation and pest treatment.',
    tips: ['Ask what a "visit" includes (edging, blowing, trimming).', 'Check whether the price changes in the dry season.', 'Landscaping has no statewide license, but fertilizer and pesticide work requires FDACS certification.'],
    faq: [{ q: 'How much is lawn care per month in South Florida?', a: 'Weekly mowing, edging and blowing for a small to medium yard is typically about $120–$300 per month. Larger yards, trimming and fertilizing cost more.' }],
    sources: [
      { label: 'Florida lawn maintenance cost (2026)', url: 'https://bluecollarq.net/blog/lawn-maintenance-cost-florida-2026' },
      { label: 'Angi: sod installation in Orlando', url: 'https://www.angi.com/articles/how-much-does-it-cost-lay-sod/fl/orlando' },
    ],
  },
  {
    slug: 'cleaning', title: 'House Cleaning', noun: 'house cleaner',
    headline: { job: 'Standard cleaning (2–3 bedroom home)', low: 120, high: 250 },
    jobs: [
      { job: 'Hourly rate', low: 30, high: 60, unit: 'per cleaner per hour' },
      { job: 'Standard cleaning (2–3 bedroom home)', low: 120, high: 250 },
      { job: 'Deep cleaning (2–3 bedroom home)', low: 250, high: 500 },
      { job: 'Move-in / move-out cleaning', low: 300, high: 600 },
      { job: 'Vacation rental turnover', low: 100, high: 250 },
    ],
    drivers: ['Home size and number of bathrooms', 'How long since the last cleaning', 'Pets, extras (oven, fridge, windows, baseboards)', 'Weekly or biweekly plans (cheaper per visit)'],
    florida: 'Vacation-rental turnovers are a big part of cleaning work in Florida tourist areas, and humidity means mildew in bathrooms and on grout comes back faster.',
    tips: ['Ask if supplies are included and whether the price is flat or hourly.', 'Recurring plans usually cost 10–20% less per visit than one-time cleans.', 'Ask whether the company is insured and does background checks.'],
    faq: [{ q: 'How much does a deep cleaning cost?', a: 'A deep cleaning of a 2–3 bedroom home typically costs about $250–$500, roughly 1.5–2 times a standard cleaning.' }],
    sources: [
      { label: 'Angi: house cleaning cost', url: 'https://www.angi.com/articles/how-much-does-it-cost-hire-house-cleaner.htm' },
    ],
  },
  {
    slug: 'pest-control', title: 'Pest Control', noun: 'pest control service',
    headline: { job: 'Quarterly general pest plan', low: 100, high: 200, unit: 'per visit' },
    jobs: [
      { job: 'One-time general pest treatment', low: 150, high: 350 },
      { job: 'Quarterly general pest plan', low: 100, high: 200, unit: 'per visit' },
      { job: 'Mosquito treatment plan', low: 60, high: 100, unit: 'per month' },
      { job: 'Rodent removal and exclusion', low: 300, high: 1500 },
      { job: 'Termite treatment (liquid or bait)', low: 800, high: 2500 },
      { job: 'Tent fumigation for drywood termites', low: 1200, high: 3500 },
      { job: 'Lawn pest treatment (chinch bugs, grubs)', low: 50, high: 120, unit: 'per visit' },
    ],
    drivers: ['Pest type (roaches and ants vs. termites or rodents)', 'Home size and severity', 'One-time vs. recurring plan', 'Warranty or retreatment guarantee'],
    florida: 'Florida\u2019s climate keeps pests active all year. Drywood termites often need whole-house tenting, and subterranean termites are common statewide, so many homes keep an annual termite bond.',
    tips: ['Ask what is covered between visits (free re-treatments).', 'For termites, get the warranty terms in writing.', 'Florida pest control companies must be licensed by FDACS.'],
    faq: [{ q: 'How much does termite tenting cost in Florida?', a: 'Tent fumigation for drywood termites typically costs about $1,200–$3,500 for a single-family home, depending on its size.' }],
    sources: [
      { label: 'Florida pest control pricing', url: 'https://pestcontrolpricing.com/florida-pest-control-cost/' },
      { label: 'Angi: termite treatment in Orlando', url: 'https://www.angi.com/articles/how-much-does-termite-treatment-cost/fl/orlando' },
      { label: 'Florida Home Pros: termite tenting cost', url: 'https://www.theflhomepros.com/guides/termite-tenting-cost' },
    ],
  },
  {
    slug: 'flooring', title: 'Flooring Installation', noun: 'flooring installer',
    headline: { job: 'Luxury vinyl plank (installed)', low: 4, high: 10, unit: 'per sq ft' },
    jobs: [
      { job: 'Luxury vinyl plank (installed)', low: 4, high: 10, unit: 'per sq ft' },
      { job: 'Porcelain or ceramic tile (installed)', low: 8, high: 20, unit: 'per sq ft' },
      { job: 'Hardwood or engineered wood (installed)', low: 8, high: 18, unit: 'per sq ft' },
      { job: 'Carpet (installed)', low: 3, high: 8, unit: 'per sq ft' },
      { job: 'Remove old tile', low: 2, high: 5, unit: 'per sq ft' },
      { job: 'Baseboards (installed)', low: 3, high: 8, unit: 'per linear ft' },
    ],
    drivers: ['Material grade', 'Removing old tile (slow and dusty on slabs)', 'Leveling the slab', 'Stairs, transitions and baseboards'],
    florida: 'Tile and luxury vinyl plank are the most popular floors in Florida because they handle humidity and sand. On concrete slabs, ripping out old tile and leveling can add a lot to the bill.',
    tips: ['Ask if removal, leveling and baseboards are in the per-foot price.', 'Order 10% extra material for cuts and future repairs.', 'Confirm moisture testing on slabs before wood floors.'],
    faq: [{ q: 'What is the cheapest flooring for a Florida home?', a: 'Luxury vinyl plank and carpet are usually the cheapest installed options; LVP is more popular because it is waterproof and handles humidity well.' }],
    sources: [
      { label: 'HomeGuide: luxury vinyl plank cost', url: 'https://homeguide.com/costs/luxury-vinyl-flooring-cost' },
    ],
  },
  {
    slug: 'general-contractor', title: 'General Contractor and Remodeling', noun: 'general contractor',
    headline: { job: 'Bathroom remodel (mid-range)', low: 10000, high: 30000 },
    jobs: [
      { job: 'General contractor fee', low: 10, high: 20, unit: '% of project cost' },
      { job: 'Bathroom remodel (mid-range)', low: 10000, high: 30000 },
      { job: 'Kitchen remodel (mid-range)', low: 20000, high: 60000 },
      { job: 'Room addition', low: 150, high: 350, unit: 'per sq ft' },
      { job: 'Impact windows (per window, installed)', low: 1000, high: 3000 },
      { job: 'Concrete or paver patio', low: 10, high: 25, unit: 'per sq ft' },
    ],
    drivers: ['Scope, finishes and layout changes (moving plumbing costs more)', 'Permits, engineering and inspections', 'Hurricane-code requirements (impact windows and doors, tie-downs)', 'Material lead times'],
    florida: 'Florida building codes require wind-rated windows, doors and structural connections, especially in Miami-Dade and Broward. Big jobs usually need a Notice of Commencement recorded with the county.',
    tips: ['Get at least 3 itemized bids with the same scope.', 'Keep deposits modest: Florida law sets permit and start deadlines when a contractor takes more than 10% up front.', 'Ask for lien releases from subcontractors before the final payment.'],
    faq: [{ q: 'Do general contractors need a license in Florida?', a: 'Yes. General, building and residential contractors are licensed by the state (DBPR). Check the license at myfloridalicense.com and ask for proof of insurance.' }],
    sources: [
      { label: 'HomeGuide: bathroom remodel cost', url: 'https://homeguide.com/costs/bathroom-remodel-cost' },
      { label: 'HomeGuide: kitchen remodel cost', url: 'https://homeguide.com/costs/kitchen-remodel-cost' },
    ],
  },
  {
    slug: 'handyman', title: 'Handyman', noun: 'handyman',
    headline: { job: 'Hourly rate', low: 60, high: 125, unit: 'per hour' },
    jobs: [
      { job: 'Hourly rate', low: 60, high: 125, unit: 'per hour' },
      { job: 'Minimum / trip charge', low: 75, high: 150 },
      { job: 'Mount a TV', low: 100, high: 300 },
      { job: 'Drywall patch and paint', low: 150, high: 450 },
      { job: 'Hang or replace an interior door', low: 250, high: 800 },
      { job: 'Furniture assembly', low: 60, high: 200 },
      { job: 'Install hurricane shutters (existing hardware)', low: 100, high: 400 },
    ],
    drivers: ['Number of tasks in one visit', 'Materials supplied by you or the handyman', 'Minimum charges', 'Work that legally needs a licensed trade'],
    florida: 'Florida has no statewide handyman license, but handymen cannot do work that needs a licensed contractor, such as electrical, plumbing, HVAC, roofing or structural work.',
    tips: ['Make a list and book one visit for several small jobs.', 'Ask whether the price is hourly or per task.', 'Check county licensing and insurance.'],
    faq: [{ q: 'Does a handyman need a license in Florida?', a: 'There is no state handyman license, but some counties license handymen, and any electrical, plumbing, HVAC, roofing or structural work needs a licensed contractor.' }],
    sources: [
      { label: 'Angi: handyman prices', url: 'https://www.angi.com/articles/what-are-common-handyman-prices.htm' },
      { label: 'HomeGuide: handyman prices', url: 'https://homeguide.com/costs/handyman-prices' },
    ],
  },
  {
    slug: 'locksmith', title: 'Locksmith', noun: 'locksmith',
    headline: { job: 'House or car lockout', low: 75, high: 250 },
    jobs: [
      { job: 'House or car lockout', low: 75, high: 250 },
      { job: 'Rekey locks (per lock, plus service call)', low: 20, high: 50 },
      { job: 'Replace a deadbolt or entry lock', low: 150, high: 400 },
      { job: 'Smart lock installation', low: 150, high: 400 },
      { job: 'Car key fob replacement and programming', low: 150, high: 500 },
    ],
    drivers: ['Time of day (nights and weekends cost more)', 'Lock grade and brand', 'Car make and key type', 'Travel distance'],
    florida: 'Rekeying after moving into a new home or a vacation rental changeover is one of the most common Florida locksmith jobs.',
    tips: ['Ask for the total price on the phone, including the service call.', 'Beware of ads quoting very low prices that rise on arrival.', 'Ask for ID and a business name on the invoice.'],
    faq: [{ q: 'Is it cheaper to rekey or replace locks?', a: 'Rekeying is usually cheaper: about $20–$50 per lock plus the service call, versus $150–$400 to replace an entry lock.' }],
    sources: [
      { label: 'Angi: locksmith costs', url: 'https://www.angi.com/articles/keys-home-locksmith-assistance-and-costs.htm' },
    ],
  },
  {
    slug: 'pool-service', title: 'Pool Service', noun: 'pool service',
    headline: { job: 'Weekly pool cleaning and chemicals', low: 100, high: 200, unit: 'per month' },
    jobs: [
      { job: 'Weekly pool cleaning and chemicals', low: 100, high: 200, unit: 'per month' },
      { job: 'Green-to-clean (one-time)', low: 250, high: 700 },
      { job: 'Filter cleaning', low: 75, high: 200 },
      { job: 'Pool pump replacement (installed)', low: 800, high: 2000 },
      { job: 'Pool heater or heat pump (installed)', low: 3000, high: 6500 },
      { job: 'Pool resurfacing', low: 5000, high: 15000 },
    ],
    drivers: ['Pool size and screen enclosure (less debris)', 'Whether chemicals are included', 'Saltwater vs. chlorine', 'Equipment age'],
    florida: 'Florida pools are used most of the year and heat and rain swing water chemistry fast, so weekly service is the norm. Variable-speed pumps are required for most replacement pumps and cut electric bills.',
    tips: ['Ask if chemicals are included in the monthly price.', 'Ask for a written checklist of what each visit covers.', 'For equipment, compare installed prices, not just the part.'],
    faq: [{ q: 'How much is pool service per month in Florida?', a: 'Weekly cleaning with chemicals typically costs about $100–$200 per month for a standard residential pool.' }],
    sources: [
      { label: 'Florida pool service cost', url: 'https://acleanpoolusa.com/blog/how-much-does-pool-service-cost-florida.html' },
    ],
  },
  {
    slug: 'garage-door', title: 'Garage Door Repair', noun: 'garage door repair',
    headline: { job: 'Torsion spring replacement', low: 150, high: 350 },
    jobs: [
      { job: 'Service call', low: 75, high: 150 },
      { job: 'Torsion spring replacement', low: 150, high: 350 },
      { job: 'Garage door opener (installed)', low: 350, high: 900 },
      { job: 'New single garage door (installed)', low: 1000, high: 3000 },
      { job: 'New double garage door, wind-rated (installed)', low: 1500, high: 4500 },
    ],
    drivers: ['Door size and wind rating', 'Insulation and windows', 'Opener type (belt, chain, wall-mount)', 'Emergency calls'],
    florida: 'In Florida, replacement garage doors must meet wind-load codes, and impact-rated doors cost more but can lower windstorm insurance premiums.',
    tips: ['Replace both springs at once on two-spring doors.', 'Ask for the wind rating and product approval number on new doors.', 'Get a written price before work starts.'],
    faq: [{ q: 'How much does it cost to replace a garage door spring?', a: 'Typically about $150–$350 including labor; replacing both springs on a two-spring door is usually recommended.' }],
    sources: [
      { label: 'HomeGuide: garage door spring replacement', url: 'https://homeguide.com/costs/garage-door-spring-replacement-cost' },
      { label: 'Angi: garage door spring replacement', url: 'https://www.angi.com/articles/how-much-should-garage-door-spring-replacement-cost.htm' },
    ],
  },
  {
    slug: 'fencing', title: 'Fence Installation', noun: 'fence installer',
    headline: { job: 'Vinyl privacy fence (installed)', low: 35, high: 65, unit: 'per linear ft' },
    jobs: [
      { job: 'Wood privacy fence (installed)', low: 25, high: 45, unit: 'per linear ft' },
      { job: 'Vinyl privacy fence (installed)', low: 35, high: 65, unit: 'per linear ft' },
      { job: 'Aluminum fence (installed)', low: 35, high: 70, unit: 'per linear ft' },
      { job: 'Chain link fence (installed)', low: 15, high: 35, unit: 'per linear ft' },
      { job: 'Gate (installed)', low: 300, high: 1500 },
      { job: 'Fence repair', low: 200, high: 800 },
    ],
    drivers: ['Material and height', 'Total length and number of gates', 'Removing the old fence', 'Permits, HOA rules and pool-barrier codes'],
    florida: 'Vinyl and aluminum are popular in Florida because wood rots in the heat and humidity. Pool fences must meet Florida pool-barrier rules, and many cities require a fence permit.',
    tips: ['Check HOA and city rules before you buy.', 'Ask if permit, post concrete and old-fence removal are included.', 'Call 811 (Sunshine 811) to mark utilities before digging.'],
    faq: [{ q: 'Do I need a permit for a fence in Florida?', a: 'Many Florida cities and counties require a fence permit, and HOAs often have their own rules. Your installer should know the local requirements.' }],
    sources: [
      { label: 'HomeGuide: vinyl fence cost', url: 'https://homeguide.com/costs/vinyl-fence-cost' },
      { label: 'Angi: vinyl fence cost', url: 'https://www.angi.com/articles/vinyl-fence-cost.htm' },
    ],
  },
  {
    slug: 'moving-companies', title: 'Movers', noun: 'mover',
    headline: { job: 'Local move, 2–3 bedroom home', low: 1000, high: 2500 },
    jobs: [
      { job: 'Two movers and a truck (local)', low: 100, high: 200, unit: 'per hour' },
      { job: 'Local move, studio or 1 bedroom', low: 400, high: 1200 },
      { job: 'Local move, 2–3 bedroom home', low: 1000, high: 2500 },
      { job: 'In-state move (e.g. Miami to Orlando), 2–3 bedrooms', low: 2000, high: 5000 },
      { job: 'Out-of-state move, 2–3 bedrooms', low: 3000, high: 9000 },
      { job: 'Packing service', low: 300, high: 1500 },
    ],
    drivers: ['Home size and amount of stuff', 'Distance and stairs or elevators', 'Packing and specialty items (piano, safe)', 'Season: summer and month-end are busiest'],
    florida: 'Movers that move households within Florida must be registered with FDACS; interstate movers need a USDOT number from FMCSA. Summer heat and hurricane season can affect scheduling.',
    tips: ['Get a written estimate after an in-home or video survey.', 'Check FDACS registration for in-state movers.', 'Be wary of very low quotes and large cash deposits.'],
    faq: [{ q: 'How much do movers cost in Florida?', a: 'A local move of a 2–3 bedroom home typically costs about $1,000–$2,500; two movers and a truck usually run about $100–$200 per hour.' }],
    sources: [
      { label: 'Angi: movers in Tampa', url: 'https://www.angi.com/articles/how-much-does-it-cost-hire-movers/fl/tampa' },
      { label: 'Angi: movers in Orlando', url: 'https://www.angi.com/articles/how-much-does-it-cost-hire-movers/fl/orlando' },
    ],
  },
  {
    slug: 'solar-installation', title: 'Solar Panel Installation', noun: 'solar installation',
    headline: { job: 'Rooftop solar system (about 8 kW, installed)', low: 16000, high: 24000 },
    jobs: [
      { job: 'Installed price per watt', low: 2, high: 2.8, unit: 'per watt' },
      { job: 'Rooftop solar system (about 8 kW, installed)', low: 16000, high: 24000 },
      { job: 'Home battery (installed)', low: 10000, high: 17000 },
      { job: 'Panel removal and reinstall (for a reroof)', low: 2000, high: 5000 },
    ],
    drivers: ['System size and panel/inverter brand', 'Roof type and condition (tile costs more)', 'Battery storage', 'Permits and utility interconnection'],
    florida: 'Florida exempts residential solar equipment from sales tax and from property tax on the added home value. The 30% federal residential solar tax credit ended for systems installed after 2025, so compare 2026 quotes without it.',
    tips: ['Compare price per watt, not just the monthly payment.', 'Replace an old roof before installing panels.', 'Read loan, lease or PPA terms carefully.'],
    faq: [{ q: 'Is there still a federal solar tax credit in 2026?', a: 'The 30% federal residential clean energy credit (Section 25D) ended for systems installed after December 31, 2025. Florida still exempts residential solar from sales tax and from property tax on the added value.' }],
    sources: [
      { label: 'EnergySage: Florida solar panel cost', url: 'https://www.energysage.com/local-data/solar-panel-cost/fl/' },
      { label: 'EnergySage: Florida battery storage cost', url: 'https://www.energysage.com/local-data/energy-storage-cost/fl/' },
    ],
  },
  {
    slug: 'window-cleaning', title: 'Window Cleaning', noun: 'window cleaner',
    headline: { job: 'Whole house, inside and out (single-story)', low: 150, high: 400 },
    jobs: [
      { job: 'Per window pane', low: 5, high: 15 },
      { job: 'Whole house, outside only (single-story)', low: 100, high: 250 },
      { job: 'Whole house, inside and out (single-story)', low: 150, high: 400 },
      { job: 'Two-story home, inside and out', low: 250, high: 600 },
      { job: 'Screen cleaning', low: 3, high: 7, unit: 'per screen' },
    ],
    drivers: ['Number of windows and stories', 'Inside, outside or both', 'Hard-water stains and salt spray', 'Screens and tracks'],
    florida: 'Salt spray near the coast and hard-water spots from sprinklers mean Florida windows often need cleaning more often, and hard-water stain removal costs extra.',
    tips: ['Ask if screens and tracks are included.', 'Recurring plans are cheaper per visit.', 'Confirm insurance for two-story and ladder work.'],
    faq: [{ q: 'How much does window cleaning cost?', a: 'A single-story home inside and out typically costs about $150–$400, or roughly $5–$15 per pane.' }],
    sources: [
      { label: 'Angi: window cleaning cost', url: 'https://www.angi.com/articles/how-much-does-window-cleaning-cost.htm' },
      { label: 'HomeGuide: window cleaning prices', url: 'https://homeguide.com/costs/window-cleaning-prices' },
    ],
  },
  {
    slug: 'carpet-cleaning', title: 'Carpet Cleaning', noun: 'carpet cleaner',
    headline: { job: 'Whole home (3–5 rooms)', low: 150, high: 350 },
    jobs: [
      { job: 'Per room', low: 40, high: 80 },
      { job: 'Whole home (3–5 rooms)', low: 150, high: 350 },
      { job: 'Pet stain and odor treatment', low: 25, high: 100, unit: 'per area' },
      { job: 'Upholstery (sofa)', low: 100, high: 250 },
      { job: 'Tile and grout cleaning', low: 0.75, high: 2, unit: 'per sq ft' },
    ],
    drivers: ['Square footage and number of rooms', 'Stains, pets and heavy soil', 'Method (hot water extraction vs. low-moisture)', 'Minimum charges'],
    florida: 'Humidity slows drying in Florida, so ask about drying time and run the AC after cleaning. Tile and grout cleaning is a common add-on because so many Florida homes have tile.',
    tips: ['Ask for the price per room and what counts as a room.', 'Watch out for very low "per room" ads with expensive add-ons.', 'Ask how long drying takes.'],
    faq: [{ q: 'How much does carpet cleaning cost per room?', a: 'Usually about $40–$80 per room, with a minimum charge; whole-home packages for 3–5 rooms often run $150–$350.' }],
    sources: [
      { label: 'Angi: carpet cleaning cost', url: 'https://www.angi.com/articles/how-much-does-carpet-cleaning-cost.htm' },
    ],
  },
  {
    slug: 'tree-service', title: 'Tree Service', noun: 'tree service',
    headline: { job: 'Tree removal (medium tree)', low: 500, high: 1500 },
    jobs: [
      { job: 'Palm tree trimming', low: 75, high: 350, unit: 'per palm' },
      { job: 'Tree trimming', low: 250, high: 1200, unit: 'per tree' },
      { job: 'Tree removal (small tree)', low: 300, high: 900 },
      { job: 'Tree removal (medium tree)', low: 500, high: 1500 },
      { job: 'Tree removal (large tree near the house)', low: 1500, high: 4000 },
      { job: 'Stump grinding', low: 100, high: 450 },
    ],
    drivers: ['Tree height and closeness to the house or power lines', 'Crane or bucket truck needs', 'Debris haul-away', 'Permits for removals'],
    florida: 'Hurricane-season prep (trimming palms and thinning canopies) is the busiest time. Many Florida counties and cities, including Miami-Dade, require a permit to remove certain trees.',
    tips: ['Check whether removal needs a county or city permit.', 'Ask if stump grinding and haul-away are included.', 'Get proof of liability insurance before anyone climbs.'],
    faq: [{ q: 'How much does palm tree trimming cost in Florida?', a: 'Typically about $75–$350 per palm, depending on height and type.' }],
    sources: [
      { label: 'HomeGuide: tree removal cost', url: 'https://homeguide.com/costs/tree-removal-cost' },
      { label: 'Angi: tree removal in Tampa', url: 'https://www.angi.com/articles/how-much-does-tree-removal-cost/fl/tampa' },
    ],
  },
  {
    slug: 'security-alarm', title: 'Home Security System', noun: 'home security system',
    headline: { job: 'Professional monitoring', low: 20, high: 60, unit: 'per month' },
    jobs: [
      { job: 'Basic alarm system (equipment and installation)', low: 300, high: 1500 },
      { job: 'Professional monitoring', low: 20, high: 60, unit: 'per month' },
      { job: 'Camera system, 4 cameras (installed)', low: 800, high: 2500 },
      { job: 'Video doorbell (installed)', low: 100, high: 300 },
    ],
    drivers: ['Number of sensors and cameras', 'Wired vs. wireless', 'Monitoring contract length', 'Smart-home integration'],
    florida: 'Florida requires alarm system contractors to be licensed by the state, and many homeowner insurers give a discount for monitored alarms.',
    tips: ['Read the contract length and cancellation terms.', 'Ask if equipment is owned or leased.', 'Ask your insurer about a monitored-alarm discount.'],
    faq: [{ q: 'Do alarm installers need a license in Florida?', a: 'Yes. Alarm system contractors are licensed by the Florida Electrical Contractors\u2019 Licensing Board (DBPR).' }],
    sources: [
      { label: 'Ring: professional monitoring', url: 'https://ring.com/professional-monitoring' },
      { label: 'ADT: monitoring plans', url: 'https://www.adt.com/monitoring-plans-security-services' },
    ],
  },
  {
    slug: 'appliance-repair', title: 'Appliance Repair', noun: 'appliance repair',
    headline: { job: 'Refrigerator repair', low: 150, high: 500 },
    jobs: [
      { job: 'Service call / diagnostic', low: 75, high: 150, note: 'Often credited toward the repair.' },
      { job: 'Refrigerator repair', low: 150, high: 500 },
      { job: 'Washer repair', low: 150, high: 450 },
      { job: 'Dryer repair', low: 150, high: 400 },
      { job: 'Dishwasher repair', low: 150, high: 400 },
      { job: 'Oven or range repair', low: 150, high: 500 },
    ],
    drivers: ['Part cost and availability', 'Brand (premium brands cost more)', 'Age of the appliance', 'Same-day service'],
    florida: 'Heat and humidity work refrigerators and ice makers hard in Florida, and power surges from storms are a common cause of control-board failures.',
    tips: ['Ask if the diagnostic fee is credited toward the repair.', 'If the repair is over half the price of a new appliance, consider replacing.', 'Ask about the parts and labor warranty.'],
    faq: [{ q: 'Is it worth repairing an appliance?', a: 'A common rule: if the repair costs more than half the price of a new one and the appliance is past the middle of its life, replacing it usually makes more sense.' }],
    sources: [
      { label: 'Angi: refrigerator repair cost', url: 'https://www.angi.com/articles/how-much-does-refrigerator-repair-cost.htm' },
      { label: 'HomeGuide: refrigerator repair cost', url: 'https://homeguide.com/costs/refrigerator-repair-cost' },
    ],
  },
];

export const COST_GUIDES: CostGuide[] = G;
export const costGuide = (slug: string) => G.find((g) => g.slug === slug);

/** One-sentence answer used on city x service pages and llms-full.txt. */
export function costSentence(g: CostGuide): string {
  return `${g.headline.job}: typically ${costRange(g.headline)} in Florida (2026 estimate).`;
}
