<script lang="ts">
	import { goto } from '$app/navigation';
	import AddListingSheet from '$lib/components/add-listing-sheet.svelte';
	import ListingTable from '$lib/components/listing-table.svelte';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { toast } from 'svelte-sonner';
	import EditListingSheet from './edit-listing-sheet.svelte';
	import ListingDeleteDialog from './listing-delete-dialog.svelte';

	let { data } = $props();

	let editSheetOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedListing = $state<Listing | null>(null);
	let searchQuery = $state('');
	let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

	const currentUserUid = $derived(data?.user?.uid ?? '');
	const currentUserRole = $derived(data?.user?.role ?? '');
	const isAdmin = $derived(currentUserRole === 'admin' || currentUserRole === 'super-admin');
	const filters = $derived(
		data?.filters ?? {
			developerName: undefined,
			agentEmail: undefined,
			unitType: undefined
		}
	);
	const filterOptions = $derived(
		data?.filterOptions ?? {
			developers: [],
			agents: [],
			unitTypes: []
		}
	);
	const pagination = $derived(
		data?.pagination ?? {
			page: 1,
			pageSize: 20,
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

	function listingManagementPageUrl(
		page: number,
		filterOverrides: Partial<{
			developerName: string;
			agentEmail: string;
			unitType: string;
		}> = {}
	) {
		const params = new URLSearchParams();
		const q = searchQuery.trim();
		const nextFilters = {
			developerName: filters.developerName ?? 'all',
			agentEmail: filters.agentEmail ?? 'all',
			unitType: filters.unitType ?? 'all',
			...filterOverrides
		};
		if (page > 1) params.set('page', String(page));
		if (q) params.set('q', q);
		if (nextFilters.developerName && nextFilters.developerName !== 'all') {
			params.set('developer', nextFilters.developerName);
		}
		if (nextFilters.agentEmail && nextFilters.agentEmail !== 'all') {
			params.set('agent', nextFilters.agentEmail);
		}
		if (nextFilters.unitType && nextFilters.unitType !== 'all') {
			params.set('unitType', nextFilters.unitType);
		}
		const query = params.toString();
		return query ? `/listing/listing-management?${query}` : '/listing/listing-management';
	}

	function handleSearch(value: string) {
		searchQuery = value;
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(async () => {
			await goto(listingManagementPageUrl(1));
			searchDebounceTimer = undefined;
		}, 300);
	}

	function handleFilterChange(filter: 'developerName' | 'agentEmail' | 'unitType', value: string) {
		goto(listingManagementPageUrl(1, { [filter]: value }));
	}

	function canManage(listing: Listing): boolean {
		return isAdmin || listing.createdByUid === currentUserUid;
	}

	function handleEdit(listing: Listing) {
		if (!canManage(listing)) {
			toast.error('You do not have permission to edit this listing.');
			return;
		}
		selectedListing = listing;
		editSheetOpen = true;
	}

	function handleDelete(listing: Listing) {
		if (!canManage(listing)) {
			toast.error('You do not have permission to delete this listing.');
			return;
		}
		selectedListing = listing;
		deleteDialogOpen = true;
	}
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center justify-between gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<h1 class="text-2xl font-medium">Listing Management</h1>
		</div>
		<AddListingSheet
			currentUserEmail={data?.user?.email ?? ''}
			currentUserUid={data?.user?.uid ?? ''}
		/>
	</div>
</header>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	<ListingTable
		listings={data.listings ?? []}
		searchValue={searchQuery}
		{filters}
		{filterOptions}
		onSearch={handleSearch}
		onFilterChange={handleFilterChange}
		onEdit={handleEdit}
		onDelete={handleDelete}
	/>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted-foreground">
			Showing {pageStart}-{pageEnd} of {pagination.totalCount} records
		</p>
		<Pagination.Root
			count={pagination.totalCount}
			perPage={pagination.pageSize}
			page={pagination.page}
			onPageChange={(page) => goto(listingManagementPageUrl(page))}
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

{#if selectedListing}
	<EditListingSheet listing={selectedListing} bind:open={editSheetOpen} />
	<ListingDeleteDialog listing={selectedListing} bind:open={deleteDialogOpen} />
{/if}
