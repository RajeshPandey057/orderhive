<script lang="ts">
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ArrowLeftIcon from '~icons/lucide/arrow-left';
	import Building2Icon from '~icons/lucide/building-2';
	import DollarSignIcon from '~icons/lucide/dollar-sign';
	import ExternalLinkIcon from '~icons/lucide/external-link';
	import FileTextIcon from '~icons/lucide/file-text';
	import MapPinIcon from '~icons/lucide/map-pin';
	import UserIcon from '~icons/lucide/user';

	let { data } = $props();

	const listing = $derived(data.listing as Listing | null);

	function formatPrice(value?: number): string {
		return new Intl.NumberFormat('en-AE').format(value ?? 0);
	}

	function slugify(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	const portalUrl = $derived(
		listing ? `/listings/${slugify(listing.project)}-${listing.id.toLowerCase()}` : '#'
	);

	const propertyTypeLabel = $derived(
		(listing?.propertyType ?? '').charAt(0).toUpperCase() + (listing?.propertyType ?? '').slice(1)
	);

	const bedroomLabel = $derived(
		listing?.bedroomType
			? listing.bedroomType.replace('-', '/').replace('+', ' + ').replace('bed', ' Bed')
			: 'N/A'
	);

	function getPlaceholderGalleryImages(listingId: string): string[] {
		return [
			`https://picsum.photos/seed/${listingId}-gallery-1/1200/800`,
			`https://picsum.photos/seed/${listingId}-gallery-2/600/400`,
			`https://picsum.photos/seed/${listingId}-gallery-3/600/400`,
			`https://picsum.photos/seed/${listingId}-gallery-4/600/400`,
			`https://picsum.photos/seed/${listingId}-gallery-5/600/400`
		];
	}

	const galleryImages = $derived(listing ? getPlaceholderGalleryImages(listing.id) : []);
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<a
				href="/listing/view-listings"
				class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeftIcon class="h-4 w-4" />
				View Listings
			</a>
			{#if listing}
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<h1 class="text-lg font-medium">{listing.project}</h1>
			{/if}
		</div>
		{#if listing?.listingType === 'portal'}
			<a
				href={portalUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="mr-4 ml-auto flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
			>
				<ExternalLinkIcon class="h-3.5 w-3.5" />
				View on Portal
			</a>
		{/if}
	</div>
</header>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	{#if !listing}
		<div class="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl bg-muted/40">
			<Building2Icon class="h-10 w-10 text-muted-foreground/50" />
			<p class="text-base font-medium text-muted-foreground">Listing not found</p>
			<a href="/listing/view-listings" class="text-sm font-medium text-teal-600 hover:underline">
				← Back to View Listings
			</a>
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Overview -->
			<section class="rounded-xl border border-border bg-card p-5">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<div class="flex items-center gap-2">
							<h2 class="text-xl font-bold text-foreground">{listing.project}</h2>
							<span
								class="rounded-full px-2 py-0.5 text-xs font-semibold {listing.listingType ===
								'portal'
									? 'bg-blue-100 text-blue-700'
									: 'bg-gray-100 text-gray-700'}"
							>
								{listing.listingType === 'portal' ? 'Portal' : 'Internal'}
							</span>
						</div>
						<p class="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
							<MapPinIcon class="h-3.5 w-3.5" />
							{listing.propertyAddress.buildingName
								? `${listing.propertyAddress.buildingName}, `
								: ''}{listing.propertyAddress.area
								? `${listing.propertyAddress.area}, `
								: ''}{listing.propertyAddress.city ?? ''}
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							ID: <span class="font-mono text-xs">{listing.id}</span>
						</p>
					</div>
					<p class="text-2xl font-bold text-foreground">
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

			<!-- Gallery -->
			<section class="rounded-xl border border-border bg-card p-3">
				<div class="grid grid-cols-1 gap-2 md:grid-cols-12">
					<div class="overflow-hidden rounded-lg md:col-span-8">
						<img
							src={galleryImages[0]}
							alt={`${listing.project} main image`}
							class="h-56 w-full object-cover sm:h-72"
							loading="lazy"
						/>
					</div>
					<div class="grid grid-cols-2 gap-2 md:col-span-4 md:grid-cols-1">
						{#each galleryImages.slice(1) as image, index (image)}
							<div class="overflow-hidden rounded-lg">
								<img
									src={image}
									alt={`${listing.project} image ${index + 2}`}
									class="h-24 w-full object-cover sm:h-[calc((72*4px+24px)/4)]"
									loading="lazy"
								/>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<!-- Client Details -->
				<section class="rounded-xl border border-border bg-card p-5">
					<h3 class="mb-4 flex items-center gap-2 text-base font-semibold">
						<UserIcon class="h-4 w-4" />
						Client Details
					</h3>
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

				<!-- Property Information -->
				<section class="rounded-xl border border-border bg-card p-5">
					<h3 class="mb-4 flex items-center gap-2 text-base font-semibold">
						<Building2Icon class="h-4 w-4" />
						Property Information
					</h3>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between gap-4">
							<span class="text-muted-foreground">Developer</span>
							<span class="font-medium">{listing.developer}</span>
						</div>
						<div class="flex justify-between gap-4">
							<span class="text-muted-foreground">Community</span>
							<span class="font-medium">{listing.community ?? 'N/A'}</span>
						</div>
						{#if listing.propertySize}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Property Size</span>
								<span class="font-medium">{listing.propertySize} sqft</span>
							</div>
						{/if}
						{#if listing.builtUpArea}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Built Up Area</span>
								<span class="font-medium">{listing.builtUpArea} sqft</span>
							</div>
						{/if}
						{#if listing.plotArea}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Plot Area</span>
								<span class="font-medium">{listing.plotArea} sqft</span>
							</div>
						{/if}
						{#if listing.grossFloorArea}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Gross Floor Area</span>
								<span class="font-medium">{listing.grossFloorArea} sqft</span>
							</div>
						{/if}
						{#if listing.commercialSubType}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Commercial Type</span>
								<span class="font-medium capitalize">{listing.commercialSubType}</span>
							</div>
						{/if}
					</div>
				</section>

				<!-- Financial Details -->
				<section class="rounded-xl border border-border bg-card p-5">
					<h3 class="mb-4 flex items-center gap-2 text-base font-semibold">
						<DollarSignIcon class="h-4 w-4" />
						Financial Details
					</h3>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between gap-4">
							<span class="text-muted-foreground">Buying Price</span>
							<span class="font-medium">AED {formatPrice(listing.buyingPrice)}</span>
						</div>
						<div class="flex justify-between gap-4">
							<span class="text-muted-foreground">Liquidity Invested</span>
							<span class="font-medium">AED {formatPrice(listing.liquidityInvested)}</span>
						</div>
						<div class="flex justify-between gap-4">
							<span class="text-muted-foreground">Selling Price</span>
							<span class="font-semibold text-foreground"
								>AED {formatPrice(listing.sellingPrice)}</span
							>
						</div>
					</div>
				</section>

				<!-- Address Details -->
				<section class="rounded-xl border border-border bg-card p-5">
					<h3 class="mb-4 flex items-center gap-2 text-base font-semibold">
						<MapPinIcon class="h-4 w-4" />
						Address Details
					</h3>
					<div class="space-y-3 text-sm">
						{#if listing.propertyAddress.buildingName}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Building</span>
								<span class="font-medium">{listing.propertyAddress.buildingName}</span>
							</div>
						{/if}
						{#if listing.propertyAddress.addressLine1}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Address</span>
								<span class="text-right font-medium"
									>{listing.propertyAddress.addressLine1}{listing.propertyAddress.addressLine2
										? `, ${listing.propertyAddress.addressLine2}`
										: ''}</span
								>
							</div>
						{/if}
						{#if listing.propertyAddress.street}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Street</span>
								<span class="font-medium">{listing.propertyAddress.street}</span>
							</div>
						{/if}
						{#if listing.propertyAddress.area}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Area</span>
								<span class="font-medium">{listing.propertyAddress.area}</span>
							</div>
						{/if}
						{#if listing.propertyAddress.city}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">City</span>
								<span class="font-medium">{listing.propertyAddress.city}</span>
							</div>
						{/if}
						{#if listing.propertyAddress.country}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Country</span>
								<span class="font-medium">{listing.propertyAddress.country}</span>
							</div>
						{/if}
						{#if listing.propertyAddress.landmark}
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">Landmark</span>
								<span class="font-medium">{listing.propertyAddress.landmark}</span>
							</div>
						{/if}
						{#if !listing.propertyAddress.city && !listing.propertyAddress.area}
							<p class="text-muted-foreground">No address details provided.</p>
						{/if}
					</div>
				</section>
			</div>

			<!-- Documents & Media -->
			<section class="rounded-xl border border-border bg-card p-5">
				<h3 class="mb-4 flex items-center gap-2 text-base font-semibold">
					<FileTextIcon class="h-4 w-4" />
					Documents & Media
				</h3>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-lg bg-muted/50 p-3 text-sm">
						<div class="text-muted-foreground">Title Deed / Qood</div>
						<div class="mt-1 truncate font-medium">
							{listing.titleDeedFileName ?? 'Not uploaded'}
						</div>
					</div>
					<div class="rounded-lg bg-muted/50 p-3 text-sm">
						<div class="text-muted-foreground">Passport</div>
						<div class="mt-1 truncate font-medium">
							{listing.passportFileName ?? 'Not uploaded'}
						</div>
					</div>
					<div class="rounded-lg bg-muted/50 p-3 text-sm">
						<div class="text-muted-foreground">Emirates ID</div>
						<div class="mt-1 truncate font-medium">
							{listing.emiratesIdFileName ?? 'Not uploaded'}
						</div>
					</div>
					<div class="rounded-lg bg-muted/50 p-3 text-sm">
						<div class="text-muted-foreground">Media Assets</div>
						<div class="mt-1 font-medium">{listing.mediaAssets?.length ?? 0} file(s)</div>
					</div>
				</div>
			</section>
		</div>
	{/if}
</div>
