<script lang="ts">
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { SvelteSet } from 'svelte/reactivity';
	import BathIcon from '~icons/lucide/bath';
	import BedDoubleIcon from '~icons/lucide/bed-double';
	import BookmarkIcon from '~icons/lucide/bookmark';
	import Building2Icon from '~icons/lucide/building-2';
	import ChevronDownIcon from '~icons/lucide/chevron-down';
	import HeartIcon from '~icons/lucide/heart';
	import MapPinIcon from '~icons/lucide/map-pin';
	import Maximize2Icon from '~icons/lucide/maximize-2';
	import SearchIcon from '~icons/lucide/search';
	import SlidersHorizontalIcon from '~icons/lucide/sliders-horizontal';

	let { data } = $props();

	let searchQuery = $state('');
	let propertyTypeFilter = $state('');
	let listingTypeFilter = $state('');
	let bedsFilter = $state('');
	let showMoreFilters = $state(false);
	let priceMin = $state('');
	let priceMax = $state('');
	let areaMin = $state('');
	let savedListings = $state<Set<string>>(new Set());

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
		const next = new SvelteSet(savedListings);
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

	function getListingUrl(listing: Listing): string {
		return `/listings/${slugify(listing.project)}-${listing.id.toLowerCase()}`;
	}

	const allListings = $derived((data.listings ?? []) as Listing[]);

	const filteredListings = $derived(
		allListings.filter((l) => {
			const q = searchQuery.trim().toLowerCase();
			const matchSearch =
				!q ||
				l.clientName.toLowerCase().includes(q) ||
				l.project.toLowerCase().includes(q) ||
				l.developer.toLowerCase().includes(q) ||
				l.unitNo.toLowerCase().includes(q) ||
				(l.community ?? '').toLowerCase().includes(q) ||
				Object.values(l.propertyAddress).join(' ').toLowerCase().includes(q) ||
				(l.listedByEmails ?? []).some((e) => e.toLowerCase().includes(q));

			const matchType = !propertyTypeFilter || l.propertyType === propertyTypeFilter;

			const matchListingType = !listingTypeFilter || l.listingType === listingTypeFilter;

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

			const matchPrice =
				(!priceMin || l.sellingPrice >= Number(priceMin)) &&
				(!priceMax || l.sellingPrice <= Number(priceMax));

			const matchArea =
				!areaMin || (l.builtUpArea ?? l.propertySize ?? l.plotArea ?? 0) >= Number(areaMin);

			return matchSearch && matchType && matchListingType && matchBeds && matchPrice && matchArea;
		})
	);

	function clearFilters() {
		searchQuery = '';
		propertyTypeFilter = '';
		listingTypeFilter = '';
		bedsFilter = '';
		priceMin = '';
		priceMax = '';
		areaMin = '';
	}
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">View Listings</h1>
		</div>
		<span class="mr-4 ml-auto text-sm text-muted-foreground">
			{filteredListings.length} / {allListings.length} listings
		</span>
	</div>
</header>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	<!-- Filters bar -->
	<div class="rounded-xl border border-border bg-card p-4">
		<div class="flex flex-col gap-3 xl:flex-row xl:items-center">
			<!-- Search -->
			<div class="relative min-w-0 flex-1">
				<SearchIcon
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="text"
					placeholder="Search by client, project, developer, unit, agent…"
					bind:value={searchQuery}
					class="h-10 w-full rounded-lg border border-input bg-background pr-4 pl-9 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 focus:outline-none"
				/>
			</div>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:flex xl:items-center">
				<!-- Property type -->
				<div class="relative">
					<select
						bind:value={propertyTypeFilter}
						class="h-10 w-full appearance-none rounded-lg border border-input bg-background pr-9 pl-4 text-sm focus:border-ring focus:ring-2 focus:ring-ring/20 focus:outline-none xl:w-auto"
					>
						<option value="">All Types</option>
						<option value="apartment">Apartment</option>
						<option value="townhouse">Townhouse</option>
						<option value="villa">Villa</option>
						<option value="commercial">Commercial</option>
						<option value="plot">Plot</option>
					</select>
					<ChevronDownIcon
						class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
				</div>

				<!-- Listing type -->
				<div class="relative">
					<select
						bind:value={listingTypeFilter}
						class="h-10 w-full appearance-none rounded-lg border border-input bg-background pr-9 pl-4 text-sm focus:border-ring focus:ring-2 focus:ring-ring/20 focus:outline-none xl:w-auto"
					>
						<option value="">All Listings</option>
						<option value="internal">Internal</option>
						<option value="portal">Portal</option>
					</select>
					<ChevronDownIcon
						class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
				</div>

				<!-- Beds -->
				<div class="relative">
					<select
						bind:value={bedsFilter}
						class="h-10 w-full appearance-none rounded-lg border border-input bg-background pr-9 pl-4 text-sm focus:border-ring focus:ring-2 focus:ring-ring/20 focus:outline-none xl:w-auto"
					>
						<option value="">Beds & Baths</option>
						<option value="studio">Studio</option>
						<option value="1">1 Bed</option>
						<option value="2">2 Beds</option>
						<option value="3">3 Beds</option>
						<option value="4+">4+ Beds</option>
					</select>
					<ChevronDownIcon
						class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
				</div>

				<!-- More filters toggle -->
				<button
					onclick={() => (showMoreFilters = !showMoreFilters)}
					class="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm transition-colors hover:bg-accent xl:w-auto"
					class:bg-primary={showMoreFilters}
					class:text-primary-foreground={showMoreFilters}
					class:border-primary={showMoreFilters}
				>
					<SlidersHorizontalIcon class="h-4 w-4" />
					<span>More Filters</span>
				</button>
			</div>
		</div>

		{#if showMoreFilters}
			<div class="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
				<div class="flex flex-col gap-1">
					<label for="vl-price-min" class="text-xs font-medium text-muted-foreground"
						>Min Price (AED)</label
					>
					<input
						id="vl-price-min"
						type="number"
						placeholder="500,000"
						bind:value={priceMin}
						class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring/20 focus:outline-none"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="vl-price-max" class="text-xs font-medium text-muted-foreground"
						>Max Price (AED)</label
					>
					<input
						id="vl-price-max"
						type="number"
						placeholder="5,000,000"
						bind:value={priceMax}
						class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring/20 focus:outline-none"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="vl-area-min" class="text-xs font-medium text-muted-foreground"
						>Min Area (sqft)</label
					>
					<input
						id="vl-area-min"
						type="number"
						placeholder="500"
						bind:value={areaMin}
						class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring/20 focus:outline-none"
					/>
				</div>
			</div>
		{/if}
	</div>

	<!-- Listings grid -->
	{#if filteredListings.length === 0}
		<div class="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl bg-muted/40">
			<Building2Icon class="h-10 w-10 text-muted-foreground/50" />
			<p class="text-base font-medium text-muted-foreground">
				{allListings.length === 0 ? 'No listings yet' : 'No listings match your filters'}
			</p>
			{#if allListings.length > 0}
				<button onclick={clearFilters} class="text-sm font-medium text-teal-600 hover:underline">
					Clear filters
				</button>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{#each filteredListings as listing (listing.id)}
				{@const isPortal = listing.listingType === 'portal'}
				<div
					class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md sm:flex-row"
					role="link"
					tabindex="0"
					aria-label={`View details for ${listing.project}`}
					onclick={() => {
						if (isPortal) window.location.href = getListingUrl(listing);
					}}
					onkeydown={(e) => {
						if (isPortal && (e.key === 'Enter' || e.key === ' ')) {
							e.preventDefault();
							window.location.href = getListingUrl(listing);
						}
					}}
				>
					<!-- Image -->
					<div class="relative h-52 w-full shrink-0 overflow-hidden sm:h-auto sm:w-52">
						<img
							src={getImageUrl(listing)}
							alt={listing.project}
							class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							loading="lazy"
						/>
						<div
							class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent"
						></div>
						<!-- Listing type badge -->
						<span
							class="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold {isPortal
								? 'bg-blue-500 text-white'
								: 'bg-gray-700 text-white'}"
						>
							{isPortal ? 'Portal' : 'Internal'}
						</span>
						<!-- Save button -->
						<button
							onclick={(e) => {
								e.stopPropagation();
								toggleSave(listing.id);
							}}
							aria-label="Save listing"
							class="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
						>
							{#if savedListings.has(listing.id)}
								<HeartIcon class="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
							{:else}
								<HeartIcon class="h-3.5 w-3.5 text-muted-foreground" />
							{/if}
						</button>
					</div>

					<!-- Details -->
					<div class="flex min-w-0 flex-1 flex-col justify-between p-4">
						<div class="space-y-1.5">
							<div>
								<h3 class="text-sm leading-tight font-semibold text-foreground">
									{listing.project}
								</h3>
								<p class="mt-0.5 text-xs text-muted-foreground">
									{listing.propertyAddress.buildingName
										? `${listing.propertyAddress.buildingName}, `
										: ''}{listing.propertyAddress.area
										? `${listing.propertyAddress.area}, `
										: ''}{listing.propertyAddress.city ?? ''}
								</p>
							</div>
							<p class="text-lg font-bold text-foreground">
								AED {formatPrice(listing.sellingPrice)}
							</p>
							<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<span
									class="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground"
								>
									{propertyTypeLabels[listing.propertyType]}
								</span>
								{#if listing.bedroomType && listing.bedroomType !== 'studio'}
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
										{listing.builtUpArea.toLocaleString()} sqft
									</span>
								{/if}
							</div>
							<p class="line-clamp-2 text-xs font-medium text-teal-600">
								{listing.developer}{listing.community ? ` | ${listing.community}` : ''}
							</p>
							<p class="text-xs text-muted-foreground">
								Client: {listing.clientName}
							</p>
						</div>
						<div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
							<div class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
								<MapPinIcon class="h-3 w-3 shrink-0" />
								<span class="truncate">
									{listing.community ?? listing.propertyAddress.area ?? ''}{listing.propertyAddress
										.city
										? `, ${listing.propertyAddress.city}`
										: ''}
								</span>
							</div>
							{#if isPortal}
								<a
									href={getListingUrl(listing)}
									onclick={(e) => e.stopPropagation()}
									class="text-xs font-medium text-teal-600 hover:underline"
								>
									View on portal →
								</a>
							{:else}
								<button
									onclick={(e) => {
										e.stopPropagation();
										toggleSave(listing.id);
									}}
								>
									<BookmarkIcon
										class="h-3.5 w-3.5 {savedListings.has(listing.id)
											? 'fill-primary text-primary'
											: 'text-muted-foreground'}"
									/>
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
