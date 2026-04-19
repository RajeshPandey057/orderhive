<script lang="ts">
	import FullLogo from '$lib/svg/full-logo.svelte';
	import ArrowLeftIcon from '~icons/lucide/arrow-left';
	import Building2Icon from '~icons/lucide/building-2';
	import DollarSignIcon from '~icons/lucide/dollar-sign';
	import FileTextIcon from '~icons/lucide/file-text';
	import MapPinIcon from '~icons/lucide/map-pin';

	function formatPrice(value?: number): string {
		return new Intl.NumberFormat('en-AE').format(value ?? 0);
	}

	function getPlaceholderGalleryImages(listingId: string): string[] {
		return [
			`https://picsum.photos/seed/${listingId}-gallery-1/1200/800`,
			`https://picsum.photos/seed/${listingId}-gallery-2/600/400`,
			`https://picsum.photos/seed/${listingId}-gallery-3/600/400`,
			`https://picsum.photos/seed/${listingId}-gallery-4/600/400`,
			`https://picsum.photos/seed/${listingId}-gallery-5/600/400`
		];
	}

	let { data } = $props();

	const listing = $derived(data.firestoreListing as Listing | null);

	const propertyTypeLabel = $derived(
		(listing?.propertyType ?? '').charAt(0).toUpperCase() + (listing?.propertyType ?? '').slice(1)
	);

	const bedroomLabel = $derived(
		listing?.bedroomType
			? listing.bedroomType.replace('-', '/').replace('+', ' + ').replace('bed', ' Bed')
			: 'N/A'
	);

	const galleryImages = $derived(listing ? getPlaceholderGalleryImages(listing.id) : []);
</script>

<div class="min-h-screen bg-background font-[Inter_Variable,sans-serif]">
	<header class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="mx-auto flex h-16 max-w-screen-2xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
			<a href="/" class="flex items-center gap-3">
				<FullLogo />
			</a>
			<div class="hidden h-6 w-px bg-border sm:block"></div>
			<span class="text-base font-semibold tracking-tight text-foreground sm:text-lg">Listings</span
			>
		</div>
	</header>

	<main class="mx-auto max-w-screen-2xl px-4 py-5 sm:px-6 sm:py-8">
		{#if !listing}
			<div class="rounded-xl border border-border bg-card p-6 text-center">
				<h1 class="text-xl font-semibold text-foreground">Property not found</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					The listing link is invalid or this item is not available.
				</p>
			</div>
		{:else}
			<div class="space-y-6">
				<div>
					<a
						href="/listings"
						class="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
					>
						<ArrowLeftIcon class="h-4 w-4" />
						Back to Listings
					</a>
				</div>

				<section class="rounded-xl border border-border bg-card p-5 sm:p-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 class="text-2xl font-bold text-foreground sm:text-3xl">{listing.project}</h1>
							<p class="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
								<MapPinIcon class="h-4 w-4" />
								{listing.propertyAddress.buildingName ?? listing.project}, {listing.propertyAddress
									.area ??
									listing.community ??
									'Area N/A'}, {listing.propertyAddress.city ?? 'City N/A'}
							</p>
						</div>
						<p class="text-2xl font-bold text-foreground sm:text-3xl">
							AED {formatPrice(listing.sellingPrice)}
						</p>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Type</div>
							<div class="mt-1 font-semibold">{propertyTypeLabel}</div>
						</div>
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Bedrooms</div>
							<div class="mt-1 font-semibold">{bedroomLabel}</div>
						</div>
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Unit</div>
							<div class="mt-1 font-semibold">{listing.unitNo}</div>
						</div>
					</div>
				</section>

				<section class="rounded-xl border border-border bg-card p-3 sm:p-4">
					<div class="grid grid-cols-1 gap-2 md:grid-cols-12">
						<div class="overflow-hidden rounded-lg md:col-span-8">
							<img
								src={galleryImages[0]}
								alt={`${listing.project} gallery image 1`}
								class="h-64 w-full object-cover sm:h-80"
								loading="lazy"
							/>
						</div>
						<div class="grid grid-cols-2 gap-2 md:col-span-4 md:grid-cols-1">
							{#each galleryImages.slice(1) as image, index (image)}
								<div class="overflow-hidden rounded-lg">
									<img
										src={image}
										alt={`${listing.project} gallery image ${index + 2}`}
										class="h-28 w-full object-cover sm:h-23"
										loading="lazy"
									/>
								</div>
							{/each}
						</div>
					</div>
				</section>

				<section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div class="rounded-xl border border-border bg-card p-5 sm:p-6">
						<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
							<Building2Icon class="h-5 w-5" />
							Property Information
						</h2>
						<div class="space-y-3 text-sm">
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Developer</span><span
									class="text-right font-medium">{listing.developer}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Community</span><span
									class="text-right font-medium">{listing.community ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Property Size</span><span
									class="text-right font-medium">{listing.propertySize ?? 'N/A'} sqft</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Built Up Area</span><span
									class="text-right font-medium">{listing.builtUpArea ?? 'N/A'} sqft</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Plot Area</span><span
									class="text-right font-medium">{listing.plotArea ?? 'N/A'} sqft</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Gross Floor Area</span><span
									class="text-right font-medium">{listing.grossFloorArea ?? 'N/A'} sqft</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Commercial Type</span><span
									class="text-right font-medium">{listing.commercialSubType ?? 'N/A'}</span
								>
							</div>
						</div>
					</div>

					<div class="rounded-xl border border-border bg-card p-5 sm:p-6">
						<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
							<DollarSignIcon class="h-5 w-5" />
							Financial Details
						</h2>
						<div class="space-y-3 text-sm">
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Buying Price</span><span
									class="text-right font-medium">AED {formatPrice(listing.buyingPrice)}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Liquidity Invested</span><span
									class="text-right font-medium">AED {formatPrice(listing.liquidityInvested)}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Selling Price</span><span
									class="text-right font-medium">AED {formatPrice(listing.sellingPrice)}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Created At</span><span
									class="text-right font-medium"
									>{new Date(listing.createdAt).toLocaleString()}</span
								>
							</div>
						</div>
					</div>
				</section>

				<section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div class="rounded-xl border border-border bg-card p-5 sm:p-6">
						<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
							<MapPinIcon class="h-5 w-5" />
							Address Details
						</h2>
						<div class="space-y-3 text-sm">
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Address Line 1</span><span
									class="text-right font-medium"
									>{listing.propertyAddress.addressLine1 ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Address Line 2</span><span
									class="text-right font-medium"
									>{listing.propertyAddress.addressLine2 ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Building Name</span><span
									class="text-right font-medium"
									>{listing.propertyAddress.buildingName ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Street</span><span
									class="text-right font-medium">{listing.propertyAddress.street ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Area</span><span class="text-right font-medium"
									>{listing.propertyAddress.area ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">City</span><span class="text-right font-medium"
									>{listing.propertyAddress.city ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Country</span><span
									class="text-right font-medium">{listing.propertyAddress.country ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Postal Code</span><span
									class="text-right font-medium">{listing.propertyAddress.postalCode ?? 'N/A'}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Landmark</span><span
									class="text-right font-medium">{listing.propertyAddress.landmark ?? 'N/A'}</span
								>
							</div>
						</div>
					</div>

					<div class="space-y-6">
						<div class="rounded-xl border border-border bg-card p-5 sm:p-6">
							<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
								<FileTextIcon class="h-5 w-5" />
								Documents & Media
							</h2>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between gap-4">
									<span class="text-muted-foreground">Title Deed / Qood</span><span
										class="text-right font-medium">{listing.titleDeedFileName ?? 'N/A'}</span
									>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-muted-foreground">Passport</span><span
										class="text-right font-medium">{listing.passportFileName ?? 'N/A'}</span
									>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-muted-foreground">Emirates ID</span><span
										class="text-right font-medium">{listing.emiratesIdFileName ?? 'N/A'}</span
									>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-muted-foreground">Media Assets</span><span
										class="text-right font-medium">{listing.mediaAssets?.length ?? 0}</span
									>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		{/if}
	</main>
</div>
