<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		BEDROOM_OPTIONS,
		DUBAI_COMMUNITIES,
		HANDOVER_QUARTERS,
		HANDOVER_YEARS,
		LISTING_CITIES,
		LISTING_DEVELOPERS,
		UNIT_TYPES
	} from '$lib/listing-options';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import BedDoubleIcon from '~icons/lucide/bed-double';
	import Building2Icon from '~icons/lucide/building-2';
	import ChevronDownIcon from '~icons/lucide/chevron-down';
	import MapPinIcon from '~icons/lucide/map-pin';
	import Maximize2Icon from '~icons/lucide/maximize-2';
	import SearchIcon from '~icons/lucide/search';

	let { data } = $props();

	let developerFilter = $state('');
	let projectFilter = $state('');
	let cityFilter = $state('');
	let communityFilter = $state('');
	let handoverFilter = $state('');
	let projectTypeFilter = $state('');
	let unitTypeFilter = $state('');
	let bedsFilter = $state('');
	let priceMin = $state('');
	let priceMax = $state('');
	let distressFilter = $state('');
	let sortFilter = $state('new');
	let searchQuery = $state('');
	let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let initializedFromUrl = $state(false);

	const pagination = $derived(
		data?.pagination ?? {
			page: 1,
			pageSize: 15,
			hasNextPage: false,
			totalCount: 0,
			totalPages: 1,
			search: ''
		}
	);
	const pageStart = $derived(
		pagination.totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
	);
	const pageEnd = $derived(Math.min(pagination.page * pagination.pageSize, pagination.totalCount));

	$effect(() => {
		if (searchDebounceTimer) return;
		const serverSearch = pagination.search ?? '';
		if (searchQuery !== serverSearch) searchQuery = serverSearch;
	});

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-AE').format(price);
	}

	function getImageUrl(listing: Listing): string {
		const firstPhoto = listing.mediaAssets?.find((a) => a.type === 'photo' && a.url);
		return firstPhoto?.url ?? `https://picsum.photos/seed/${listing.id}/560/380`;
	}

	function slugify(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function getDetailUrl(listing: Listing): string {
		return `/listing/${listing.id.toLowerCase()}`;
	}

	function getPortalUrl(listing: Listing): string {
		return resolve(`/listings/${slugify(listing.projectName)}-${listing.id.toLowerCase()}`);
	}

	const allListings = $derived((data.listings ?? []) as Listing[]);
	const projectOptions = $derived(
		[...new Set(allListings.map((listing) => listing.projectName).filter(Boolean))].sort()
	);
	const handoverOptions = $derived(
		[
			...new Set(
				allListings
					.map((listing) =>
						listing.handoverYear && listing.handoverQuarter
							? `${listing.handoverYear}-${listing.handoverQuarter}`
							: ''
					)
					.filter(Boolean)
			)
		].sort()
	);

	function getDistressType(listing: Listing): 'market' | 'original' | 'normal' {
		const salePrice = listing.price;
		const dldPrice = listing.originalPrice ?? 0;
		const originalPurchase = listing.purchasePrice ?? 0;
		if (dldPrice > 0 && salePrice < dldPrice) return 'market';
		if (originalPurchase > 0 && salePrice < originalPurchase) return 'original';
		return 'normal';
	}

	function getDistressLabel(type: 'market' | 'original' | 'normal') {
		if (type === 'market') return 'Below Market';
		if (type === 'original') return 'Below Original Price';
		return 'Normal Listing';
	}

	const filteredListings = $derived(
		allListings
			.filter((l) => {
				const salePrice = l.price;
				const location = l.location;
				const handover =
					l.handoverYear && l.handoverQuarter ? `${l.handoverYear}-${l.handoverQuarter}` : '';
				const matchDeveloper = !developerFilter || l.developerName === developerFilter;
				const matchProject = !projectFilter || l.projectName === projectFilter;
				const matchCity = !cityFilter || l.city === cityFilter;
				const matchCommunity = !communityFilter || location === communityFilter;
				const matchHandover = !handoverFilter || handover === handoverFilter;
				const matchProjectType = !projectTypeFilter || l.projectType === projectTypeFilter;
				const matchUnitType = !unitTypeFilter || l.unitType === unitTypeFilter;

				const matchBeds =
					!bedsFilter || l.bedrooms === bedsFilter || l.bedrooms === bedsFilter.replace(' Bed', '');

				const matchPrice =
					(!priceMin || salePrice >= Number(priceMin)) &&
					(!priceMax || salePrice <= Number(priceMax));

				const matchDistress = !distressFilter || getDistressType(l) === distressFilter;

				return (
					matchDeveloper &&
					matchProject &&
					matchCity &&
					matchCommunity &&
					matchHandover &&
					matchProjectType &&
					matchUnitType &&
					matchBeds &&
					matchPrice &&
					matchDistress
				);
			})
			.sort((a, b) => {
				if (sortFilter === 'old')
					return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				if (sortFilter === 'price-asc') return a.price - b.price;
				if (sortFilter === 'price-desc') return b.price - a.price;
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			})
	);

	function clearFilters() {
		developerFilter = '';
		projectFilter = '';
		cityFilter = '';
		communityFilter = '';
		handoverFilter = '';
		projectTypeFilter = '';
		unitTypeFilter = '';
		bedsFilter = '';
		priceMin = '';
		priceMax = '';
		distressFilter = '';
		sortFilter = 'new';
	}

	function viewListingsPageUrl(page: number) {
		const params = new URLSearchParams(browser ? window.location.search : '');
		const q = searchQuery.trim();
		if (page > 1) {
			params.set('page', String(page));
		} else {
			params.delete('page');
		}
		if (q) {
			params.set('q', q);
		} else {
			params.delete('q');
		}
		const query = params.toString();
		return query ? `/listing/view-listings?${query}` : '/listing/view-listings';
	}

	function handleListingSearch(value: string) {
		searchQuery = value;
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(async () => {
			await goto(viewListingsPageUrl(1));
			searchDebounceTimer = undefined;
		}, 300);
	}

	$effect(() => {
		if (!browser || initializedFromUrl) return;
		const params = new URLSearchParams(window.location.search);
		searchQuery = params.get('q') ?? '';
		developerFilter = params.get('developer') ?? '';
		projectFilter = params.get('project') ?? '';
		cityFilter = params.get('city') ?? '';
		communityFilter = params.get('community') ?? '';
		handoverFilter = params.get('handover') ?? '';
		priceMin = params.get('minPrice') ?? '';
		priceMax = params.get('maxPrice') ?? '';
		projectTypeFilter = params.get('projectType') ?? '';
		unitTypeFilter = params.get('unitType') ?? '';
		bedsFilter = params.get('beds') ?? '';
		distressFilter = params.get('distress') ?? '';
		sortFilter = params.get('sort') ?? 'new';
		initializedFromUrl = true;
	});

	$effect(() => {
		if (!browser || !initializedFromUrl) return;
		const params = new URLSearchParams();
		if (pagination.page > 1) params.set('page', String(pagination.page));
		if (searchQuery) params.set('q', searchQuery);
		if (developerFilter) params.set('developer', developerFilter);
		if (projectFilter) params.set('project', projectFilter);
		if (cityFilter) params.set('city', cityFilter);
		if (communityFilter) params.set('community', communityFilter);
		if (handoverFilter) params.set('handover', handoverFilter);
		if (priceMin) params.set('minPrice', priceMin);
		if (priceMax) params.set('maxPrice', priceMax);
		if (projectTypeFilter) params.set('projectType', projectTypeFilter);
		if (unitTypeFilter) params.set('unitType', unitTypeFilter);
		if (bedsFilter) params.set('beds', bedsFilter);
		if (distressFilter) params.set('distress', distressFilter);
		if (sortFilter !== 'new') params.set('sort', sortFilter);
		const query = params.toString();
		window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
	});
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
			{filteredListings.length} / {allListings.length} listings on page {pagination.page}
		</span>
	</div>
</header>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	<!-- Filters bar -->
	<div class="rounded-xl border border-border bg-card p-4">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
			<div class="relative">
				<SearchIcon
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="search"
					placeholder="Search listings..."
					value={searchQuery}
					oninput={(event) => handleListingSearch((event.target as HTMLInputElement).value)}
					class="h-10 w-full rounded-lg border border-input bg-background px-3 pl-9 text-sm"
				/>
			</div>
			<select
				bind:value={developerFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">All Developers</option>
				{#each LISTING_DEVELOPERS as option (option)}
					<option>{option}</option>
				{/each}
			</select>
			<select
				bind:value={projectFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">All Projects</option>
				{#each projectOptions as option (option)}
					<option>{option}</option>
				{/each}
			</select>
			<select
				bind:value={cityFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">All Cities</option>
				{#each LISTING_CITIES as option (option)}
					<option>{option}</option>
				{/each}
			</select>
			<select
				bind:value={communityFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">All Communities</option>
				{#each DUBAI_COMMUNITIES.filter((option) => option !== 'Others') as option (option)}
					<option>{option}</option>
				{/each}
			</select>
			<select
				bind:value={handoverFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">Any Handover</option>
				{#each handoverOptions.length ? handoverOptions : HANDOVER_YEARS.flatMap( (year) => HANDOVER_QUARTERS.map((quarter) => `${year}-${quarter}`) ) as option (option)}
					<option>{option}</option>
				{/each}
			</select>
			<input
				type="number"
				placeholder="Min Price (AED)"
				bind:value={priceMin}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			/>
			<input
				type="number"
				placeholder="Max Price (AED)"
				bind:value={priceMax}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			/>
			<select
				bind:value={projectTypeFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">All Types</option>
				<option>Off-Plan Property</option>
				<option>Ready Property</option>
			</select>
			<select
				bind:value={unitTypeFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">All Unit Types</option>
				{#each UNIT_TYPES.filter((option) => option !== 'Others') as option (option)}
					<option>{option}</option>
				{/each}
			</select>
			<select
				bind:value={bedsFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">Any Bedrooms</option>
				{#each BEDROOM_OPTIONS as option (option)}
					<option>{option}</option>
				{/each}
			</select>
			<select
				bind:value={distressFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="">All Listings</option>
				<option value="market">Below Market</option>
				<option value="original">Below Original Price</option>
				<option value="normal">Normal Listing</option>
			</select>
			<select
				bind:value={sortFilter}
				class="h-10 rounded-lg border border-input bg-background px-3 text-sm"
			>
				<option value="new">Recently Added</option>
				<option value="old">Oldest First</option>
				<option value="price-asc">Price: Low to High</option>
				<option value="price-desc">Price: High to Low</option>
			</select>
		</div>
		<div class="mt-3 flex justify-end">
			<button
				onclick={clearFilters}
				class="h-9 rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-accent"
			>
				Clear
			</button>
		</div>
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
					aria-label={`View details for ${listing.projectName}`}
					onclick={() => (window.location.href = getDetailUrl(listing))}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							window.location.href = getDetailUrl(listing);
						}
					}}
				>
					<!-- Image -->
					<div class="relative h-52 w-full shrink-0 overflow-hidden sm:h-auto sm:w-52">
						<img
							src={getImageUrl(listing)}
							alt={listing.projectName}
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
					</div>

					<!-- Details -->
					<div class="flex min-w-0 flex-1 flex-col justify-between p-4">
						<div class="space-y-1.5">
							<div>
								<h3 class="text-sm leading-tight font-semibold text-foreground">
									{listing.projectName}
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
								AED {formatPrice(listing.price)}
							</p>
							{#if listing.originalPrice != null}
								<p class="text-xs text-muted-foreground">
									DLD/DXB AED {formatPrice(listing.originalPrice)}
								</p>
							{/if}
							<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<span class="font-mono text-[11px]">{listing.id}</span>
								<span
									class="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground"
								>
									{listing.unitType}
								</span>
								{#if listing.bedrooms}
									<span class="flex items-center gap-1">
										<BedDoubleIcon class="h-3.5 w-3.5" />
										{listing.bedrooms}
									</span>
								{/if}
								<span class="flex items-center gap-1">
									<Maximize2Icon class="h-3.5 w-3.5" />
									{listing.unitArea.toLocaleString()} sqft
								</span>
							</div>
							<p class="line-clamp-2 text-xs font-medium text-teal-600">
								{listing.developerName}{listing.location ? ` | ${listing.location}` : ''}
							</p>
						</div>
						<div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
							<div class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
								<MapPinIcon class="h-3 w-3 shrink-0" />
								<span class="truncate">
									{listing.location}{listing.city ? `, ${listing.city}` : ''}
								</span>
							</div>
							{#if isPortal}
								<a
									href={getPortalUrl(listing)}
									onclick={(e) => e.stopPropagation()}
									class="text-xs font-medium text-teal-600 hover:underline"
								>
									View on portal →
								</a>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted-foreground">
			Showing {pageStart}-{pageEnd} of {pagination.totalCount} records
		</p>
		<Pagination.Root
			count={pagination.totalCount}
			perPage={pagination.pageSize}
			page={pagination.page}
			onPageChange={(page) => goto(viewListingsPageUrl(page))}
			class="mx-0 w-auto justify-end"
		>
			{#snippet children({ pages, currentPage })}
				<Pagination.Content class="gap-2">
					<Pagination.Item>
						<Pagination.Previous class="text-base text-[#222626] disabled:text-[#8A908E]" />
					</Pagination.Item>
					{#each pages as page (page.key)}
						{#if page.type === 'ellipsis'}
							<Pagination.Item>
								<Pagination.Ellipsis class="text-[#222626]" />
							</Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link
									{page}
									isActive={currentPage === page.value}
									class={currentPage === page.value
										? 'h-10 w-10 rounded-xl border-[#E7D8C8] bg-[#FBF7F1] text-base text-[#222626] shadow-sm'
										: 'h-10 w-10 text-base text-[#222626] hover:bg-[#FBF9F8]'}
								>
									{page.value}
								</Pagination.Link>
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item>
						<Pagination.Next class="text-base text-[#222626] disabled:text-[#8A908E]" />
					</Pagination.Item>
				</Pagination.Content>
			{/snippet}
		</Pagination.Root>
	</div>
</div>
