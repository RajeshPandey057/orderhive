<script lang="ts">
	import { listingsStore } from '$lib/stores/listings';
	import FullLogo from '$lib/svg/full-logo.svelte';
	import BathIcon from '~icons/lucide/bath';
	import BedDoubleIcon from '~icons/lucide/bed-double';
	import BookmarkIcon from '~icons/lucide/bookmark';
	import ChevronDownIcon from '~icons/lucide/chevron-down';
	import HeartIcon from '~icons/lucide/heart';
	import MapPinIcon from '~icons/lucide/map-pin';
	import Maximize2Icon from '~icons/lucide/maximize-2';
	import SaveIcon from '~icons/lucide/save';
	import SearchIcon from '~icons/lucide/search';
	import SlidersHorizontalIcon from '~icons/lucide/sliders-horizontal';

	let locationSearch = $state('');
	let propertyNameSearch = $state('');
	let propertyTypeFilter = $state('Residential');
	let bedsFilter = $state('');
	let bathsFilter = $state('');
	let showMoreFilters = $state(false);
	let priceMin = $state('');
	let priceMax = $state('');
	let areaMin = $state('');
	let savedListings = $state<Set<string>>(new Set());

	const mockListings: Listing[] = [
		{
			id: 'lst-001',
			listingType: 'portal',
			listedByEmails: ['agent@indglobal.com'],
			mediaAssets: [{ type: 'photo', fileName: 'photo1.jpg' }],
			propertyAddress: {
				buildingName: 'Siraj Tower',
				area: 'Arjan',
				city: 'Dubai',
				country: 'UAE'
			},
			clientName: 'Siraj Properties LLC',
			clientPhone: '+971501234567',
			clientEmail: 'client@example.com',
			developer: 'Arjan Developers',
			community: 'Arjan',
			project: 'Siraj Tower',
			unitNo: '1204',
			propertyType: 'apartment',
			bedroomType: '1bed',
			propertySize: 857,
			builtUpArea: 857,
			buyingPrice: 750000,
			liquidityInvested: 50000,
			sellingPrice: 920000,
			createdAt: new Date().toISOString()
		},
		{
			id: 'lst-002',
			listingType: 'portal',
			listedByEmails: ['agent@indglobal.com'],
			mediaAssets: [{ type: 'photo', fileName: 'photo2.jpg' }],
			propertyAddress: {
				buildingName: 'Bloom Heights',
				area: 'Jumeirah Village Circle',
				city: 'Dubai',
				country: 'UAE'
			},
			clientName: 'Prime Holdings',
			clientPhone: '+971509876543',
			clientEmail: 'client2@example.com',
			developer: 'Bloom Living',
			community: 'Jumeirah Village Circle',
			project: 'Bloom Heights',
			unitNo: '308',
			propertyType: 'apartment',
			bedroomType: '2bed',
			propertySize: 1150,
			builtUpArea: 1150,
			buyingPrice: 1100000,
			liquidityInvested: 80000,
			sellingPrice: 1350000,
			createdAt: new Date().toISOString()
		},
		{
			id: 'lst-003',
			listingType: 'portal',
			listedByEmails: ['agent2@indglobal.com'],
			mediaAssets: [{ type: 'photo', fileName: 'photo3.jpg' }],
			propertyAddress: {
				buildingName: 'Azizi Riviera',
				area: 'Meydan',
				city: 'Dubai',
				country: 'UAE'
			},
			clientName: 'Riviera Realty',
			clientPhone: '+971502345678',
			clientEmail: 'client3@example.com',
			developer: 'Azizi Developments',
			community: 'Meydan',
			project: 'Azizi Riviera',
			unitNo: '512',
			propertyType: 'apartment',
			bedroomType: 'studio',
			propertySize: 450,
			builtUpArea: 450,
			buyingPrice: 420000,
			liquidityInvested: 30000,
			sellingPrice: 540000,
			createdAt: new Date().toISOString()
		},
		{
			id: 'lst-004',
			listingType: 'internal',
			listedByEmails: ['agent@indglobal.com'],
			mediaAssets: [{ type: 'photo', fileName: 'photo4.jpg' }],
			propertyAddress: {
				buildingName: 'The Address Residences',
				area: 'Downtown Dubai',
				city: 'Dubai',
				country: 'UAE'
			},
			clientName: 'Downtown Developments',
			clientPhone: '+971501122334',
			clientEmail: 'client4@example.com',
			developer: 'Emaar Properties',
			community: 'Downtown Dubai',
			project: 'The Address Residences',
			unitNo: '2801',
			propertyType: 'apartment',
			bedroomType: '2bed+maid',
			propertySize: 1620,
			builtUpArea: 1620,
			buyingPrice: 3200000,
			liquidityInvested: 200000,
			sellingPrice: 3850000,
			createdAt: new Date().toISOString()
		},
		{
			id: 'lst-005',
			listingType: 'portal',
			listedByEmails: ['agent3@indglobal.com'],
			mediaAssets: [{ type: 'photo', fileName: 'photo5.jpg' }],
			propertyAddress: {
				buildingName: 'Palm Vista',
				area: 'Palm Jumeirah',
				city: 'Dubai',
				country: 'UAE'
			},
			clientName: 'Palm Properties',
			clientPhone: '+971505566778',
			clientEmail: 'client5@example.com',
			developer: 'Nakheel',
			community: 'Palm Jumeirah',
			project: 'Palm Vista',
			unitNo: 'G-04',
			propertyType: 'villa',
			bedroomType: '4bed',
			propertySize: 4200,
			builtUpArea: 4200,
			buyingPrice: 9500000,
			liquidityInvested: 500000,
			sellingPrice: 11200000,
			createdAt: new Date().toISOString()
		},
		{
			id: 'lst-006',
			listingType: 'portal',
			listedByEmails: ['agent2@indglobal.com'],
			mediaAssets: [{ type: 'photo', fileName: 'photo6.jpg' }],
			propertyAddress: {
				buildingName: 'Creek Harbour Tower',
				area: 'Dubai Creek Harbour',
				city: 'Dubai',
				country: 'UAE'
			},
			clientName: 'Creek Holdings',
			clientPhone: '+971507788990',
			clientEmail: 'client6@example.com',
			developer: 'Emaar Properties',
			community: 'Dubai Creek Harbour',
			project: 'Creek Harbour Tower',
			unitNo: '1506',
			propertyType: 'apartment',
			bedroomType: '1bed',
			propertySize: 720,
			builtUpArea: 720,
			buyingPrice: 980000,
			liquidityInvested: 60000,
			sellingPrice: 1180000,
			createdAt: new Date().toISOString()
		},
		{
			id: 'lst-007',
			listingType: 'internal',
			listedByEmails: ['agent@indglobal.com'],
			mediaAssets: [{ type: 'photo', fileName: 'photo7.jpg' }],
			propertyAddress: {
				buildingName: 'Merano Tower',
				area: 'Business Bay',
				city: 'Dubai',
				country: 'UAE'
			},
			clientName: 'Bay Investments',
			clientPhone: '+971502233445',
			clientEmail: 'client7@example.com',
			developer: 'Omniyat',
			community: 'Business Bay',
			project: 'Merano Tower',
			unitNo: '1902',
			propertyType: 'apartment',
			bedroomType: '3bed',
			propertySize: 1890,
			builtUpArea: 1890,
			buyingPrice: 2600000,
			liquidityInvested: 180000,
			sellingPrice: 3100000,
			createdAt: new Date().toISOString()
		},
		{
			id: 'lst-008',
			listingType: 'portal',
			listedByEmails: ['agent3@indglobal.com'],
			mediaAssets: [{ type: 'photo', fileName: 'photo8.jpg' }],
			propertyAddress: {
				buildingName: 'Sobha Hartland',
				area: 'Mohammed Bin Rashid City',
				city: 'Dubai',
				country: 'UAE'
			},
			clientName: 'Hartland Properties',
			clientPhone: '+971509988776',
			clientEmail: 'client8@example.com',
			developer: 'Sobha Realty',
			community: 'Mohammed Bin Rashid City',
			project: 'Sobha Hartland',
			unitNo: 'TH-12',
			propertyType: 'townhouse',
			bedroomType: '3bed+maid',
			propertySize: 2750,
			builtUpArea: 2750,
			buyingPrice: 3800000,
			liquidityInvested: 250000,
			sellingPrice: 4500000,
			createdAt: new Date().toISOString()
		}
	];

	const bedroomLabels: Record<string, string> = {
		studio: 'Studio',
		'1bed': '1',
		'2bed': '2',
		'2bed+maid': '2+M',
		'3bed': '3',
		'3bed+maid': '3+M',
		'4bed': '4',
		'5bed': '5',
		'6-7bed': '6-7',
		duplex: 'Duplex',
		penthouse: 'PH',
		'podium-townhouse': 'PT'
	};

	const propertyTypeLabels: Record<string, string> = {
		apartment: 'Apartment',
		townhouse: 'Townhouse',
		villa: 'Villa',
		commercial: 'Commercial',
		plot: 'Plot'
	};

	const listingHighlights: Record<string, string> = {
		'lst-001': 'Fully Furnished 1BR | Spacious 857 Sqft | High ROI | Prime Location in Arjan',
		'lst-002': 'Spacious 2BR | Stunning Views | Near Metro | Investor-Friendly JVC',
		'lst-003': 'Elegant Studio | Resort-Style Amenities | Canal View | Smart Investment',
		'lst-004': 'Luxury 2BR+M | Burj Khalifa View | Premium Finishing | Downtown Living',
		'lst-005': 'Private Pool Villa | Beach Access | Iconic Palm Address | 4 Bed Retreat',
		'lst-006': 'Modern 1BR | Creek & Skyline Views | Ready to Move | Waterfront Living',
		'lst-007': 'Spacious 3BR | Business Bay Views | High-End Furnishing | Prime Address',
		'lst-008': '3BR+M Townhouse | Lush Greenery | Exclusive Gated Community | Family Living'
	};

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-AE').format(price);
	}

	function getImageUrl(listing: Listing): string {
		return `https://picsum.photos/seed/${listing.id}/560/380`;
	}

	function getBedroomLabel(type?: string): string {
		if (!type) return '—';
		return bedroomLabels[type] ?? type;
	}

	function getBathroomCount(type?: string): string {
		if (!type) return '1';
		const map: Record<string, string> = {
			studio: '1',
			'1bed': '1',
			'2bed': '2',
			'2bed+maid': '2',
			'3bed': '2',
			'3bed+maid': '3',
			'4bed': '4',
			'5bed': '5',
			'6-7bed': '6',
			duplex: '3',
			penthouse: '4',
			'podium-townhouse': '3'
		};
		return map[type] ?? '1';
	}

	function toggleSave(id: string) {
		const next = new Set(savedListings);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		savedListings = next;
	}

	function slugify(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function getListingSlug(listing: Listing): string {
		return `${slugify(listing.project)}-${listing.id.toLowerCase()}`;
	}

	function getListingUrl(listing: Listing): string {
		return `/listings/${getListingSlug(listing)}`;
	}

	const allListings = $derived.by(() => {
		const map = new Map<string, Listing>();
		for (const listing of [...$listingsStore, ...mockListings]) {
			if (!map.has(listing.id)) {
				map.set(listing.id, listing);
			}
		}
		return Array.from(map.values());
	});

	const filteredListings = $derived(
		allListings.filter((l) => {
			const matchPropertyName =
				!propertyNameSearch ||
				l.project.toLowerCase().includes(propertyNameSearch.toLowerCase()) ||
				(l.propertyAddress.buildingName ?? '')
					.toLowerCase()
					.includes(propertyNameSearch.toLowerCase()) ||
				(l.developer ?? '').toLowerCase().includes(propertyNameSearch.toLowerCase());

			const matchLocation =
				!locationSearch ||
				Object.values(l.propertyAddress)
					.join(' ')
					.toLowerCase()
					.includes(locationSearch.toLowerCase()) ||
				l.project.toLowerCase().includes(locationSearch.toLowerCase()) ||
				(l.community ?? '').toLowerCase().includes(locationSearch.toLowerCase());

			const matchType =
				propertyTypeFilter === 'Residential'
					? ['apartment', 'villa', 'townhouse'].includes(l.propertyType)
					: propertyTypeFilter === 'Commercial'
						? ['commercial'].includes(l.propertyType)
						: true;

			const matchBeds =
				!bedsFilter ||
				(bedsFilter === 'studio' && l.bedroomType === 'studio') ||
				(bedsFilter === '1' && l.bedroomType === '1bed') ||
				(bedsFilter === '2' && (l.bedroomType === '2bed' || l.bedroomType === '2bed+maid')) ||
				(bedsFilter === '3' && (l.bedroomType === '3bed' || l.bedroomType === '3bed+maid')) ||
				(bedsFilter === '4+' &&
					['4bed', '5bed', '6-7bed', 'duplex', 'penthouse', 'podium-townhouse'].includes(
						l.bedroomType ?? ''
					));

			return matchPropertyName && matchLocation && matchType && matchBeds;
		})
	);
</script>

<div class="min-h-screen bg-background font-[Inter_Variable,sans-serif]">
	<!-- Header -->
	<header class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="mx-auto flex h-16 max-w-screen-2xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
			<a href="/" class="flex items-center gap-3">
				<FullLogo />
			</a>
			<div class="hidden h-6 w-px bg-border sm:block"></div>
			<span class="text-base font-semibold tracking-tight text-foreground sm:text-lg">Listings</span>
			<div class="ml-auto flex items-center gap-3">
				<span class="text-xs text-muted-foreground sm:text-sm"
					>{filteredListings.length} properties found</span
				>
			</div>
		</div>
	</header>

	<!-- Filters Bar -->
	<div class="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="mx-auto max-w-screen-2xl px-4 py-3 sm:px-6 sm:py-4">
			<div class="flex flex-col gap-3 xl:flex-row xl:items-center">
				<!-- Property name search -->
				<div class="relative min-w-0 w-full xl:max-w-sm">
					<SearchIcon
						class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						type="text"
						placeholder="Search property name"
						bind:value={propertyNameSearch}
						class="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
					/>
				</div>

				<!-- Location search -->
				<div class="relative min-w-0 w-full xl:max-w-sm">
					<MapPinIcon
						class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						type="text"
						placeholder="Enter location"
						bind:value={locationSearch}
						class="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
					/>
				</div>

				<div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:w-auto xl:items-center">
					<!-- Property type filter -->
					<div class="relative">
						<select
							bind:value={propertyTypeFilter}
							class="h-10 w-full appearance-none rounded-lg border border-input bg-background pl-4 pr-9 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 xl:w-auto"
						>
							<option value="Residential">Residential</option>
							<option value="Commercial">Commercial</option>
							<option value="All">All Types</option>
						</select>
						<ChevronDownIcon
							class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
					</div>

					<!-- Beds & Baths filter -->
					<div class="relative">
						<select
							bind:value={bedsFilter}
							class="h-10 w-full appearance-none rounded-lg border border-input bg-background pl-4 pr-9 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 xl:w-auto"
						>
							<option value="">Beds & Baths</option>
							<option value="studio">Studio</option>
							<option value="1">1 Bed</option>
							<option value="2">2 Beds</option>
							<option value="3">3 Beds</option>
							<option value="4+">4+ Beds</option>
						</select>
						<ChevronDownIcon
							class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
					</div>

					<!-- More Filters -->
					<button
						onclick={() => (showMoreFilters = !showMoreFilters)}
						class="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground xl:w-auto"
						class:bg-primary={showMoreFilters}
						class:text-primary-foreground={showMoreFilters}
						class:border-primary={showMoreFilters}
					>
						<SlidersHorizontalIcon class="h-4 w-4" />
						<span>More Filters</span>
					</button>
				</div>

				<div class="w-full xl:ml-auto xl:w-auto">
					<button
						class="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 xl:h-auto xl:w-auto xl:px-5"
					>
						<SaveIcon class="h-3.5 w-3.5" />
						Save Search
					</button>
				</div>
			</div>

			<!-- Expanded filters -->
			{#if showMoreFilters}
				<div class="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="flex flex-col gap-1">
						<label for="filter-price-min" class="text-xs font-medium text-muted-foreground"
							>Min Price (AED)</label
						>
						<input
							id="filter-price-min"
							type="number"
							placeholder="500,000"
							bind:value={priceMin}
							class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="filter-price-max" class="text-xs font-medium text-muted-foreground"
							>Max Price (AED)</label
						>
						<input
							id="filter-price-max"
							type="number"
							placeholder="5,000,000"
							bind:value={priceMax}
							class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="filter-area-min" class="text-xs font-medium text-muted-foreground"
							>Min Area (sqft)</label
						>
						<input
							id="filter-area-min"
							type="number"
							placeholder="500"
							bind:value={areaMin}
							class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
						/>
					</div>
					<button
						onclick={() => {
							propertyNameSearch = '';
							locationSearch = '';
							propertyTypeFilter = 'Residential';
							bedsFilter = '';
							bathsFilter = '';
							priceMin = '';
							priceMax = '';
							areaMin = '';
						}}
						class="h-9 rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-accent sm:self-end"
					>
						Clear all
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main content -->
	<main class="mx-auto max-w-screen-2xl px-4 py-5 sm:px-6 sm:py-6">
		{#if filteredListings.length === 0}
			<div class="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl bg-muted/40">
				<SearchIcon class="h-10 w-10 text-muted-foreground/50" />
				<p class="text-base font-medium text-muted-foreground">No listings match your filters</p>
				<button
					onclick={() => {
						propertyNameSearch = '';
						locationSearch = '';
						propertyTypeFilter = 'Residential';
						bedsFilter = '';
					}}
					class="text-sm font-medium text-teal-600 hover:underline"
				>
					Clear filters
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#each filteredListings as listing (listing.id)}
					<div
						class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md sm:flex-row"
						role="link"
						tabindex="0"
						aria-label={`View details for ${listing.project}`}
						onclick={() => (window.location.href = getListingUrl(listing))}
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								window.location.href = getListingUrl(listing);
							}
						}}
					>
						<!-- Property Image -->
						<div class="relative h-52 w-full flex-shrink-0 overflow-hidden sm:h-auto sm:w-56">
							<img
								src={getImageUrl(listing)}
								alt={listing.project}
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
								loading="lazy"
							/>

							<!-- Overlay gradient -->
							<div
								class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
							></div>

							<!-- Save / Heart button -->
							<button
								onclick={(e) => { e.stopPropagation(); toggleSave(listing.id); }}
								aria-label="Save listing"
								class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition-colors hover:bg-white"
							>
								{#if savedListings.has(listing.id)}
									<HeartIcon class="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
								{:else}
									<HeartIcon class="h-3.5 w-3.5 text-muted-foreground" />
								{/if}
							</button>
						</div>

						<!-- Property Details -->
						<div class="flex min-w-0 flex-1 flex-col justify-between p-4">
							<div class="space-y-1.5">
								<!-- Name & Address -->
								<div>
									<h3 class="text-sm font-semibold leading-tight text-foreground">
										{listing.project}
									</h3>
									<p class="mt-0.5 text-xs text-muted-foreground">
										{listing.propertyAddress.buildingName
											? `${listing.propertyAddress.buildingName}, `
											: ''}{listing.propertyAddress.area}, {listing.propertyAddress.city}
									</p>
								</div>

								<!-- Price -->
								<p class="text-lg font-bold text-foreground">
									AED {formatPrice(listing.sellingPrice)}
								</p>

								<!-- Property meta row -->
								<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<span
										class="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground"
									>
										{propertyTypeLabels[listing.propertyType]}
									</span>

									{#if listing.bedroomType !== 'studio'}
										<span class="flex items-center gap-1">
											<BedDoubleIcon class="h-3.5 w-3.5" />
											{getBedroomLabel(listing.bedroomType)}
										</span>
									{/if}

									<span class="flex items-center gap-1">
										<BathIcon class="h-3.5 w-3.5" />
										{getBathroomCount(listing.bedroomType)}
									</span>

									{#if listing.builtUpArea}
										<span class="flex items-center gap-1">
											<Maximize2Icon class="h-3.5 w-3.5" />
											Area: {listing.builtUpArea.toLocaleString()} sqft
										</span>
									{/if}
								</div>

								<!-- Highlights -->
								<p class="line-clamp-3 text-xs font-medium text-teal-600 sm:line-clamp-2">
									{listingHighlights[listing.id] ?? `${listing.developer} | ${listing.community}`}
								</p>
							</div>

							<!-- Location footer -->
							<div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
								<div class="min-w-0 flex items-center gap-1 text-xs text-muted-foreground">
									<MapPinIcon class="h-3 w-3 flex-shrink-0" />
									<span class="truncate">
										{listing.community ?? listing.propertyAddress.area}, {listing.propertyAddress
											.city}
									</span>
								</div>
								<button
									class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
									onclick={(e) => { e.stopPropagation(); toggleSave(listing.id); }}
								>
									<BookmarkIcon
										class={`h-3.5 w-3.5 ${savedListings.has(listing.id) ? 'fill-primary text-primary' : ''}`}
									/>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>
