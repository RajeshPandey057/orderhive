<script lang="ts">
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { firekitCollection } from 'svelte-firekit';
	import AddSaleSheet from './add-sale-sheet.svelte';
	import SalesTable from './sales-table.svelte';

	// Define the Sale interface matching Firestore structure
	interface Sale {
		id: string;
		primaryBuyer: {
			firstName: string;
			lastName: string;
		};
		property: string;
		developer: string;
		unitValue: string;
		dealStage: string;
		paymentValue: number;
	}

	// Fetch sales data from Firestore
	const salesCollection = firekitCollection<Sale>('sales');

	// Transform Firestore data to match table format
	const tableData = $derived(
		salesCollection.data.map((sale) => ({
			id: sale.id,
			client: `${sale.primaryBuyer.firstName} ${sale.primaryBuyer.lastName}`,
			property: sale.property,
			location: sale.developer,
			unitValue: parseInt(sale.unitValue.replace(/,/g, '')) || 0,
			dealStatus: sale.dealStage === 'eoi' ? 'EOI' : 'Booking',
			paymentValue: sale.paymentValue,
			invoicingStage: sale.paymentValue >= 10 ? 'First half' : 'Second half',
			invoicingPayment: `${10 + 4}% paid`,
			invoicingStatus:
				sale.paymentValue === 100 ? 'Approved' : sale.paymentValue > 50 ? 'Review' : 'Next Month',
			commission: Math.round((parseInt(sale.unitValue.replace(/,/g, '')) || 0) * 0.02)
		}))
	);
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
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"
					role="status"
				>
					<span class="sr-only">Loading...</span>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">Loading sales data...</p>
			</div>
		</div>
	{:else if salesCollection.error}
		<div class="flex min-h-100 items-center justify-center rounded-xl bg-muted/50">
			<div class="text-center text-destructive">
				<p class="font-medium">Error loading sales</p>
				<p class="text-sm">{salesCollection.error.message}</p>
			</div>
		</div>
	{:else if salesCollection.empty}
		<div class="flex min-h-100 items-center justify-center rounded-xl bg-muted/50">
			<div class="text-center">
				<p class="font-medium text-muted-foreground">No sales found</p>
				<p class="text-sm text-muted-foreground">Add your first sale to get started</p>
			</div>
		</div>
	{:else}
		<SalesTable data={tableData} />
	{/if}
</div>
