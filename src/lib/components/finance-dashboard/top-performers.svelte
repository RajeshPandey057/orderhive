<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { formatAmount, type TopPerformer } from '$lib/finance-dashboard-utils.js';
	import { cn } from '$lib/utils.js';
	import Medal from '~icons/lucide/medal';
	import TrendingUp from '~icons/lucide/trending-up';

	let {
		seniorManagers = [],
		agents = [],
		showSeniorManagers = true
	}: {
		seniorManagers?: TopPerformer[];
		agents?: TopPerformer[];
		showSeniorManagers?: boolean;
	} = $props();

	type SortMode = 'deals' | 'revenue';

	let smSort = $state<SortMode>('deals');
	let agentSort = $state<SortMode>('deals');

	const smSorted = $derived(
		[...seniorManagers]
			.sort((a, b) => (smSort === 'deals' ? b.dealCount - a.dealCount : b.revenue - a.revenue))
			.slice(0, 5)
	);

	const agentSorted = $derived(
		[...agents]
			.sort((a, b) => (agentSort === 'deals' ? b.dealCount - a.dealCount : b.revenue - a.revenue))
			.slice(0, 10)
	);

	const medalColor = (i: number) => {
		if (i === 0) return 'text-yellow-500';
		if (i === 1) return 'text-slate-400';
		if (i === 2) return 'text-amber-700';
		return 'text-muted-foreground';
	};

	function shortName(displayName: string): string {
		if (displayName.includes('@')) return displayName.split('@')[0];
		return displayName;
	}

	const toggleClass = (active: boolean) =>
		cn(
			'rounded-md px-3 py-1 text-xs font-medium transition-colors',
			active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
		);
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	<!-- Top Senior Managers -->
	{#if showSeniorManagers && seniorManagers.length > 0}
		<Card.Root class="border bg-card shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<TrendingUp class="text-primary size-4" />
						<Card.Title class="text-base">Top Senior Managers</Card.Title>
					</div>
					<div class="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
						<button class={toggleClass(smSort === 'deals')} onclick={() => (smSort = 'deals')}>
							By Deals
						</button>
						<button class={toggleClass(smSort === 'revenue')} onclick={() => (smSort = 'revenue')}>
							By Revenue
						</button>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="pt-0">
				<div class="flex flex-col gap-2">
					{#each smSorted as sm, i}
						<div class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
							<Medal class={cn('size-4 shrink-0', medalColor(i))} />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-foreground">{shortName(sm.displayName)}</p>
								<p class="text-muted-foreground text-xs">{sm.displayName}</p>
							</div>
							<div class="text-right shrink-0">
								<p class="text-sm font-semibold text-foreground">{sm.dealCount} deals</p>
								<p class="text-muted-foreground text-xs">{formatAmount(sm.revenue)}</p>
							</div>
						</div>
					{/each}
					{#if smSorted.length === 0}
						<p class="text-muted-foreground py-4 text-center text-sm">No data for this period</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Top Agents -->
	{#if agents.length > 0}
		<Card.Root class="border bg-card shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<TrendingUp class="text-primary size-4" />
						<Card.Title class="text-base">Top Performing Agents</Card.Title>
					</div>
					<div class="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
						<button class={toggleClass(agentSort === 'deals')} onclick={() => (agentSort = 'deals')}>
							By Deals
						</button>
						<button
							class={toggleClass(agentSort === 'revenue')}
							onclick={() => (agentSort = 'revenue')}
						>
							By Revenue
						</button>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="pt-0">
				<div class="flex flex-col gap-2">
					{#each agentSorted as agent, i}
						<div class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
							<Medal class={cn('size-4 shrink-0', medalColor(i))} />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-foreground">{shortName(agent.displayName)}</p>
							</div>
							<div class="text-right shrink-0">
								<p class="text-sm font-semibold text-foreground">{agent.dealCount} deals</p>
								<p class="text-muted-foreground text-xs">{formatAmount(agent.revenue)}</p>
							</div>
						</div>
					{/each}
					{#if agentSorted.length === 0}
						<p class="text-muted-foreground py-4 text-center text-sm">No data for this period</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
