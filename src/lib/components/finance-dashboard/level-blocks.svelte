<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { DashboardData, GroupStats, LevelKey, NamedStats } from '$lib/finance-dashboard-utils.js';
	import { cn } from '$lib/utils.js';
	import Building2 from '~icons/lucide/building-2';
	import ChevronDown from '~icons/lucide/chevron-down';
	import HardHat from '~icons/lucide/hard-hat';
	import Search from '~icons/lucide/search';
	import User from '~icons/lucide/user';
	import Users from '~icons/lucide/users';
	import UsersRound from '~icons/lucide/users-round';

	let {
		data,
		onStatsChange
	}: {
		data: DashboardData;
		onStatsChange: (stats: GroupStats, label: string, level: LevelKey, key: string) => void;
	} = $props();

	let activeLevel = $state<LevelKey>('company');
	let selectedKey = $state<string>('all');
	let searchQuery = $state('');
	let selectOpen = $state(false);

	const levels: { key: LevelKey; label: string; icon: typeof User }[] = [
		{ key: 'company', label: 'Company', icon: Building2 },
		{ key: 'senior-manager', label: 'Senior Manager', icon: UsersRound },
		{ key: 'manager', label: 'Manager', icon: Users },
		{ key: 'agent', label: 'Agent', icon: User },
		{ key: 'developer', label: 'Developer', icon: HardHat }
	];

	function getOptions(level: LevelKey): { key: string; displayName: string }[] {
		switch (level) {
			case 'senior-manager':
				return data.availableSeniorManagers;
			case 'manager':
				return data.availableManagers;
			case 'agent':
				return data.availableAgents;
			case 'developer':
				return data.availableDevelopers.map((d) => ({ key: d, displayName: d }));
			default:
				return [];
		}
	}

	function getGroupStats(level: LevelKey, key: string): { stats: GroupStats; label: string } {
		if (level === 'company' || key === 'all') {
			return { stats: data.companyStats, label: 'Company' };
		}
		let source: NamedStats[];
		switch (level) {
			case 'senior-manager':
				source = data.bySeniorManager;
				break;
			case 'manager':
				source = data.byManager;
				break;
			case 'agent':
				source = data.byAgent;
				break;
			case 'developer':
				source = data.byDeveloper;
				break;
			default:
				return { stats: data.companyStats, label: 'Company' };
		}
		const found = source.find((s) => s.key === key);
		return found ? { stats: found.stats, label: found.displayName } : { stats: data.companyStats, label: 'Company' };
	}

	function selectLevel(level: LevelKey) {
		activeLevel = level;
		selectedKey = 'all';
		searchQuery = '';
		selectOpen = false;
		const { stats, label } = getGroupStats(level, 'all');
		onStatsChange(stats, label, level, 'all');
	}

	function handleSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchQuery = value;
		if (value.trim()) selectOpen = true;
	}

	function selectOption(value: string | undefined) {
		if (!value) return;
		selectedKey = value;
		const { stats, label } = getGroupStats(activeLevel, value);
		onStatsChange(stats, label, activeLevel, value);
	}

	// emit initial state
	$effect(() => {
		const { stats, label } = getGroupStats(activeLevel, selectedKey);
		onStatsChange(stats, label, activeLevel, selectedKey);
	});

	const options = $derived(getOptions(activeLevel));
	const hasOptions = $derived(activeLevel !== 'company');
	const showSearch = $derived(
		activeLevel === 'senior-manager' || activeLevel === 'manager' || activeLevel === 'agent'
	);
	const filteredOptions = $derived(
		searchQuery.trim()
			? options.filter((o) => o.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
			: options
	);
	const selectedDisplayName = $derived(
		selectedKey === 'all'
			? 'All'
			: options.find((o) => o.key === selectedKey)?.displayName ?? selectedKey
	);
</script>

<div class="flex flex-col gap-4">
	<!-- Level selector blocks -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		{#each levels as level}
			{@const Icon = level.icon}
			<button
				onclick={() => selectLevel(level.key)}
				class={cn(
					'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all hover:shadow-md',
					activeLevel === level.key
						? 'border-primary bg-primary text-primary-foreground shadow-md'
						: 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted'
				)}
			>
				<Icon class="size-5" />
				<span class="text-center leading-tight">{level.label}</span>
			</button>
		{/each}
	</div>

	<!-- Person/entity selector dropdown (hidden for company level) -->
	{#if hasOptions && options.length > 0}
		<div class="flex flex-wrap items-center gap-3">
			<span class="text-muted-foreground text-sm font-medium shrink-0">
				Filter by {levels.find((l) => l.key === activeLevel)?.label}:
			</span>
			<Select.Root type="single" value={selectedKey} onValueChange={selectOption} bind:open={selectOpen}>
				<Select.Trigger class="h-9 min-w-56 max-w-xs rounded-lg border border-border bg-background px-3 text-sm">
					<div class="flex items-center gap-1.5 truncate">
						<span class="truncate">{selectedDisplayName}</span>
						<ChevronDown class="ml-auto size-4 shrink-0 opacity-50" />
					</div>
				</Select.Trigger>
				<Select.Content class="max-h-72 overflow-y-auto">
					<Select.Item value="all">All {levels.find((l) => l.key === activeLevel)?.label}s</Select.Item>
					<Select.Separator />
					{#each filteredOptions as opt}
						<Select.Item value={opt.key} class="max-w-xs truncate">{opt.displayName}</Select.Item>
					{/each}
					{#if filteredOptions.length === 0}
						<div class="text-muted-foreground px-3 py-2 text-sm">No matches</div>
					{/if}
				</Select.Content>
			</Select.Root>

			{#if showSearch}
				<div class="relative">
					<Search class="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
					<Input
						type="text"
						placeholder="Search…"
						value={searchQuery}
						oninput={handleSearchInput}
						class="h-9 w-48 rounded-lg pl-8 text-sm"
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>
