<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import {
		formatDateInput,
		getAvailableYears,
		getWeeksForYear,
		type FinancePeriodParams,
		type FinancePeriodType
	} from '$lib/date-period.js';
	import { cn } from '$lib/utils.js';

	let { params }: { params: FinancePeriodParams } = $props();

	const MONTHS = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const currentYear = new Date().getFullYear();
	const years = getAvailableYears();
	let weekYear = $state<number>(currentYear);
	let weeks = $derived(getWeeksForYear(weekYear));

	let customFrom = $state('');
	let customTo = $state('');

	function navigate(newParams: Partial<FinancePeriodParams>) {
		const url = new URL(page.url);
		['period', 'year', 'month', 'from', 'to'].forEach((k) => url.searchParams.delete(k));

		const merged: FinancePeriodParams = { ...params, ...newParams };
		url.searchParams.set('period', merged.period);
		if (merged.year) url.searchParams.set('year', String(merged.year));
		if (merged.month) url.searchParams.set('month', String(merged.month));
		if (merged.from) url.searchParams.set('from', merged.from);
		if (merged.to) url.searchParams.set('to', merged.to);

		goto(url.toString(), { replaceState: true });
	}

	function setSimple(period: FinancePeriodType) {
		navigate({ period, year: undefined, month: undefined, from: undefined, to: undefined });
	}

	function setYear(year: string | undefined) {
		if (!year) return;
		navigate({ period: 'year', year: parseInt(year), month: undefined, from: undefined, to: undefined });
	}

	function setMonth(month: string | undefined) {
		if (!month) return;
		const y = params.period === 'month' ? (params.year ?? currentYear) : currentYear;
		navigate({ period: 'month', year: y, month: parseInt(month), from: undefined, to: undefined });
	}

	function setMonthYear(year: string | undefined) {
		if (!year) return;
		const m = params.period === 'month' ? params.month : undefined;
		navigate({ period: 'month', year: parseInt(year), month: m, from: undefined, to: undefined });
	}

	function setWeek(fromTo: string | undefined) {
		if (!fromTo) return;
		const [from, to] = fromTo.split('|');
		navigate({ period: 'week', year: weekYear, from, to, month: undefined });
	}

	function applyCustom() {
		if (!customFrom) return;
		navigate({ period: 'custom', from: customFrom, to: customTo || customFrom, year: undefined, month: undefined });
	}

	const isActive = (p: FinancePeriodType) => params.period === p;

	const pillClass = (p: FinancePeriodType) =>
		cn(
			'h-9 rounded-lg border px-4 text-sm font-medium transition-colors',
			isActive(p)
				? 'bg-primary text-primary-foreground border-primary'
				: 'bg-background text-foreground border-border hover:bg-muted'
		);
</script>

<div class="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3 shadow-sm">
	<span class="text-muted-foreground text-sm font-medium shrink-0">Period:</span>

	<!-- Simple pills -->
	<button class={pillClass('today')} onclick={() => setSimple('today')}>Today</button>
	<button class={pillClass('all-time')} onclick={() => setSimple('all-time')}>All Time</button>

	<!-- Year dropdown -->
	<Select.Root
		type="single"
		value={isActive('year') ? String(params.year) : undefined}
		onValueChange={setYear}
	>
		<Select.Trigger
			class={cn(
				'h-9 min-w-24 rounded-lg border px-3 text-sm font-medium',
				isActive('year')
					? 'bg-primary text-primary-foreground border-primary'
					: 'bg-background text-foreground border-border hover:bg-muted'
			)}
		>
			{isActive('year') && params.year ? String(params.year) : 'Year'}
		</Select.Trigger>
		<Select.Content>
			{#each years as y}
				<Select.Item value={String(y)}>{y}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<!-- Month dropdown (year selector + month selector) -->
	<div class="flex items-center gap-1">
		<Select.Root
			type="single"
			value={isActive('month') ? String(params.year ?? currentYear) : undefined}
			onValueChange={setMonthYear}
		>
			<Select.Trigger
				class={cn(
					'h-9 min-w-16 rounded-lg border px-3 text-sm font-medium',
					isActive('month')
						? 'bg-primary/10 text-primary border-primary/40'
						: 'bg-background text-foreground border-border hover:bg-muted'
				)}
			>
				{isActive('month') && params.year ? String(params.year) : 'Year'}
			</Select.Trigger>
			<Select.Content>
				{#each years as y}
					<Select.Item value={String(y)}>{y}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<Select.Root
			type="single"
			value={isActive('month') && params.month ? String(params.month) : undefined}
			onValueChange={setMonth}
		>
			<Select.Trigger
				class={cn(
					'h-9 min-w-28 rounded-lg border px-3 text-sm font-medium',
					isActive('month')
						? 'bg-primary text-primary-foreground border-primary'
						: 'bg-background text-foreground border-border hover:bg-muted'
				)}
			>
				{isActive('month') && params.month ? MONTHS[params.month - 1] : 'Month'}
			</Select.Trigger>
			<Select.Content>
				{#each MONTHS as m, i}
					<Select.Item value={String(i + 1)}>{m}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Week dropdown -->
	<Select.Root
		type="single"
		value={isActive('week') && params.from ? `${params.from}|${params.to}` : undefined}
		onValueChange={setWeek}
	>
		<Select.Trigger
			class={cn(
				'h-9 min-w-28 rounded-lg border px-3 text-sm font-medium',
				isActive('week')
					? 'bg-primary text-primary-foreground border-primary'
					: 'bg-background text-foreground border-border hover:bg-muted'
			)}
		>
			{isActive('week') && params.from
				? `${params.from} – ${params.to}`
				: 'Week'}
		</Select.Trigger>
		<Select.Content class="max-h-60 overflow-y-auto">
			{#each weeks as w}
				<Select.Item value={`${w.from}|${w.to}`}>{w.label} ({w.from})</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<!-- Custom -->
	<button class={pillClass('custom')} onclick={() => setSimple('custom')}>Custom</button>

	{#if isActive('custom')}
		<div class="flex items-center gap-2">
			<input
				type="date"
				class="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
				bind:value={customFrom}
				onchange={applyCustom}
			/>
			<span class="text-muted-foreground text-sm">to</span>
			<input
				type="date"
				class="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
				bind:value={customTo}
				min={customFrom}
				onchange={applyCustom}
			/>
		</div>
	{/if}
</div>
