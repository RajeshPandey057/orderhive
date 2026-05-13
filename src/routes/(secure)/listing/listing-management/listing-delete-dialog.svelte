<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { softDeleteListing } from './listing.remote';

	let {
		listing,
		open = $bindable(false)
	}: {
		listing: Listing | null;
		open: boolean;
	} = $props();

	let deleting = $state(false);

	async function handleConfirm() {
		if (!listing) return;
		deleting = true;
		try {
			await softDeleteListing({ listingId: listing.id });
			open = false;
			toast.success('Listing deleted successfully');
			await invalidateAll();
		} catch {
			toast.error('Failed to delete listing. Please try again.');
		} finally {
			deleting = false;
		}
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Listing</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete the listing for
				<span class="font-semibold">{listing?.clientName ?? ''}</span>
				— {listing?.projectName ?? ''}, Unit {listing?.unitNo ?? ''}? This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={deleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="text-destructive-foreground bg-destructive hover:bg-destructive/90"
				disabled={deleting}
				onclick={handleConfirm}
			>
				{deleting ? 'Deleting...' : 'Delete'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
