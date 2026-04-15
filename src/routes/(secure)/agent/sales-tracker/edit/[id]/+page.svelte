<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import EditSaleSheet from '$lib/components/edit-sale-sheet.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { firekitCollection } from 'svelte-firekit';
	import AlertCircle from '~icons/lucide/alert-circle';
	import Loader from '~icons/svg-spinners/blocks-shuffle-3';

	let { data } = $props();

	const salesCollection = firekitCollection<Sale>('sales');
	const selectedSale = $derived(
		salesCollection.data?.find((sale) => sale.id === data.saleId) ?? null
	);
</script>

{#if salesCollection.loading}
	<div class="flex min-h-[70vh] items-center justify-center rounded-xl bg-muted/50 p-6">
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<Loader class="h-8 w-8 animate-spin" />
				</Empty.Media>
				<Empty.Title>Loading Sale</Empty.Title>
				<Empty.Description>Please wait while we fetch the sale to edit.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	</div>
{:else if salesCollection.error}
	<div class="flex min-h-[70vh] items-center justify-center rounded-xl bg-muted/50 p-6">
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<AlertCircle class="h-8 w-8 text-destructive" />
				</Empty.Media>
				<Empty.Title>Unable To Load Sale</Empty.Title>
				<Empty.Description>{salesCollection.error.message}</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	</div>
{:else if !selectedSale}
	<div class="flex min-h-[70vh] items-center justify-center rounded-xl bg-muted/50 p-6">
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<AlertCircle class="h-8 w-8 text-destructive" />
				</Empty.Media>
				<Empty.Title>Sale Not Found</Empty.Title>
				<Empty.Description>The selected sale could not be located.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<button
					class="rounded-md border px-3 py-2 text-sm"
					onclick={() => goto(resolve('/agent/sales-tracker'))}
				>
					Back to sales tracker
				</button>
			</Empty.Content>
		</Empty.Root>
	</div>
{:else}
	<EditSaleSheet sale={selectedSale} userRole={data?.user?.role} />
{/if}
