export const LISTING_CITIES = [
	'Dubai',
	'Abu Dhabi',
	'Sharjah',
	'Ajman',
	'Umm Al Quwain',
	'Ras Al Khaimah',
	'Fujairah',
	'Other'
];

export const DUBAI_COMMUNITIES = [
	'Al Barari',
	'Al Furjan',
	'Al Karama',
	'Al Khawaneej',
	'Al Mamzar',
	'Al Mizhar',
	'Al Nahda',
	'Al Quoz',
	'Al Qusais',
	'Al Twar',
	'Al Warqaa',
	'Al Wasl',
	'Arabian Ranches',
	'Arabian Ranches 2',
	'Arabian Ranches 3',
	'Arjan',
	'Athlon',
	'Bluewaters Island',
	'Bur Dubai',
	'Business Bay',
	'City Walk',
	'DAMAC Hills',
	'DAMAC Hills 2',
	'Deira',
	'DIFC',
	'Discovery Gardens',
	'District One',
	'Downtown Dubai',
	'Dubai Canal',
	'Dubai Creek Harbour',
	'Dubai Design District',
	'Dubai Festival City',
	'Dubai Harbour',
	'Dubai Healthcare City',
	'Dubai Hills Estate',
	'Dubai Internet City',
	'Dubai Investment Park',
	'Dubai Islands',
	'Dubai Knowledge Park',
	'Dubai Land Residence Complex',
	'Dubai Marina',
	'Dubai Maritime City',
	'Dubai Media City',
	'Dubai Production City',
	'Dubai Science Park',
	'Dubai Silicon Oasis',
	'Dubai South',
	'Dubai Sports City',
	'Dubai Studio City',
	'Emirates Hills',
	'Expo City Dubai',
	'Grand Polo Club and Resort',
	'Haven by Aldar',
	'Hor Al Anz',
	'International City',
	'Jebel Ali',
	'Jumeirah',
	'Jumeirah Beach Residence',
	'Jumeirah Golf Estates',
	'Jumeirah Islands',
	'Jumeirah Lake Towers',
	'Jumeirah Village Circle',
	'Jumeirah Village Triangle',
	'Liwan',
	'Madinat Jumeirah Living',
	'Majan',
	'Meydan',
	'Mina Rashid',
	'Mirdif',
	'Mohammed Bin Rashid City',
	'Motor City',
	'Mudon',
	'Muhaisnah',
	'Nad Al Sheba',
	'Oud Metha',
	'Palm Jebel Ali',
	'Palm Jumeirah',
	'Port Saeed',
	'Ras Al Khor',
	'Remraam',
	'Satwa',
	'Sobha Hartland',
	'Sobha Hartland 2',
	'The Acres',
	'The Greens',
	'The Lakes',
	'The Meadows',
	'The Oasis',
	'The Springs',
	'The Sustainable City',
	'The Valley',
	'The Views',
	'Tilal Al Ghaf',
	'Town Square',
	'Umm Suqeim',
	'Victory Heights',
	'Villanova',
	'Warsan',
	'Others'
];

export const LISTING_DEVELOPERS = [
	'Private Developer',
	'Aark Developers',
	'Acube Developments',
	'AG Properties',
	'AHS Properties',
	'Ajmal Makan',
	'Al Habtoor Group',
	'Aldar Properties',
	'Alef Group',
	'Amwaj Development',
	'Aqua Properties',
	'Arada Developments',
	'Azizi Developments',
	'Binghatti Developers',
	'DAMAC Properties',
	'Danube Properties',
	'Deyaar Development',
	'Dubai Properties',
	'Ellington Properties',
	'Emaar',
	'Emaar Properties',
	'Empire Developments',
	'HMB Homes',
	'London Gate',
	'MAG Property Development',
	'Majid Al Futtaim Properties',
	'Meraas',
	'Nakheel',
	'Sobha Realty',
	'Taraf Holding',
	'Tiger Properties',
	'Vision Developments'
];

export const UNIT_TYPES = [
	'Apartment',
	'Studio',
	'Villa',
	'Townhouse',
	'Mansion',
	'Commercial',
	'Retail',
	'Others'
];

export const BEDROOM_OPTIONS = ['Studio', '1 Bed', '2 Bed', '3 Bed', '4 Bed', '5 Bed', '6 Bed', '7 Bed'];

export const PAYMENT_PLANS = [
	'100%',
	'10% - 90%',
	'20% - 80%',
	'30% - 70%',
	'40% - 60%',
	'50% - 50%',
	'60% - 40%',
	'70% - 30%',
	'80% - 20%',
	'90% - 10%',
	'Others'
];

export const HANDOVER_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'];
export const HANDOVER_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export type SelectOption = { value: string; label: string };

const slugifyOptionValue = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const uniqueOptions = (options: SelectOption[]) => {
	const seen = new Set<string>();
	return options.filter((option) => {
		if (seen.has(option.value)) return false;
		seen.add(option.value);
		return true;
	});
};

const toSlugOptions = (labels: string[]): SelectOption[] =>
	labels.map((label) => ({ value: slugifyOptionValue(label), label }));

export const SALE_TYPE_OPTIONS: SelectOption[] = [
	{ value: 'off-plan', label: 'Off Plan' },
	{ value: 'secondary', label: 'Secondary' }
];

const BASE_SALE_DEVELOPER_OPTIONS: SelectOption[] = [
	{ value: 'al-wasl', label: 'Al Wasl' },
	{ value: 'aldar', label: 'Aldar' },
	{ value: 'alef', label: 'Alef' },
	{ value: 'arada', label: 'Arada' },
	{ value: 'ayat', label: 'Ayat' },
	{ value: 'azizi', label: 'Azizi' },
	{ value: 'binghatti', label: 'Binghatti' },
	{ value: 'damac', label: 'Damac' },
	{ value: 'danube', label: 'Danube' },
	{ value: 'deyaar', label: 'Deyaar' },
	{ value: 'dgm-vision', label: 'Dgm Vision' },
	{ value: 'dubai-properties', label: 'Dubai Properties' },
	{ value: 'dubai-south', label: 'Dubai South' },
	{ value: 'dvm-properties', label: 'DVM Properties' },
	{ value: 'ellington', label: 'Ellington' },
	{ value: 'emaar', label: 'Emaar' },
	{ value: 'expo', label: 'Expo' },
	{ value: 'london-gate', label: 'London Gate' },
	{ value: 'majid-al-futtaim', label: 'Majid Al Futtaim' },
	{ value: 'meraas', label: 'Meraas' },
	{ value: 'refine', label: 'Refine' },
	{ value: 'reportage', label: 'Reportage' },
	{ value: 'siroya', label: 'Siroya' },
	{ value: 'sobha', label: 'Sobha' },
	{ value: 'stella', label: 'Stella' },
	{ value: 'townx', label: 'TownX' },
	{ value: 'union-properties', label: 'Union Properties' },
	{ value: 'urban', label: 'Urban' },
	{ value: 'vision', label: 'Vision' },
	{ value: 'zaya', label: 'Zaya' }
];

const BASE_SALE_COMMUNITY_OPTIONS: SelectOption[] = [
	{ value: 'arabian-ranches', label: 'Arabian Ranches' },
	{ value: 'business-bay', label: 'Business Bay' },
	{ value: 'creek-harbour', label: 'Creek Harbour' },
	{ value: 'damac-hills', label: 'DAMAC Hills' },
	{ value: 'dubai-creek-island', label: 'Dubai Creek Island' },
	{ value: 'dubai-hills-estate', label: 'Dubai Hills Estate' },
	{ value: 'dubai-marina', label: 'Dubai Marina' },
	{ value: 'dubai-south', label: 'Dubai South' },
	{ value: 'downtown-dubai', label: 'Downtown Dubai' },
	{ value: 'emirates-hills', label: 'Emirates Hills' },
	{ value: 'jbr', label: 'JBR (Jumeirah Beach Residence)' },
	{ value: 'jlt', label: 'JLT (Jumeirah Lake Towers)' },
	{ value: 'jvc', label: 'JVC (Jumeirah Village Circle)' },
	{ value: 'meydan', label: 'Meydan' },
	{ value: 'mirdif', label: 'Mirdif' },
	{ value: 'palm-jumeirah', label: 'Palm Jumeirah' },
	{ value: 'silicon-oasis', label: 'Silicon Oasis' },
	{ value: 'sports-city', label: 'Sports City' },
	{ value: 'tilal-al-ghaf', label: 'Tilal Al Ghaf' },
	{ value: 'town-square', label: 'Town Square' }
];

export const SALE_DEVELOPER_OPTIONS: SelectOption[] = uniqueOptions([
	...BASE_SALE_DEVELOPER_OPTIONS,
	...toSlugOptions(LISTING_DEVELOPERS)
]).sort((a, b) => a.label.localeCompare(b.label));

export const SALE_COMMUNITY_OPTIONS: SelectOption[] = uniqueOptions([
	...BASE_SALE_COMMUNITY_OPTIONS,
	...toSlugOptions(DUBAI_COMMUNITIES.filter((community) => community !== 'Others'))
]).sort((a, b) => a.label.localeCompare(b.label));

export const PROPERTY_TYPE_OPTIONS: SelectOption[] = [
	{ value: 'apartment', label: 'Apartment' },
	{ value: 'townhouse', label: 'Townhouse' },
	{ value: 'villa', label: 'Villa' },
	{ value: 'commercial', label: 'Commercial' },
	{ value: 'plot', label: 'Plot' }
];

export const APARTMENT_BEDROOM_OPTIONS: SelectOption[] = [
	{ value: 'studio', label: 'Studio' },
	{ value: '1bed', label: '1 Bed' },
	{ value: '2bed', label: '2 Bed' },
	{ value: '2bed+maid', label: '2 Bed + Maid' },
	{ value: '3bed', label: '3 Bed' },
	{ value: '3bed+maid', label: '3 Bed + Maid' },
	{ value: '4bed', label: '4 Bed' },
	{ value: 'duplex', label: 'Duplex' },
	{ value: 'penthouse', label: 'Penthouse' },
	{ value: 'podium-townhouse', label: 'Podium Townhouse' }
];

export const TOWNHOUSE_VILLA_BEDROOM_OPTIONS: SelectOption[] = [
	{ value: '2bed', label: '2 Bed' },
	{ value: '3bed', label: '3 Bed' },
	{ value: '4bed', label: '4 Bed' },
	{ value: '5bed', label: '5 Bed' },
	{ value: '6-7bed', label: '6/7 Bed' }
];

export const COMMERCIAL_SUB_TYPE_OPTIONS: SelectOption[] = [
	{ value: 'office', label: 'Office Space' },
	{ value: 'warehouse', label: 'Warehouse' }
];
