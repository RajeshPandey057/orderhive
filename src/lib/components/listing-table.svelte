<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { listingsStore } from '$lib/stores/listings';
	import * as Table from '$lib/components/ui/table/index.js';
	import Search from '~icons/lucide/search';

	const listings = $derived($listingsStore);
	let searchQuery = $state('');
	let selectedDeveloper = $state('all');
	let selectedAgent = $state('all');
	let selectedPropertyType = $state('all');

	const developerOptions = $derived(
		['all', ...new Set(listings.map((listing) => listing.developer).filter(Boolean))]
	);
	const agentOptions = $derived(
		[
			'all',
			...new Set(
				listings
					.flatMap((listing) => listing.listedByEmails ?? [])
					.map((email) => email.trim())
					.filter(Boolean)
			)
		]
	);
	const propertyTypeOptions = $derived([
		'all',
		...new Set(listings.map((listing) => listing.propertyType))
	]);

	const filteredListings = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();

		return listings.filter((listing) => {
			const matchesSearch =
				!query ||
				listing.clientName.toLowerCase().includes(query) ||
				listing.project.toLowerCase().includes(query) ||
				listing.developer.toLowerCase().includes(query) ||
				listing.unitNo.toLowerCase().includes(query) ||
				(listing.listedByEmails ?? []).some((email) => email.toLowerCase().includes(query));

			const matchesDeveloper =
				selectedDeveloper === 'all' || listing.developer === selectedDeveloper;
			const matchesAgent =
				selectedAgent === 'all' || (listing.listedByEmails ?? []).includes(selectedAgent);
			const matchesPropertyType =
				selectedPropertyType === 'all' || listing.propertyType === selectedPropertyType;

			return matchesSearch && matchesDeveloper && matchesAgent && matchesPropertyType;
		});
	});

	function formatMoney(value: number) {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value || 0);
	}

	function getBedroomOrSize(listing: Listing) {
		if (listing.propertyType === 'apartment' || listing.propertyType === 'townhouse' || listing.propertyType === 'villa') {
			return listing.bedroomType ? listing.bedroomType.replace('-', '/').replace('+', ' + ') : '-';
		}
		if (listing.propertyType === 'commercial') {
			if (listing.commercialSubType === 'warehouse') {
				return `Size: ${listing.propertySize ?? '-'} | GFA: ${listing.grossFloorArea ?? '-'}`;
			}
			return `Size: ${listing.propertySize ?? '-'}`;
		}
		if (listing.propertyType === 'plot') {
			return `Plot: ${listing.plotArea ?? '-'}`;
		}
		return '-';
	}

	function toTitleCase(value: string) {
		return value
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}
</script>

<div class="flex flex-wrap items-center gap-3">
	<div class="relative min-w-[240px] flex-1">
		<Search class="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
		<Input
			class="pl-8"
			placeholder="Search listings..."
			bind:value={searchQuery}
		/>
	</div>
	<select
		class="h-9 min-w-[170px] rounded-md border border-input bg-background px-3 text-sm"
		bind:value={selectedDeveloper}
	>
		{#each developerOptions as option}
			<option value={option}>
				{option === 'all' ? 'All Developers' : option}
			</option>
		{/each}
	</select>
	<select
		class="h-9 min-w-[170px] rounded-md border border-input bg-background px-3 text-sm"
		bind:value={selectedAgent}
	>
		{#each agentOptions as option}
			<option value={option}>
				{option === 'all' ? 'All Agents' : option}
			</option>
		{/each}
	</select>
	<select
		class="h-9 min-w-[170px] rounded-md border border-input bg-background px-3 text-sm"
		bind:value={selectedPropertyType}
	>
		{#each propertyTypeOptions as option}
			<option value={option}>
				{option === 'all' ? 'All Property Types' : toTitleCase(option)}
			</option>
		{/each}
	</select>
</div>

<div class="rounded-md border bg-card">
	<Table.Root>
		<Table.Header>
			<Table.Row class="border-b bg-gray-200/40">
				<Table.Head>Client Name</Table.Head>
				<Table.Head>Property</Table.Head>
				<Table.Head>Property Type</Table.Head>
				<Table.Head>Bedrooms / Size</Table.Head>
				<Table.Head class="text-right">Buying Price</Table.Head>
				<Table.Head class="text-right">Selling Price</Table.Head>
				<Table.Head>Listing Type</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if filteredListings.length === 0}
				<Table.Row>
					<Table.Cell colspan={7} class="py-12">
						<Empty.Root>
							<Empty.Header>
								<Empty.Media variant="icon">
									<Search class="h-8 w-8" />
								</Empty.Media>
								<Empty.Title>No Listings Found</Empty.Title>
								<Empty.Description>
									{#if listings.length === 0}
										Add your first property to start managing listings.
									{:else}
										No listings match the selected search and filters.
									{/if}
								</Empty.Description>
							</Empty.Header>
						</Empty.Root>
					</Table.Cell>
				</Table.Row>
			{:else}
				{#each filteredListings as listing (listing.id)}
					<Table.Row class="border-b last:border-b-0">
						<Table.Cell class="font-medium">{listing.clientName}</Table.Cell>
						<Table.Cell>
							<div class="font-medium">{listing.project}</div>
							<div class="text-sm text-muted-foreground">{listing.developer}</div>
						</Table.Cell>
						<Table.Cell>{toTitleCase(listing.propertyType)}</Table.Cell>
						<Table.Cell>{getBedroomOrSize(listing)}</Table.Cell>
						<Table.Cell class="text-right">{formatMoney(listing.buyingPrice)}</Table.Cell>
						<Table.Cell class="text-right">{formatMoney(listing.sellingPrice)}</Table.Cell>
						<Table.Cell>
							<span
								class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {listing.listingType === 'portal'
									? 'bg-blue-100 text-blue-700'
									: 'bg-gray-100 text-gray-700'}"
							>
								{listing.listingType === 'portal' ? 'Portal' : 'Internal'}
							</span>
						</Table.Cell>
					</Table.Row>
				{/each}
			{/if}
		</Table.Body>
	</Table.Root>
</div>
