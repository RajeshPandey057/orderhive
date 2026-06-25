<script lang="ts">
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';
	import PeriodFilter from '$lib/components/finance-dashboard/period-filter.svelte';
	import StatsSection from '$lib/components/finance-dashboard/stats-section.svelte';
	import TopPerformers from '$lib/components/finance-dashboard/top-performers.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { formatAmount } from '$lib/finance-dashboard-utils.js';

	let { data } = $props();

	const isSeniorManager = $derived(data.role === 'senior-manager');
	const isManager = $derived(data.role === 'manager');
	const isAgent = $derived(data.role === 'agent');

	const pageTitle = $derived(
		isSeniorManager
			? 'Senior Manager Dashboard'
			: isManager
				? 'Manager Dashboard'
				: 'My Dashboard'
	);

	const pageDescription = $derived(
		isSeniorManager
			? 'Team performance — confirmed deals, invoices & payments.'
			: isManager
				? 'Your team\'s confirmed deals, invoices & payments.'
				: 'Your confirmed deals, invoices & payments.'
	);
</script>

<SecurePageHeader title={pageTitle} description={pageDescription} />

<div class="flex flex-1 flex-col gap-6 p-4 pt-0">
	<!-- Period filter bar -->
	<PeriodFilter params={data.periodParams} />

	<!-- Company-level aggregate (team scope) -->
	<div class="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
		<StatsSection
			stats={data.companyStats}
			title="Overall"
			subtitle="Aggregate of all confirmed deals in your scope"
		/>
	</div>

	<!-- Senior Manager: show manager breakdown -->
	{#if isSeniorManager && data.byManager.length > 0}
		<div class="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-foreground">Manager Breakdown</h2>
			<div class="flex flex-col gap-6 divide-y divide-border">
				{#each data.byManager as manager}
					<div class="pt-4 first:pt-0">
						<StatsSection
							stats={manager.stats}
							title={manager.displayName.split('@')[0]}
							subtitle={manager.displayName}
						/>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Senior Manager + Manager: show agent breakdown -->
	{#if (isSeniorManager || isManager) && data.byAgent.length > 0}
		<div class="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-foreground">Agent Breakdown</h2>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
							<th class="pb-2 pr-4">Agent</th>
							<th class="pb-2 pr-4 text-right">Deals</th>
							<th class="pb-2 pr-4 text-right">Revenue</th>
							<th class="pb-2 pr-4 text-right">Inv. Raised</th>
							<th class="pb-2 text-right">Paid</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each data.byAgent as agent}
							<tr class="hover:bg-muted/30">
								<td class="py-2.5 pr-4">
									<div class="font-medium text-foreground">{agent.displayName.split('@')[0]}</div>
									{#if agent.displayName.includes('@')}
										<div class="text-xs text-muted-foreground">{agent.displayName}</div>
									{/if}
								</td>
								<td class="py-2.5 pr-4 text-right font-semibold">{agent.stats.totalCount}</td>
								<td class="py-2.5 pr-4 text-right text-muted-foreground">{formatAmount(agent.stats.totalAmount)}</td>
								<td class="py-2.5 pr-4 text-right">
									<span class="text-emerald-600 font-medium">{agent.stats.invoiceRaisedPct}%</span>
								</td>
								<td class="py-2.5 text-right">
									<span class="text-emerald-600 font-medium">{agent.stats.paymentReceivedPct}%</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Developer breakdown (all non-admin roles) -->
	{#if data.byDeveloper.length > 0}
		<div class="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-foreground">Developer Breakdown</h2>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
							<th class="pb-2 pr-4">Developer</th>
							<th class="pb-2 pr-4 text-right">Deals</th>
							<th class="pb-2 pr-4 text-right">Revenue</th>
							<th class="pb-2 pr-4 text-right">Inv. Raised</th>
							<th class="pb-2 text-right">Paid</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each data.byDeveloper as dev}
							<tr class="hover:bg-muted/30">
								<td class="py-2.5 pr-4 font-medium text-foreground">{dev.displayName}</td>
								<td class="py-2.5 pr-4 text-right font-semibold">{dev.stats.totalCount}</td>
								<td class="py-2.5 pr-4 text-right text-muted-foreground">{formatAmount(dev.stats.totalAmount)}</td>
								<td class="py-2.5 pr-4 text-right">
									<span class="text-emerald-600 font-medium">{dev.stats.invoiceRaisedPct}%</span>
								</td>
								<td class="py-2.5 text-right">
									<span class="text-emerald-600 font-medium">{dev.stats.paymentReceivedPct}%</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Top performers (for senior manager and manager) -->
	{#if (isSeniorManager || isManager) && data.topAgents.length > 0}
		<div class="flex flex-col gap-3">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-foreground">Top Performers</h2>
			<TopPerformers
				agents={data.topAgents}
				seniorManagers={isSeniorManager ? data.topSeniorManagers : []}
				showSeniorManagers={false}
			/>
		</div>
	{/if}

	<!-- Empty state for agent with no deals -->
	{#if isAgent && data.companyStats.totalCount === 0}
		<div class="flex min-h-40 items-center justify-center rounded-xl border bg-card text-muted-foreground text-sm">
			No confirmed deals found for the selected period.
		</div>
	{/if}
</div>
