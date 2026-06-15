<script lang="ts">
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';
	import * as Select from '$lib/components/ui/select';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { getAttendancePeriodRange, type AttendancePeriod } from '$lib/date-period';
	import { SvelteDate } from 'svelte/reactivity';

	let { data } = $props<{ data: { rows: AttendanceLog[]; holidayCount: number } }>();

	let period = $state<AttendancePeriod>('this-month');
	const rows: AttendanceLog[] = $derived(data.rows ?? []);
	const today = new SvelteDate();
	const selectedRange = $derived(getAttendancePeriodRange(period, today));
	const filteredRows: AttendanceLog[] = $derived.by(() => {
		return rows.filter((row) => row.date >= selectedRange.start && row.date <= selectedRange.end);
	});
	const presentRows = $derived(
		filteredRows.filter((row) => row.status === 'present' || row.status === 'late')
	);
	const onTimeRows = $derived(filteredRows.filter((row) => row.status === 'present'));
	const leaveRows = $derived(filteredRows.filter((row) => row.status === 'on-leave'));
	const workingDays = $derived(filteredRows.filter((row) => row.status !== 'holiday').length);
	const periodLabel = $derived(
		period === 'this-week' ? 'This week' : period === 'last-week' ? 'Last week' : 'This month'
	);
	const holidayCountForPeriod = $derived.by(() => {
		if (period === 'this-month') return data.holidayCount;
		return filteredRows.filter((row) => row.status === 'holiday').length;
	});
	const onTimeRate = $derived(
		presentRows.length ? Math.round((onTimeRows.length / presentRows.length) * 100) : 0
	);

	function minutesToDuration(minutes?: number) {
		const safe = Math.max(0, Number(minutes ?? 0));
		const hours = Math.floor(safe / 60);
		const mins = safe % 60;
		return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
	}
</script>

<SecurePageHeader title="Attendance" />

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	<div class="rounded-md border border-[#EBEEEE] bg-white p-6">
		<div class="mb-4 flex items-center justify-between gap-3">
			<Select.Root type="single" bind:value={period}>
				<Select.Trigger
					class="h-8 w-35 border border-[#D4D9D9] bg-white text-[13px] text-[#222626]"
				>
					{periodLabel}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="this-week">This week</Select.Item>
					<Select.Item value="last-week">Last week</Select.Item>
					<Select.Item value="this-month">This month</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<div class="grid grid-cols-2 gap-2 md:grid-cols-6">
			<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] text-[#687976]">On time rate</p>
				<div class="mt-3 text-2xl leading-8 font-medium">{onTimeRate}%</div>
			</div>
			<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] text-[#687976]">Working days</p>
				<div class="mt-3 text-2xl leading-8 font-medium">{workingDays}</div>
			</div>
			<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] text-[#687976]">Weekly Off</p>
				<div class="mt-3 text-2xl leading-8 font-medium">0</div>
			</div>
			<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] text-[#687976]">Present</p>
				<div class="mt-3 text-2xl leading-8 font-medium">{presentRows.length}</div>
			</div>
			<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] text-[#687976]">Leaves</p>
				<div class="mt-3 text-2xl leading-8 font-medium">{leaveRows.length}</div>
			</div>
			<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
				<p class="text-[13px] text-[#687976]">Holidays ({periodLabel})</p>
				<div class="mt-3 text-2xl leading-8 font-medium">{holidayCountForPeriod}</div>
			</div>
		</div>
	</div>

	<div class="overflow-hidden rounded-md border border-[#EBEEEE] bg-white">
		<Table>
			<TableHeader>
				<TableRow class="bg-[#FBF9F8]">
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Sr.</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Date</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Punch In time</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Punch out time</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Total Hours</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Overtime</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Short by</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#if filteredRows.length === 0}
					<TableRow
						><TableCell colspan={7} class="h-24 text-center text-[13px] text-[#687976]"
							>No attendance records found.</TableCell
						></TableRow
					>
				{:else}
					{#each filteredRows as row, index (row.id)}
						<TableRow class="h-13">
							<TableCell class="text-[13px]">{index + 1}</TableCell>
							<TableCell class="text-[13px]">{row.date}</TableCell>
							<TableCell class="text-[13px]">{row.punchIn || '-'}</TableCell>
							<TableCell class="text-[13px]">{row.punchOut || '-'}</TableCell>
							<TableCell class="text-[13px]">{minutesToDuration(row.workingMinutes)}</TableCell>
							<TableCell class="text-[13px]">{minutesToDuration(row.overtimeMinutes)}</TableCell>
							<TableCell class="text-[13px]">{minutesToDuration(row.shortByMinutes)}</TableCell>
						</TableRow>
					{/each}
				{/if}
			</TableBody>
		</Table>
	</div>
</div>
