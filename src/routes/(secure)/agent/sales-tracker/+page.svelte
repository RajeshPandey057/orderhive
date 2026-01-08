<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AddSaleSheet from '@/components/add-sale-sheet.svelte';
	import SalesTable from '@/components/sales-table.svelte';
	import { firekitCollection } from 'svelte-firekit';
	import AlertCircle from '~icons/lucide/alert-circle';
	import PlusRound from '~icons/lucide/circle-fading-plus';
	import Loader from '~icons/svg-spinners/blocks-shuffle-3';

	// Fetch sales data from Firestore
	const salesCollection = firekitCollection<Sale>('sales');
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center justify-between gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">Sales Tracker</h1>
		</div>
		<AddSaleSheet />
	</div>
</header>
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
	{:else if salesCollection.empty}
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
					<AddSaleSheet />
				</Empty.Content>
			</Empty.Root>
		</div>
	{:else}
		<SalesTable data={salesCollection.data} />
	{/if}
</div>
