<script lang="ts">
	import AddListingSheet from '$lib/components/add-listing-sheet.svelte';
	import ListingTable from '$lib/components/listing-table.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { toast } from 'svelte-sonner';
	import EditListingSheet from './edit-listing-sheet.svelte';
	import ListingDeleteDialog from './listing-delete-dialog.svelte';

	let { data } = $props();

	let editSheetOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedListing = $state<Listing | null>(null);

	const currentUserUid = $derived(data?.user?.uid ?? '');
	const currentUserRole = $derived(data?.user?.role ?? '');
	const isAdmin = $derived(currentUserRole === 'admin' || currentUserRole === 'super-admin');

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
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">Listing Management</h1>
		</div>
		<AddListingSheet
			currentUserEmail={data?.user?.email ?? ''}
			currentUserUid={data?.user?.uid ?? ''}
		/>
	</div>
</header>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	<ListingTable listings={data.listings ?? []} onEdit={handleEdit} onDelete={handleDelete} />
</div>

{#if selectedListing}
	<EditListingSheet listing={selectedListing} bind:open={editSheetOpen} />
	<ListingDeleteDialog listing={selectedListing} bind:open={deleteDialogOpen} />
{/if}
