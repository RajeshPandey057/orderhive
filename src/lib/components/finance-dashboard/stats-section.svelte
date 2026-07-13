<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { formatAmount, type GroupStats } from '$lib/finance-dashboard-utils.js';
	import { cn } from '$lib/utils.js';

	let { stats, title = '', subtitle = '' }: { stats: GroupStats; title?: string; subtitle?: string } =
		$props();

	type StatCard = {
		label: string;
		value: string;
		sub?: string;
		highlight?: 'green' | 'red' | 'blue' | 'orange';
	};

	const singleCards: StatCard[] = $derived([
		{
			label: 'Total Deals',
			value: String(stats.totalCount),
			sub: formatAmount(stats.totalAmount),
			highlight: 'blue'
		},
		{
			label: '1st Half Invoice Eligible',
			value: String(stats.firstHalfCount),
			sub: formatAmount(stats.firstHalfAmount)
		},
		{
			label: '2nd Half Invoice Eligible',
			value: String(stats.secondHalfCount),
			sub: formatAmount(stats.secondHalfAmount)
		},
		{
			label: 'Full Invoice Eligible',
			value: String(stats.fullCount),
			sub: formatAmount(stats.fullAmount)
		},
		{
			label: 'Invoice Raised',
			value: `${stats.invoiceRaisedPct}%`,
			highlight: 'green'
		},
		{
			label: 'Invoice Not Raised',
			value: `${stats.invoiceNotRaisedPct}%`,
			highlight: 'orange'
		},
		{
			label: 'Payment Received',
			value: `${stats.paymentReceivedPct}%`,
			highlight: 'green'
		},
		{
			label: 'Payment Not Received',
			value: `${stats.paymentNotReceivedPct}%`,
			highlight: 'red'
		}
	]);

	const financials = $derived([
		{ label: 'Total GTV', value: formatAmount(stats.totalAmount), highlight: 'blue' },
		{ label: 'Total Revenue', value: formatAmount(stats.totalRevenue), highlight: 'green' },
		{ label: 'Passback', value: formatAmount(stats.totalPassback), highlight: 'orange' },
		{ label: 'Total Revenue post Passback', value: formatAmount(stats.totalProfitPostPassback), highlight: 'green' }
	] as const);

	const highlightClass = (h: 'green' | 'red' | 'blue' | 'orange' | undefined) => {
		switch (h) {
			case 'green':
				return 'text-emerald-600 dark:text-emerald-400';
			case 'red':
				return 'text-red-500 dark:text-red-400';
			case 'orange':
				return 'text-amber-500 dark:text-amber-400';
			case 'blue':
				return 'text-primary dark:text-primary';
			default:
				return 'text-foreground';
		}
	};
</script>

<div class="flex flex-col gap-4">
	{#if title}
		<div>
			<h3 class="text-base font-semibold text-foreground">{title}</h3>
			{#if subtitle}
				<p class="text-muted-foreground text-sm">{subtitle}</p>
			{/if}
		</div>
	{/if}

	<!-- Financial metrics — single row of 4 blocks -->
	<div class="grid grid-cols-4 gap-3">
		{#each financials as f}
			<Card.Root class="border bg-card shadow-sm">
				<Card.Content class="p-4">
					<p class="text-muted-foreground mb-1 text-xs font-medium leading-tight">{f.label}</p>
					<p class={cn('text-2xl font-bold', highlightClass(f.highlight))}>{f.value}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Invoice & payment stat cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		{#each singleCards as card}
			<Card.Root class="border bg-card shadow-sm">
				<Card.Content class="p-4">
					<p class="text-muted-foreground mb-1 text-xs font-medium leading-tight">{card.label}</p>
					<p class={cn('text-2xl font-bold', highlightClass(card.highlight))}>{card.value}</p>
					{#if card.sub}
						<p class="text-muted-foreground mt-0.5 text-xs">{card.sub}</p>
					{/if}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
