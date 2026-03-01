// City-to-county mapping for Florida counties covered by HireAnyPro
const COUNTY_MAP: Record<string, string[]> = {
  'Miami-Dade': [
    'Aventura', 'Bal Harbour', 'Bay Harbor Islands', 'Biscayne Park', 'Coconut Grove',
    'Coral Gables', 'Coral Way', 'Cutler Bay', 'Doral', 'El Portal', 'Florida City',
    'Hialeah', 'Hialeah Gardens', 'Homestead', 'Kendall', 'Key Biscayne',
    'Medley', 'Miami', 'Miami Beach', 'Miami Gardens', 'Miami Lakes', 'Miami Shores',
    'Miami Springs', 'Naranja', 'North Bay Village', 'North Miami', 'North Miami Beach',
    'Olympia Heights', 'Opa-locka', 'Palmetto Bay', 'Pinecrest', 'Princeton',
    'South Miami', 'Sunny Isles Beach', 'Surfside', 'Virginia Gardens', 'West Miami',
    'Brownsville', 'Carol City', 'HALNDLE BCH', 'Hollywood Beach',
  ],
  'Broward': [
    'Coconut Creek', 'Cooper City', 'Coral Springs', 'Dania Beach', 'Davie',
    'Deerfield Beach', 'Fort Lauderdale', 'Hallandale Beach', 'Hillsboro Beach',
    'Hollywood', 'Lauderdale Lakes', 'Lauderdale-By-The-Sea', 'Lauderhill',
    'Margate', 'Miramar', 'North Lauderdale', 'Oakland Park', 'Parkland',
    'Pembroke Park', 'Pembroke Pines', 'Plantation', 'Pompano Beach',
    'Southwest Ranches', 'Sunrise', 'Tamarac', 'West Park', 'Weston', 'Wilton Manors',
    'Lighthouse Point',
  ],
  'Palm Beach': [
    'Atlantis', 'Belle Glade', 'Boca Raton', 'Boynton Beach', 'Delray Beach',
    'Golf', 'Greenacres', 'Gulf Stream', 'Haverhill', 'Highland Beach',
    'Hypoluxo', 'Juno Beach', 'Jupiter', 'Jupiter Inlet Colony', 'Lake Clarke Shores',
    'Lake Park', 'Lake Worth', 'Lake Worth Beach', 'Lake Worth Corridor', 'Lantana',
    'Loxahatchee', 'Manalapan', 'Mangonia Park', 'North Palm Beach', 'Ocean Ridge',
    'Pahokee', 'Palm Beach', 'Palm Beach Gardens', 'Palm Springs', 'Riviera Beach',
    'Royal Palm Beach', 'South Bay', 'South Palm Beach', 'Tequesta',
    'Wellington', 'West Palm Beach',
  ],
  'Orange': [
    'Alafaya', 'Apopka', 'Azalea Park', 'Belle Isle', 'Christmas', 'Eatonville',
    'Edgewood', 'Gotha', 'Lockhart', 'Maitland', 'Oakland', 'Ocoee', 'Orlando',
    'Pine Castle', 'Sand Lake', 'Windermere', 'Winter Garden', 'Winter Park',
    'BVL', 'Forest City',
  ],
  'Hillsborough': [
    'Apollo Beach', 'Brandon', 'Gibsonton', 'Lutz', 'Plant City', 'Riverview',
    'Ruskin', 'Tampa', 'Temple Terrace', 'Thonotosassa', 'Valrico', 'Wimauma',
  ],
  'Pinellas': [
    'Belleair Beach', 'Clearwater', 'Crystal Beach', 'Dunedin', 'Gulfport',
    'Indian Shores', 'Largo', 'Madeira Beach', 'Oldsmar', 'Pinellas Park',
    'Safety Harbor', 'Seminole', 'South Pasadena', 'St Pete Beach',
    'St. Petersburg', 'Tarpon Springs', 'Treasure Island',
  ],
};

// Build reverse lookup
const cityToCounty: Record<string, string> = {};
for (const [county, cities] of Object.entries(COUNTY_MAP)) {
  for (const city of cities) {
    cityToCounty[city] = county;
  }
}

export function getCountyForCity(city: string): string | null {
  return cityToCounty[city] || null;
}

export function getCitiesInCounty(county: string): string[] {
  return COUNTY_MAP[county] || [];
}

export function getAllCounties(): string[] {
  return Object.keys(COUNTY_MAP);
}

export function countySlug(county: string): string {
  return county.toLowerCase().replace(/\s+/g, '-');
}

export function countyFromSlug(slug: string): string | null {
  return Object.keys(COUNTY_MAP).find(c => countySlug(c) === slug) || null;
}

export function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function cityFromSlug(slug: string, cities: string[]): string | null {
  return cities.find(c => citySlug(c) === slug) || null;
}
