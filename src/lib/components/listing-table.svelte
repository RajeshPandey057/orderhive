<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import Pencil from '~icons/lucide/pencil';
	import Search from '~icons/lucide/search';
	import Trash2 from '~icons/lucide/trash-2';

	let {
		listings = [],
		searchValue = '',
		filters = {},
		filterOptions,
		onSearch,
		onFilterChange,
		onEdit,
		onDelete
	}: {
		listings: Listing[];
		searchValue?: string;
		filters?: {
			developerName?: string;
			agentEmail?: string;
			unitType?: string;
		};
		filterOptions?: {
			developers?: string[];
			agents?: string[];
			unitTypes?: string[];
		};
		onSearch?: (value: string) => void;
		onFilterChange?: (filter: 'developerName' | 'agentEmail' | 'unitType', value: string) => void;
		onEdit?: (listing: Listing) => void;
		onDelete?: (listing: Listing) => void;
	} = $props();

	const hasActions = $derived(!!onEdit || !!onDelete);

	const selectedDeveloper = $derived(filters.developerName ?? 'all');
	const selectedAgent = $derived(filters.agentEmail ?? 'all');
	const selectedUnitType = $derived(filters.unitType ?? 'all');
	const developerOptions = $derived([
		'all',
		...new Set(
			(filterOptions?.developers?.length
				? filterOptions.developers
				: listings.map((listing) => listing.developerName)
			).filter(Boolean)
		)
	]);
	const agentOptions = $derived([
		'all',
		...new Set(
			(filterOptions?.agents?.length
				? filterOptions.agents
				: listings.map((listing) => listing.agentEmail?.trim())
			).filter(Boolean)
		)
	]);
	const unitTypeOptions = $derived([
		'all',
		...new Set(
			(filterOptions?.unitTypes?.length
				? filterOptions.unitTypes
				: listings.map((listing) => listing.unitType)
			).filter(Boolean)
		)
	]);

	const filteredListings = $derived.by(() => {
		return listings.filter((listing) => {
			const matchesDeveloper =
				selectedDeveloper === 'all' || listing.developerName?.trim() === selectedDeveloper;
			const matchesAgent = selectedAgent === 'all' || listing.agentEmail?.trim() === selectedAgent;
			const matchesUnitType =
				selectedUnitType === 'all' || listing.unitType?.trim() === selectedUnitType;

			return matchesDeveloper && matchesAgent && matchesUnitType;
		});
	});

	function formatMoney(value: number) {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value || 0);
	}

	function getBedroomOrSize(listing: Listing) {
		if (listing.bedrooms) return listing.bedrooms;
		if (listing.plotSize) return `Plot: ${listing.plotSize.toLocaleString()} sqft`;
		return `${listing.unitArea.toLocaleString()} sqft`;
	}

	function handleRowOpen(listing: Listing) {
		onEdit?.(listing);
	}

	function getSelectValue(event: Event) {
		return (event.target as HTMLSelectElement).value;
	}
</script>

<div class="overflow-x-auto pb-1">
	<div class="flex min-w-max items-center gap-3">
		<div class="relative min-w-60 flex-1">
			<Search class="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
			<Input
				class="pl-8"
				placeholder="Search listings..."
				value={searchValue}
				oninput={(event) => onSearch?.((event.target as HTMLInputElement).value)}
			/>
		</div>
		<select
			class="h-9 min-w-42.5 rounded-md border border-input bg-background px-3 text-sm"
			value={selectedDeveloper}
			onchange={(event) => onFilterChange?.('developerName', getSelectValue(event))}
		>
			{#each developerOptions as option (option)}
				<option value={option}>
					{option === 'all' ? 'All Developers' : option}
				</option>
			{/each}
		</select>
		<select
			class="h-9 min-w-42.5 rounded-md border border-input bg-background px-3 text-sm"
			value={selectedAgent}
			onchange={(event) => onFilterChange?.('agentEmail', getSelectValue(event))}
		>
			{#each agentOptions as option (option)}
				<option value={option}>
					{option === 'all' ? 'All Agents' : option}
				</option>
			{/each}
		</select>
		<select
			class="h-9 min-w-42.5 rounded-md border border-input bg-background px-3 text-sm"
			value={selectedUnitType}
			onchange={(event) => onFilterChange?.('unitType', getSelectValue(event))}
		>
			{#each unitTypeOptions as option (option)}
				<option value={option}>
					{option === 'all' ? 'All Unit Types' : option}
				</option>
			{/each}
		</select>
	</div>
</div>

<div class="rounded-md border bg-card">
	<Table.Root class="min-w-300">
		<Table.Header>
			<Table.Row class="border-b bg-gray-200/40">
				<Table.Head>Listing ID</Table.Head>
				<Table.Head>Property</Table.Head>
				<Table.Head>Project Type</Table.Head>
				<Table.Head>Bedrooms / Size</Table.Head>
				<Table.Head class="text-right">Original Price</Table.Head>
				<Table.Head class="text-right">Expected Price</Table.Head>
				<Table.Head class="text-right">DLD/DXB Price</Table.Head>
				<Table.Head>Created By</Table.Head>
				<Table.Head>Listing Type</Table.Head>
				{#if hasActions}
					<Table.Head class="w-28 text-right">Actions</Table.Head>
				{/if}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if filteredListings.length === 0}
				<Table.Row>
					<Table.Cell colspan={hasActions ? 10 : 9} class="py-12">
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
					<Table.Row
						class={onEdit ? 'cursor-pointer border-b last:border-b-0' : 'border-b last:border-b-0'}
						onclick={() => handleRowOpen(listing)}
					>
						<Table.Cell class="font-mono text-xs font-medium">{listing.id}</Table.Cell>
						<Table.Cell>
							<div class="font-medium">{listing.projectName}</div>
							<div class="text-sm text-muted-foreground">{listing.developerName}</div>
						</Table.Cell>
						<Table.Cell>{listing.projectType}</Table.Cell>
						<Table.Cell>{getBedroomOrSize(listing)}</Table.Cell>
						<Table.Cell class="text-right">
							{listing.purchasePrice == null ? '-' : formatMoney(listing.purchasePrice)}
						</Table.Cell>
						<Table.Cell class="text-right">{formatMoney(listing.price)}</Table.Cell>
						<Table.Cell class="text-right">
							{listing.originalPrice == null ? '-' : formatMoney(listing.originalPrice)}
						</Table.Cell>
						<Table.Cell class="max-w-48 truncate text-sm text-muted-foreground">
							{listing.createdByEmail || '-'}
						</Table.Cell>
						<Table.Cell>
							<span
								class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {listing.listingType ===
								'portal'
									? 'bg-blue-100 text-blue-700'
									: 'bg-gray-100 text-gray-700'}"
							>
								{listing.listingType === 'portal' ? 'Portal' : 'Internal'}
							</span>
						</Table.Cell>
						{#if hasActions}
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1">
									{#if onEdit}
										<button
											type="button"
											class="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
											onclick={(event) => {
												event.stopPropagation();
												onEdit!(listing);
											}}
											aria-label="Edit listing"
										>
											<Pencil class="h-4 w-4" />
										</button>
									{/if}
									{#if onDelete}
										<button
											type="button"
											class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
											onclick={(event) => {
												event.stopPropagation();
												onDelete!(listing);
											}}
											aria-label="Delete listing"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									{/if}
								</div>
							</Table.Cell>
						{/if}
					</Table.Row>
				{/each}
			{/if}
		</Table.Body>
	</Table.Root>
</div>
