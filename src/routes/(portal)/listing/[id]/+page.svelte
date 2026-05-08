<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '~icons/lucide/arrow-left';
	import Building2Icon from '~icons/lucide/building-2';
	import DollarSignIcon from '~icons/lucide/dollar-sign';
	import FileTextIcon from '~icons/lucide/file-text';
	import MapPinIcon from '~icons/lucide/map-pin';

	let { data } = $props();

	const listing = $derived(data.listing as Listing | null);

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

	const propertyTypeLabel = $derived(
		(listing?.propertyType ?? '').charAt(0).toUpperCase() + (listing?.propertyType ?? '').slice(1)
	);

	const bedroomLabel = $derived(
		listing?.bedroomType
			? listing.bedroomType.replace('-', '/').replace('+', ' + ').replace('bed', ' Bed')
			: 'N/A'
	);

	const uploadedImageUrls = $derived((data.media?.images ?? []) as string[]);
	const uploadedVideoUrls = $derived((data.media?.videos ?? []) as string[]);
	const galleryImages = $derived(
		listing
			? uploadedImageUrls.length > 0
				? uploadedImageUrls
				: getPlaceholderGalleryImages(listing.id)
			: []
	);
</script>

<div class="min-h-screen bg-background">
	<header class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="mx-auto flex h-16 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
			<a
				href={resolve('/listing/view-listings')}
				class="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
			>
				<ArrowLeftIcon class="h-4 w-4" />
				Back to View Listings
			</a>
			{#if listing}
				<div class="h-6 w-px bg-border"></div>
				<h1 class="text-base font-semibold text-foreground sm:text-lg">{listing.project}</h1>
			{/if}
		</div>
	</header>

	<main class="mx-auto max-w-screen-2xl px-4 py-5 sm:px-6 sm:py-8">
		{#if !listing}
			<div class="rounded-xl border border-border bg-card p-6 text-center">
				<Building2Icon class="mx-auto h-10 w-10 text-muted-foreground/50" />
				<h2 class="mt-3 text-xl font-semibold text-foreground">Listing not found</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					The listing link is invalid or this item is not available.
				</p>
			</div>
		{:else}
			<div class="space-y-6">
				<section class="rounded-xl border border-border bg-card p-5 sm:p-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<div class="flex items-center gap-2">
								<h2 class="text-2xl font-bold text-foreground sm:text-3xl">{listing.project}</h2>
								<span
									class="rounded-full px-2 py-0.5 text-xs font-semibold {listing.listingType ===
									'portal'
										? 'bg-blue-100 text-blue-700'
										: 'bg-gray-100 text-gray-700'}"
								>
									{listing.listingType === 'portal' ? 'Portal' : 'Internal'}
								</span>
							</div>
							<p class="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
								<MapPinIcon class="h-4 w-4" />
								{listing.propertyAddress.buildingName ?? listing.project}, {listing.propertyAddress
									.area ??
									listing.community ??
									'Area N/A'}, {listing.propertyAddress.city ?? 'City N/A'}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								ID: <span class="font-mono">{listing.id}</span>
							</p>
						</div>
						<p class="text-2xl font-bold text-foreground sm:text-3xl">
							AED {formatPrice(listing.sellingPrice)}
						</p>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Type</div>
							<div class="mt-1 font-semibold">{propertyTypeLabel}</div>
						</div>
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Bedrooms</div>
							<div class="mt-1 font-semibold">{bedroomLabel}</div>
						</div>
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Unit No.</div>
							<div class="mt-1 font-semibold">{listing.unitNo}</div>
						</div>
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Listed At</div>
							<div class="mt-1 text-xs font-semibold">
								{new Date(listing.createdAt).toLocaleDateString()}
							</div>
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

				{#if uploadedVideoUrls.length > 0}
					<section class="rounded-xl border border-border bg-card p-3 sm:p-4">
						<h2 class="mb-3 text-base font-semibold text-foreground">Videos</h2>
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							{#each uploadedVideoUrls as videoUrl (videoUrl)}
								<video src={videoUrl} class="w-full rounded-lg border border-border" controls>
									<track kind="captions" />
								</video>
							{/each}
						</div>
					</section>
				{/if}

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!--
					<section class="rounded-xl border border-border bg-card p-5 sm:p-6">
						<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
							<UserIcon class="h-5 w-5" />
							Client Details
						</h2>
						<div class="space-y-3 text-sm">
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Name</span>
								<span class="font-medium">{listing.clientName}</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Phone</span>
								<span class="font-medium">{listing.clientPhone}</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Email</span>
								<span class="font-medium">{listing.clientEmail}</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Listed By</span>
								<span class="text-right font-medium">
									{(listing.listedByEmails ?? []).join(', ') || 'N/A'}
								</span>
							</div>
						</div>
					</section>
					-->

					<section class="rounded-xl border border-border bg-card p-5 sm:p-6">
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
					</section>

					<section class="rounded-xl border border-border bg-card p-5 sm:p-6">
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
					</section>

					<section class="rounded-xl border border-border bg-card p-5 sm:p-6">
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
					</section>
				</div>

				<section class="rounded-xl border border-border bg-card p-5 sm:p-6">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
						<FileTextIcon class="h-5 w-5" />
						Documents & Media
					</h2>
					<div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Title Deed / Qood</div>
							<div class="mt-1 truncate font-medium">
								{listing.titleDeedFileName ?? 'Not uploaded'}
							</div>
						</div>
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Passport</div>
							<div class="mt-1 truncate font-medium">
								{listing.passportFileName ?? 'Not uploaded'}
							</div>
						</div>
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Emirates ID</div>
							<div class="mt-1 truncate font-medium">
								{listing.emiratesIdFileName ?? 'Not uploaded'}
							</div>
						</div>
						<div class="rounded-lg bg-muted/50 p-3">
							<div class="text-muted-foreground">Media Assets</div>
							<div class="mt-1 font-medium">{listing.mediaAssets?.length ?? 0} file(s)</div>
						</div>
					</div>
				</section>
			</div>
		{/if}
	</main>
</div>
