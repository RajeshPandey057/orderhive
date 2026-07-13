<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { isActiveSale } from '$lib/sales';
	import AddSaleSheet from '@/components/add-sale-sheet.svelte';
	import SalesTable from '@/components/sales-table.svelte';
	import { firekitCollection } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';
	import AlertCircle from '~icons/lucide/alert-circle';
	import PlusRound from '~icons/lucide/circle-fading-plus';
	import Download from '~icons/lucide/download';
	import Loader from '~icons/svg-spinners/blocks-shuffle-3';

	let { data } = $props();
	// Fetch sales data from Firestore
	const salesCollection = firekitCollection<Sale>('sales');
	const activeSales = $derived(salesCollection.data?.filter(isActiveSale) ?? []);

	let downloadDialogOpen = $state(false);
	let downloadStartDate = $state('');
	let downloadEndDate = $state('');
	let downloadingListing = $state(false);
	const canDownloadListing = $derived(
		!!downloadStartDate && !!downloadEndDate && downloadStartDate <= downloadEndDate
	);

	async function downloadListing() {
		if (!canDownloadListing || downloadingListing) return;

		downloadingListing = true;

		try {
			const res = await fetch(
				`/api/admin/sales-export?start=${encodeURIComponent(downloadStartDate)}&end=${encodeURIComponent(downloadEndDate)}`
			);

			if (!res.ok) {
				toast.error('Failed to download listing');
				return;
			}

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `sales-listing-${downloadStartDate}-to-${downloadEndDate}.csv`;
			a.click();
			URL.revokeObjectURL(url);

			downloadDialogOpen = false;
			toast.success('Listing downloaded successfully');
		} catch {
			toast.error('Failed to download listing');
		} finally {
			downloadingListing = false;
		}
	}
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center justify-between gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<h1 class="text-2xl font-medium">Sales Tracker</h1>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" class="gap-2" onclick={() => (downloadDialogOpen = true)}>
				<Download class="h-4 w-4" />
				Download Listing
			</Button>
			<AddSaleSheet userRole={data?.user?.role} />
		</div>
	</div>
</header>

<Dialog.Root bind:open={downloadDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-semibold">Download Listing</Dialog.Title>
			<Dialog.Description>Select a sale date range to export active sales.</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-5 py-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="download-start-date">From</Field.Label>
					<Input
						id="download-start-date"
						type="date"
						bind:value={downloadStartDate}
						max={downloadEndDate || undefined}
						disabled={downloadingListing}
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="download-end-date">To</Field.Label>
					<Input
						id="download-end-date"
						type="date"
						bind:value={downloadEndDate}
						min={downloadStartDate || undefined}
						disabled={downloadingListing}
					/>
				</Field.Field>
			</div>

			{#if downloadStartDate && downloadEndDate && downloadStartDate > downloadEndDate}
				<Field.Error>From date must be on or before To date.</Field.Error>
			{/if}
		</div>

		<Dialog.Footer>
			<Button
				type="button"
				variant="outline"
				onclick={() => (downloadDialogOpen = false)}
				disabled={downloadingListing}
			>
				Cancel
			</Button>
			<Button
				type="button"
				class="gap-2"
				onclick={downloadListing}
				disabled={!canDownloadListing || downloadingListing}
			>
				{#if downloadingListing}
					<Loader class="h-4 w-4 animate-spin" />
				{:else}
					<Download class="h-4 w-4" />
				{/if}
				{downloadingListing ? 'Downloading...' : 'Download'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	{#if salesCollection.loading}
		<div class="flex min-h-100 items-center justify-center rounded-xl bg-muted/50">
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<Loader class="h-8 w-8 animate-spin" />
					</Empty.Media>
					<Empty.Title>Loading Sales Data</Empty.Title>
					<Empty.Description>Please wait while we fetch your sales information...</Empty.Description
					>
				</Empty.Header>
			</Empty.Root>
		</div>
	{:else if salesCollection.error}
		<div class="flex min-h-100 items-center justify-center rounded-xl bg-muted/50">
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<AlertCircle class="h-8 w-8 text-destructive" />
					</Empty.Media>
					<Empty.Title>Error Loading Sales</Empty.Title>
					<Empty.Description>{salesCollection.error.message}</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		</div>
	{:else if activeSales.length === 0}
		<div class="flex min-h-100 items-center justify-center rounded-xl bg-muted/50">
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<PlusRound class="h-8 w-8" />
					</Empty.Media>
					<Empty.Title>No Sales Found</Empty.Title>
					<Empty.Description
						>Add your first sale to get started with tracking your deals</Empty.Description
					>
				</Empty.Header>
				<Empty.Content>
					<AddSaleSheet userRole={data?.user?.role} />
				</Empty.Content>
			</Empty.Root>
		</div>
	{:else}
		<SalesTable data={activeSales} role={data?.user?.role} />
	{/if}
</div>
