<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { getAvailableYears, type FinancePeriodParams } from '$lib/date-period.js';
	import { cn } from '$lib/utils.js';
	import { parseDate, type DateValue } from '@internationalized/date';
	import CalendarIcon from '~icons/lucide/calendar';
	import X from '~icons/lucide/x';

	let { params }: { params: FinancePeriodParams } = $props();

	const years = getAvailableYears();

	let customPopoverOpen = $state(false);
	let rangeValue = $state<{ start: DateValue | undefined; end: DateValue | undefined }>({
		start: undefined,
		end: undefined
	});

	$effect(() => {
		if (params.period === 'custom' && params.from) {
			rangeValue = {
				start: parseDate(params.from),
				end: parseDate(params.to ?? params.from)
			};
		} else {
			rangeValue = { start: undefined, end: undefined };
		}
	});

	function navigate(newParams: Partial<FinancePeriodParams>) {
		const url = new URL(page.url);
		['period', 'year', 'from', 'to'].forEach((k) => url.searchParams.delete(k));

		const merged: FinancePeriodParams = { ...params, ...newParams };
		url.searchParams.set('period', merged.period);
		if (merged.year) url.searchParams.set('year', String(merged.year));
		if (merged.from) url.searchParams.set('from', merged.from);
		if (merged.to) url.searchParams.set('to', merged.to);

		goto(url.toString(), { replaceState: true });
	}

	function setYear(year: string | undefined) {
		if (!year) return;
		if (year === 'all') {
			navigate({ period: 'all-time', year: undefined, from: undefined, to: undefined });
		} else {
			navigate({ period: 'year', year: parseInt(year), from: undefined, to: undefined });
		}
	}

	function onRangeChange(value: { start: DateValue | undefined; end: DateValue | undefined }) {
		rangeValue = value;
		if (value.start && value.end) {
			navigate({ period: 'custom', from: value.start.toString(), to: value.end.toString(), year: undefined });
			customPopoverOpen = false;
		}
	}

	function clearCustom() {
		rangeValue = { start: undefined, end: undefined };
		navigate({ period: 'all-time', year: undefined, from: undefined, to: undefined });
	}

	function formatDisplay(value: string) {
		const [y, m, d] = value.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const isCustomActive = $derived(params.period === 'custom');
	const yearSelectValue = $derived(params.period === 'year' && params.year ? String(params.year) : 'all');
	const yearLabel = $derived(params.period === 'year' && params.year ? String(params.year) : 'All Years');
	const customLabel = $derived(
		isCustomActive && params.from
			? `${formatDisplay(params.from)} – ${formatDisplay(params.to ?? params.from)}`
			: 'Custom range'
	);
</script>

<div class="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
	<span class="text-muted-foreground text-sm font-medium shrink-0">Period:</span>

	<Select.Root type="single" value={yearSelectValue} onValueChange={setYear}>
		<Select.Trigger
			class={cn(
				'h-9 min-w-32 rounded-lg border px-3 text-sm font-medium',
				!isCustomActive
					? 'bg-primary text-primary-foreground border-primary'
					: 'bg-background text-foreground border-border hover:bg-muted'
			)}
		>
			{yearLabel}
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="all">All Years</Select.Item>
			{#each years as y}
				<Select.Item value={String(y)}>{y}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<span class="text-muted-foreground text-sm">or</span>

	<div class="flex items-center gap-2">
		<Popover.Root bind:open={customPopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="outline"
						type="button"
						class={cn(
							'h-9 gap-2 rounded-lg border px-3 text-sm font-medium',
							isCustomActive
								? 'bg-primary text-primary-foreground border-primary'
								: 'bg-background text-foreground border-border hover:bg-muted'
						)}
					>
						<CalendarIcon
							class={cn('h-4 w-4', isCustomActive ? 'text-primary-foreground' : 'text-blue-500')}
						/>
						{customLabel}
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-auto p-0" align="start">
				<RangeCalendar bind:value={rangeValue} onValueChange={onRangeChange} numberOfMonths={2} />
			</Popover.Content>
		</Popover.Root>

		{#if isCustomActive}
			<button
				type="button"
				class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				onclick={clearCustom}
				aria-label="Clear custom range"
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>
</div>
