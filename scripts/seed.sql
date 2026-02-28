-- Seed categories
INSERT INTO categories (name, slug, icon) VALUES
('Plumbing', 'plumbing', '🔧'),
('Electrical', 'electrical', '⚡'),
('HVAC', 'hvac', '❄️'),
('Roofing', 'roofing', '🏠'),
('Painting', 'painting', '🎨'),
('Landscaping', 'landscaping', '🌿'),
('Cleaning', 'cleaning', '🧹'),
('Pest Control', 'pest-control', '🐛'),
('Flooring', 'flooring', '🪵'),
('General Contractor', 'general-contractor', '🔨'),
('Locksmith', 'locksmith', '🔑'),
('Pool Service', 'pool-service', '🏊')
ON CONFLICT (slug) DO NOTHING;

-- Seed listings
INSERT INTO listings (name, slug, description, category_id, address, city, state, zip, lat, lng, phone, email, website, rating, review_count, featured, hours) VALUES
('Miami Pro Plumbing', 'miami-pro-plumbing', 'Full-service residential and commercial plumbing. Licensed, insured, and available 24/7 for emergencies.', (SELECT id FROM categories WHERE slug='plumbing'), '1250 NW 36th St', 'Miami', 'FL', '33142', 25.7985, -80.2241, '(305) 555-0101', 'info@miamiplumbing.com', 'https://miamiplumbing.com', 4.8, 127, true, '{"mon":"8am-6pm","tue":"8am-6pm","wed":"8am-6pm","thu":"8am-6pm","fri":"8am-6pm","sat":"9am-2pm","sun":"Closed"}'),

('Coral Gables Electric', 'coral-gables-electric', 'Expert electrical services for homes and businesses in Coral Gables and surrounding areas. Panel upgrades, rewiring, and smart home installations.', (SELECT id FROM categories WHERE slug='electrical'), '315 Miracle Mile', 'Coral Gables', 'FL', '33134', 25.7496, -80.2590, '(305) 555-0102', 'service@cgelectric.com', 'https://cgelectric.com', 4.9, 89, true, '{"mon":"7am-5pm","tue":"7am-5pm","wed":"7am-5pm","thu":"7am-5pm","fri":"7am-5pm","sat":"8am-12pm","sun":"Closed"}'),

('Arctic Air HVAC', 'arctic-air-hvac', 'Keep your home cool with South Florida''s trusted HVAC specialists. Installation, repair, and maintenance of all AC systems.', (SELECT id FROM categories WHERE slug='hvac'), '8700 SW 72nd Ave', 'Miami', 'FL', '33156', 25.6930, -80.3100, '(305) 555-0103', 'cool@arcticairhvac.com', 'https://arcticairhvac.com', 4.7, 203, true, '{"mon":"7am-7pm","tue":"7am-7pm","wed":"7am-7pm","thu":"7am-7pm","fri":"7am-7pm","sat":"8am-4pm","sun":"Emergency Only"}'),

('Sunshine Roofing Co', 'sunshine-roofing-co', 'Roof repairs, replacements, and inspections. Specializing in tile, shingle, and flat roofing systems for South Florida homes.', (SELECT id FROM categories WHERE slug='roofing'), '2100 NE 163rd St', 'North Miami Beach', 'FL', '33162', 25.9284, -80.1627, '(305) 555-0104', 'hello@sunshineroofing.com', 'https://sunshineroofing.com', 4.6, 156, true, '{"mon":"7am-5pm","tue":"7am-5pm","wed":"7am-5pm","thu":"7am-5pm","fri":"7am-5pm","sat":"By Appointment","sun":"Closed"}'),

('Perfect Coat Painters', 'perfect-coat-painters', 'Interior and exterior painting services. Color consultations, cabinet refinishing, and commercial painting available.', (SELECT id FROM categories WHERE slug='painting'), '5601 Sunset Dr', 'South Miami', 'FL', '33143', 25.7063, -80.2897, '(305) 555-0105', 'paint@perfectcoat.com', 'https://perfectcoat.com', 4.5, 67, false, '{"mon":"8am-5pm","tue":"8am-5pm","wed":"8am-5pm","thu":"8am-5pm","fri":"8am-5pm","sat":"9am-3pm","sun":"Closed"}'),

('Green Thumb Landscaping', 'green-thumb-landscaping', 'Professional lawn care, garden design, tree trimming, and irrigation systems. Making Miami beautiful one yard at a time.', (SELECT id FROM categories WHERE slug='landscaping'), '14200 SW 8th St', 'Miami', 'FL', '33184', 25.7592, -80.3934, '(305) 555-0106', 'grow@greenthumb.com', 'https://greenthumbmiami.com', 4.4, 92, false, '{"mon":"7am-4pm","tue":"7am-4pm","wed":"7am-4pm","thu":"7am-4pm","fri":"7am-4pm","sat":"7am-12pm","sun":"Closed"}'),

('Sparkle Clean Services', 'sparkle-clean-services', 'Residential and commercial cleaning. Deep cleaning, move-in/move-out, recurring maid service. Eco-friendly products available.', (SELECT id FROM categories WHERE slug='cleaning'), '777 Brickell Ave', 'Miami', 'FL', '33131', 25.7643, -80.1909, '(305) 555-0107', 'clean@sparkleclean.com', 'https://sparkleclean.com', 4.8, 245, true, '{"mon":"7am-7pm","tue":"7am-7pm","wed":"7am-7pm","thu":"7am-7pm","fri":"7am-7pm","sat":"8am-5pm","sun":"9am-3pm"}'),

('BugOut Pest Control', 'bugout-pest-control', 'Comprehensive pest management solutions. Termite inspections, rodent control, mosquito treatments, and lawn pest services.', (SELECT id FROM categories WHERE slug='pest-control'), '3401 N Miami Ave', 'Miami', 'FL', '33127', 25.8050, -80.1958, '(305) 555-0108', 'bugs@bugout.com', 'https://bugoutmiami.com', 4.3, 78, false, '{"mon":"8am-5pm","tue":"8am-5pm","wed":"8am-5pm","thu":"8am-5pm","fri":"8am-5pm","sat":"9am-1pm","sun":"Closed"}'),

('Dade Flooring Pros', 'dade-flooring-pros', 'Hardwood, tile, laminate, and vinyl flooring installation. Free estimates and competitive pricing for all of Miami-Dade.', (SELECT id FROM categories WHERE slug='flooring'), '1400 NW 107th Ave', 'Doral', 'FL', '33172', 25.7826, -80.3685, '(305) 555-0109', 'floors@dadeflooring.com', 'https://dadeflooring.com', 4.6, 134, false, '{"mon":"8am-6pm","tue":"8am-6pm","wed":"8am-6pm","thu":"8am-6pm","fri":"8am-6pm","sat":"9am-4pm","sun":"Closed"}'),

('BuildRight General Contractors', 'buildright-general-contractors', 'Full-service general contracting. Kitchen & bath remodels, additions, new construction. Licensed CGC.', (SELECT id FROM categories WHERE slug='general-contractor'), '9500 S Dixie Hwy', 'Pinecrest', 'FL', '33156', 25.6670, -80.3056, '(305) 555-0110', 'build@buildright.com', 'https://buildrightmiami.com', 4.9, 167, true, '{"mon":"7am-5pm","tue":"7am-5pm","wed":"7am-5pm","thu":"7am-5pm","fri":"7am-5pm","sat":"By Appointment","sun":"Closed"}'),

('Rapid Response Plumbing', 'rapid-response-plumbing', 'Emergency plumbing services available 24/7. Drain cleaning, water heater repair, pipe repair, and bathroom remodeling.', (SELECT id FROM categories WHERE slug='plumbing'), '16000 NW 57th Ave', 'Miami Lakes', 'FL', '33014', 25.9120, -80.3186, '(305) 555-0111', 'rapid@rrplumbing.com', 'https://rapidresponseplumbing.com', 4.2, 53, false, '{"mon":"24hrs","tue":"24hrs","wed":"24hrs","thu":"24hrs","fri":"24hrs","sat":"24hrs","sun":"24hrs"}'),

('PowerUp Electrical', 'powerup-electrical', 'Residential electrical contractor specializing in EV charger installation, solar panel wiring, and whole-home generators.', (SELECT id FROM categories WHERE slug='electrical'), '6900 SW 40th St', 'Miami', 'FL', '33155', 25.7351, -80.3200, '(305) 555-0112', 'info@powerupelectric.com', 'https://powerupelectric.com', 4.7, 41, false, '{"mon":"8am-5pm","tue":"8am-5pm","wed":"8am-5pm","thu":"8am-5pm","fri":"8am-5pm","sat":"Closed","sun":"Closed"}'),

('Breezy AC & Heating', 'breezy-ac-heating', 'Family-owned HVAC company serving Miami-Dade for over 20 years. Duct cleaning, AC installation, and preventive maintenance plans.', (SELECT id FROM categories WHERE slug='hvac'), '20335 Biscayne Blvd', 'Aventura', 'FL', '33180', 25.9565, -80.1428, '(305) 555-0113', 'service@breezyac.com', 'https://breezyac.com', 4.5, 98, false, '{"mon":"8am-6pm","tue":"8am-6pm","wed":"8am-6pm","thu":"8am-6pm","fri":"8am-6pm","sat":"9am-2pm","sun":"Closed"}'),

('TopShield Roofing', 'topshield-roofing', 'Hurricane-rated roofing systems. Metal roofing, TPO commercial roofing, and emergency storm damage repair.', (SELECT id FROM categories WHERE slug='roofing'), '4800 NW 167th St', 'Miami Gardens', 'FL', '33055', 25.9371, -80.2828, '(305) 555-0114', 'roof@topshield.com', 'https://topshieldroofing.com', 4.8, 112, false, '{"mon":"7am-5pm","tue":"7am-5pm","wed":"7am-5pm","thu":"7am-5pm","fri":"7am-5pm","sat":"Emergency Only","sun":"Closed"}'),

('Fresh Look Painting', 'fresh-look-painting', 'Transform your space with our professional painting crew. Specializing in luxury homes, HOA-approved colors, and epoxy garage floors.', (SELECT id FROM categories WHERE slug='painting'), '1200 Ponce De Leon Blvd', 'Coral Gables', 'FL', '33134', 25.7540, -80.2600, '(305) 555-0115', 'info@freshlookpainting.com', 'https://freshlookpainting.com', 4.1, 34, false, '{"mon":"8am-5pm","tue":"8am-5pm","wed":"8am-5pm","thu":"8am-5pm","fri":"8am-5pm","sat":"By Appointment","sun":"Closed"}'),

('Paradise Landscaping & Pools', 'paradise-landscaping-pools', 'Complete outdoor living solutions. Landscape design, pool installation, outdoor kitchens, and paver patios.', (SELECT id FROM categories WHERE slug='landscaping'), '11000 SW 104th St', 'Kendall', 'FL', '33176', 25.6684, -80.3538, '(305) 555-0116', 'paradise@plpmiami.com', 'https://paradiselandscaping.com', 4.6, 77, false, '{"mon":"7am-5pm","tue":"7am-5pm","wed":"7am-5pm","thu":"7am-5pm","fri":"7am-5pm","sat":"8am-2pm","sun":"Closed"}'),

('Diamond Maids', 'diamond-maids', 'Premium residential cleaning services. Trained and background-checked staff. Same-day service available.', (SELECT id FROM categories WHERE slug='cleaning'), '18901 Collins Ave', 'Sunny Isles Beach', 'FL', '33160', 25.9470, -80.1225, '(305) 555-0117', 'book@diamondmaids.com', 'https://diamondmaids.com', 4.9, 312, true, '{"mon":"7am-8pm","tue":"7am-8pm","wed":"7am-8pm","thu":"7am-8pm","fri":"7am-8pm","sat":"8am-6pm","sun":"9am-4pm"}'),

('Guardian Pest Solutions', 'guardian-pest-solutions', 'Eco-friendly pest control for homes and businesses. Specializing in no-tent termite treatments and green pest solutions.', (SELECT id FROM categories WHERE slug='pest-control'), '7300 Bird Rd', 'Miami', 'FL', '33155', 25.7349, -80.3144, '(305) 555-0118', 'guard@guardianpest.com', 'https://guardianpest.com', 4.4, 56, false, '{"mon":"8am-5pm","tue":"8am-5pm","wed":"8am-5pm","thu":"8am-5pm","fri":"8am-5pm","sat":"9am-12pm","sun":"Closed"}'),

('Elite Tile & Stone', 'elite-tile-stone', 'Custom tile installation, marble countertops, and stone work. Showroom available by appointment.', (SELECT id FROM categories WHERE slug='flooring'), '5800 NW 74th Ave', 'Miami', 'FL', '33166', 25.8180, -80.3283, '(305) 555-0119', 'info@elitetile.com', 'https://elitetileandstone.com', 4.7, 88, false, '{"mon":"9am-5pm","tue":"9am-5pm","wed":"9am-5pm","thu":"9am-5pm","fri":"9am-5pm","sat":"10am-3pm","sun":"Closed"}'),

('Ace Home Builders', 'ace-home-builders', 'Custom home building and major renovations. Impact windows, room additions, and complete home makeovers.', (SELECT id FROM categories WHERE slug='general-contractor'), '3250 NE 1st Ave', 'Miami', 'FL', '33137', 25.8075, -80.1927, '(305) 555-0120', 'info@acebuild.com', 'https://acebuildmiami.com', 4.3, 45, false, '{"mon":"7am-4pm","tue":"7am-4pm","wed":"7am-4pm","thu":"7am-4pm","fri":"7am-4pm","sat":"By Appointment","sun":"Closed"}'),

('KeyMaster Locksmith', 'keymaster-locksmith', '24/7 mobile locksmith service. Car lockouts, lock changes, smart lock installation, and commercial access control.', (SELECT id FROM categories WHERE slug='locksmith'), '1700 NW 7th Ave', 'Miami', 'FL', '33136', 25.7900, -80.2100, '(305) 555-0121', 'help@keymaster.com', 'https://keymastermiami.com', 4.5, 63, false, '{"mon":"24hrs","tue":"24hrs","wed":"24hrs","thu":"24hrs","fri":"24hrs","sat":"24hrs","sun":"24hrs"}'),

('Crystal Clear Pool Service', 'crystal-clear-pool-service', 'Weekly pool maintenance, equipment repair, pool resurfacing, and chemical balancing for residential and commercial pools.', (SELECT id FROM categories WHERE slug='pool-service'), '10600 SW 72nd St', 'Miami', 'FL', '33173', 25.6942, -80.3552, '(305) 555-0122', 'pools@crystalclear.com', 'https://crystalclearpools.com', 4.6, 91, false, '{"mon":"7am-4pm","tue":"7am-4pm","wed":"7am-4pm","thu":"7am-4pm","fri":"7am-4pm","sat":"8am-12pm","sun":"Closed"}'),

('SoFlo Drain Masters', 'soflo-drain-masters', 'Drain cleaning and sewer line experts. Camera inspections, hydro-jetting, and trenchless pipe repair.', (SELECT id FROM categories WHERE slug='plumbing'), '2850 SW 27th Ave', 'Coconut Grove', 'FL', '33133', 25.7370, -80.2390, '(305) 555-0123', 'drains@soflodrain.com', 'https://soflodrain.com', 4.4, 72, false, '{"mon":"7am-6pm","tue":"7am-6pm","wed":"7am-6pm","thu":"7am-6pm","fri":"7am-6pm","sat":"8am-2pm","sun":"Emergency Only"}'),

('Volt Electric Services', 'volt-electric-services', 'Commercial and industrial electrical services. Lighting retrofits, emergency power systems, and code compliance.', (SELECT id FROM categories WHERE slug='electrical'), '12001 NW 36th St', 'Doral', 'FL', '33178', 25.7974, -80.3822, '(305) 555-0124', 'service@voltelectric.com', 'https://voltelectric.com', 4.8, 55, false, '{"mon":"6am-6pm","tue":"6am-6pm","wed":"6am-6pm","thu":"6am-6pm","fri":"6am-6pm","sat":"By Appointment","sun":"Closed"}'),

('Cool Breeze HVAC Solutions', 'cool-breeze-hvac-solutions', 'Energy-efficient AC systems and ductless mini-splits. Free in-home estimates. Financing available.', (SELECT id FROM categories WHERE slug='hvac'), '7200 NW 186th St', 'Hialeah', 'FL', '33015', 25.9403, -80.3222, '(305) 555-0125', 'info@coolbreezefl.com', 'https://coolbreezefl.com', 4.3, 38, false, '{"mon":"8am-5pm","tue":"8am-5pm","wed":"8am-5pm","thu":"8am-5pm","fri":"8am-5pm","sat":"9am-1pm","sun":"Closed"}')
ON CONFLICT (slug) DO NOTHING;

-- Seed reviews
INSERT INTO reviews (listing_id, author_name, rating, comment) VALUES
((SELECT id FROM listings WHERE slug='miami-pro-plumbing'), 'Maria G.', 5, 'Excellent service! They fixed our burst pipe in under an hour. Very professional.'),
((SELECT id FROM listings WHERE slug='miami-pro-plumbing'), 'John D.', 5, 'Best plumber in Miami. Fair pricing and quality work.'),
((SELECT id FROM listings WHERE slug='coral-gables-electric'), 'Sarah K.', 5, 'Upgraded our entire panel. Clean work and great communication throughout.'),
((SELECT id FROM listings WHERE slug='arctic-air-hvac'), 'Roberto M.', 5, 'Installed a new AC system. House has never been cooler. Highly recommend!'),
((SELECT id FROM listings WHERE slug='arctic-air-hvac'), 'Lisa P.', 4, 'Good service but had to wait a couple days for the appointment.'),
((SELECT id FROM listings WHERE slug='sparkle-clean-services'), 'Amanda R.', 5, 'Our house has never looked this clean. The team was thorough and friendly.'),
((SELECT id FROM listings WHERE slug='sparkle-clean-services'), 'David L.', 5, 'Been using them monthly for a year. Consistently excellent.'),
((SELECT id FROM listings WHERE slug='buildright-general-contractors'), 'Carlos V.', 5, 'Completely remodeled our kitchen. The result exceeded our expectations.'),
((SELECT id FROM listings WHERE slug='buildright-general-contractors'), 'Patricia H.', 5, 'Professional from start to finish. On budget and on time.'),
((SELECT id FROM listings WHERE slug='diamond-maids'), 'Jennifer W.', 5, 'The best cleaning service I have ever used. Five stars across the board.'),
((SELECT id FROM listings WHERE slug='sunshine-roofing-co'), 'Mike T.', 4, 'Replaced our roof after Hurricane season. Great job, fair price.'),
((SELECT id FROM listings WHERE slug='sunshine-roofing-co'), 'Nancy B.', 5, 'Fast, reliable, and their crew was very respectful of our property.'),
((SELECT id FROM listings WHERE slug='dade-flooring-pros'), 'Alex R.', 5, 'Beautiful hardwood floors installed in just two days. Love the result!'),
((SELECT id FROM listings WHERE slug='green-thumb-landscaping'), 'Tom S.', 4, 'Great lawn service. Our yard looks amazing after their redesign.'),
((SELECT id FROM listings WHERE slug='topshield-roofing'), 'Carmen L.', 5, 'Hurricane-proof roof installed. Peace of mind for storm season.')
ON CONFLICT DO NOTHING;
