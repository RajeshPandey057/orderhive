<script lang="ts">
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';
	import DealsTable from '$lib/components/finance-dashboard/deals-table.svelte';
	import LevelBlocks from '$lib/components/finance-dashboard/level-blocks.svelte';
	import PeriodFilter from '$lib/components/finance-dashboard/period-filter.svelte';
	import StatsSection from '$lib/components/finance-dashboard/stats-section.svelte';
	import TopPerformers from '$lib/components/finance-dashboard/top-performers.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { filterDealsByLevel, type GroupStats, type LevelKey } from '$lib/finance-dashboard-utils.js';

	let { data } = $props();

	let activeStats = $state<GroupStats | null>(null);
	let activeLabel = $state('Company');
	let activeLevel = $state<LevelKey>('company');
	let activeKey = $state<string>('all');

	const currentStats = $derived(activeStats ?? data.companyStats);

	const showDealsTable = $derived(activeLevel !== 'company' && activeKey !== 'all');

	const filteredDeals = $derived(
		showDealsTable ? filterDealsByLevel(data.allDeals, activeLevel, activeKey) : []
	);

	function handleStatsChange(stats: GroupStats, label: string, level: LevelKey, key: string) {
		activeStats = stats;
		activeLabel = label;
		activeLevel = level;
		activeKey = key;
	}
</script>

<SecurePageHeader
	title="Finance Dashboard"
	description="Confirmed deal performance — invoice & payment tracking."
/>

<div class="flex flex-1 flex-col gap-6 p-4 pt-0">
	<!-- Period filter bar -->
	<PeriodFilter params={data.periodParams} />

	<!-- Level blocks + drill-down -->
	<div class="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm">
		<LevelBlocks
			data={{
				companyStats: data.companyStats,
				bySeniorManager: data.bySeniorManager,
				byManager: data.byManager,
				byAgent: data.byAgent,
				byDeveloper: data.byDeveloper,
				topSeniorManagers: data.topSeniorManagers,
				topAgents: data.topAgents,
				availableSeniorManagers: data.availableSeniorManagers,
				availableManagers: data.availableManagers,
				availableAgents: data.availableAgents,
				availableDevelopers: data.availableDevelopers
			}}
			onStatsChange={handleStatsChange}
		/>

		<Separator />

		<!-- Stats for selected level/entity -->
		<StatsSection
			stats={currentStats}
			title={activeLabel}
			subtitle="Confirmed deals only · {data.companyStats.totalCount} total confirmed in scope"
		/>
	</div>

	<!-- Deals table when a specific entity is selected; top performers otherwise -->
	{#if showDealsTable}
		<DealsTable deals={filteredDeals} label={activeLabel} />
	{:else if data.topSeniorManagers.length > 0 || data.topAgents.length > 0}
		<div class="flex flex-col gap-3">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-foreground">Top Performers</h2>
			<TopPerformers
				seniorManagers={data.topSeniorManagers}
				agents={data.topAgents}
				showSeniorManagers={true}
			/>
		</div>
	{/if}
</div>
