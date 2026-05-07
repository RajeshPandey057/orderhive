<script lang="ts">
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Search, Download } from '@lucide/svelte';

	let attendanceRecords = $state([
		{
			id: 1,
			name: 'John Doe',
			date: '2026-04-17',
			punchIn: '09:55 AM',
			punchOut: '06:20 PM',
			workingHours: '08h 25m',
			status: 'Present',
			branch: 'Business Bay'
		},
		{
			id: 2,
			name: 'Jane Smith',
			date: '2026-04-17',
			punchIn: '10:20 AM',
			punchOut: '06:45 PM',
			workingHours: '08h 25m',
			status: 'Late',
			branch: 'Al Barsha'
		},
		{
			id: 3,
			name: 'Rahul Kumar',
			date: '2026-04-17',
			punchIn: '-',
			punchOut: '-',
			workingHours: '-',
			status: 'Absent',
			branch: 'India Office'
		},
		{
			id: 4,
			name: 'Sara Ali',
			date: '2026-04-17',
			punchIn: '-',
			punchOut: '-',
			workingHours: '-',
			status: 'On Leave',
			branch: 'Business Bay'
		}
	]);

	let correctionDialogOpen = $state(false);
	let selectedRecord = $state<any>(null);
	let correctionTime = $state('10:00');
	let filterPeriod = $state('yearly');
	let filterYear = $state('2026');
	let filterRange = $state('26/03/2026 - 26/04/2027');
	let searchQuery = $state('');
	let selectedKpiFilter = $state<'all' | 'on-time' | 'present' | 'absent' | 'on-leave'>('all');

	function openCorrection(record: any) {
		selectedRecord = record;
		correctionDialogOpen = true;
	}

	function applyCorrection() {
		if (selectedRecord) {
			const index = attendanceRecords.findIndex((r) => r.id === selectedRecord.id);
			attendanceRecords[index].punchIn = correctionTime + ' AM (Corrected)';
			attendanceRecords[index].workingHours = '08h 00m';
			attendanceRecords[index].status = 'Present';
		}
		correctionDialogOpen = false;
	}

	const searchFilteredAttendanceRecords = $derived(
		attendanceRecords.filter((record) => {
			const q = searchQuery.trim().toLowerCase();
			if (!q) return true;
			return (
				record.name.toLowerCase().includes(q) ||
				record.branch.toLowerCase().includes(q) ||
				record.date.toLowerCase().includes(q)
			);
		})
	);

	const presentCount = $derived(
		searchFilteredAttendanceRecords.filter((record) => record.status === 'Present').length
	);
	const absentCount = $derived(
		searchFilteredAttendanceRecords.filter((record) => record.status === 'Absent').length
	);
	const onLeaveCount = $derived(
		searchFilteredAttendanceRecords.filter((record) => record.status === 'On Leave').length
	);
	const presentTotalCount = $derived(
		searchFilteredAttendanceRecords.filter(
			(record) => record.status === 'Present' || record.status === 'Late'
		).length
	);
	const onTimeRate = $derived(
		searchFilteredAttendanceRecords.length
			? Math.round((presentCount / searchFilteredAttendanceRecords.length) * 100)
			: 0
	);

	const filteredAttendanceRecords = $derived(
		searchFilteredAttendanceRecords.filter((record) => {
			if (selectedKpiFilter === 'all') return true;
			if (selectedKpiFilter === 'on-time') return record.status === 'Present';
			if (selectedKpiFilter === 'present')
				return record.status === 'Present' || record.status === 'Late';
			if (selectedKpiFilter === 'absent') return record.status === 'Absent';
			return record.status === 'On Leave';
		})
	);

	function getKpiCardClass(filter: 'on-time' | 'present' | 'absent' | 'on-leave') {
		return selectedKpiFilter === filter
			? 'rounded-md border border-[#F04C06] bg-[#FFF0DE] p-4 text-left'
			: 'rounded-md border border-[#EBEEEE] p-4 text-left hover:bg-[#FBF9F8]';
	}
</script>

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl leading-8 font-medium">Attendance Management</h1>
			<p class="text-[13px] leading-5 text-[#687976]">Monitor daily punch-ins and handle corrections.</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" class="h-8 border-[#EBEEEE] text-sm text-[#222626]">Export Logs</Button>
			<Button class="h-8 border border-black/5 bg-[#222626] text-sm text-white">Sync Biometric</Button>
		</div>
	</div>

	<div class="space-y-4">
		<div class="flex flex-wrap items-center gap-3">
			<Select.Root type="single" bind:value={filterPeriod}>
				<Select.Trigger class="h-8 w-[120px]">{filterPeriod === 'yearly' ? 'Yearly' : filterPeriod}</Select.Trigger>
				<Select.Content>
					<Select.Item value="yearly">Yearly</Select.Item>
					<Select.Item value="monthly">Monthly</Select.Item>
					<Select.Item value="weekly">Weekly</Select.Item>
				</Select.Content>
			</Select.Root>

			<Select.Root type="single" bind:value={filterYear}>
				<Select.Trigger class="h-8 w-[110px]">{filterYear}</Select.Trigger>
				<Select.Content>
					<Select.Item value="2024">2024</Select.Item>
					<Select.Item value="2025">2025</Select.Item>
					<Select.Item value="2026">2026</Select.Item>
					<Select.Item value="2027">2027</Select.Item>
				</Select.Content>
			</Select.Root>

			<Select.Root type="single" bind:value={filterRange}>
				<Select.Trigger class="h-8 w-[260px]">{filterRange}</Select.Trigger>
				<Select.Content>
					<Select.Item value="26/03/2026 - 26/04/2027">26/03/2026 - 26/04/2027</Select.Item>
					<Select.Item value="01/01/2026 - 31/12/2026">01/01/2026 - 31/12/2026</Select.Item>
					<Select.Item value="01/04/2026 - 30/04/2026">01/04/2026 - 30/04/2026</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<button type="button" class={getKpiCardClass('on-time')} onclick={() => (selectedKpiFilter = 'on-time')}>
				<div class="text-3xl leading-8 font-medium">{onTimeRate}%</div>
				<p class="mt-2 text-[13px] text-[#687976]">On time rate</p>
			</button>
			<button type="button" class={getKpiCardClass('present')} onclick={() => (selectedKpiFilter = 'present')}>
				<div class="flex items-center justify-between">
					<div class="text-3xl leading-8 font-medium">{presentTotalCount}<span class="ml-1 text-base text-[#8D8D8D]">/1400</span></div>
					<div class="text-3xl leading-8 font-medium">{searchFilteredAttendanceRecords.length ? Math.round((presentTotalCount / searchFilteredAttendanceRecords.length) * 100) : 0}%</div>
				</div>
				<p class="mt-2 text-[13px] text-[#687976]">Present</p>
			</button>
			<button type="button" class={getKpiCardClass('absent')} onclick={() => (selectedKpiFilter = 'absent')}>
				<div class="flex items-center justify-between">
					<div class="text-3xl leading-8 font-medium">{absentCount}<span class="ml-1 text-base text-[#8D8D8D]">/160</span></div>
					<div class="text-3xl leading-8 font-medium">{searchFilteredAttendanceRecords.length ? Math.round((absentCount / searchFilteredAttendanceRecords.length) * 100) : 0}%</div>
				</div>
				<p class="mt-2 text-[13px] text-[#687976]">Absent</p>
			</button>
			<button type="button" class={getKpiCardClass('on-leave')} onclick={() => (selectedKpiFilter = 'on-leave')}>
				<div class="flex items-center justify-between">
					<div class="text-3xl leading-8 font-medium">{onLeaveCount}<span class="ml-1 text-base text-[#8D8D8D]">/1400</span></div>
					<div class="text-3xl leading-8 font-medium">{searchFilteredAttendanceRecords.length ? Math.round((onLeaveCount / searchFilteredAttendanceRecords.length) * 100) : 0}%</div>
				</div>
				<p class="mt-2 text-[13px] text-[#687976]">On Leave</p>
			</button>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="relative w-full max-w-[320px]">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#859693]" />
				<Input
					class="h-8 border-[#D4D9D9] pl-9 text-[13px]"
					placeholder="Search by ID, Name, Position"
					bind:value={searchQuery}
				/>
			</div>
			<Button variant="outline" class="h-8 border-[#EBEEEE] text-sm text-[#222626]">
				<Download class="mr-2 h-4 w-4" />
				Download in excel
			</Button>
		</div>
	</div>

	<div class="rounded-md border border-[#EBEEEE] bg-white">
		<Table>
			<TableHeader>
				<TableRow class="bg-[#FBF9F8]">
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Employee</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Date</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Branch</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Punch In</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Punch Out</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Working Hours</TableHead>
					<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Status</TableHead>
					<TableHead class="h-9 text-right text-[13px] leading-5 font-normal text-[#687976]">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each filteredAttendanceRecords as record}
					<TableRow>
						<TableCell class="text-[13px] leading-5 font-medium">{record.name}</TableCell>
						<TableCell class="text-[13px] leading-5">{record.date}</TableCell>
						<TableCell class="text-[13px] leading-5">{record.branch}</TableCell>
						<TableCell class="text-[13px] leading-5">{record.punchIn}</TableCell>
						<TableCell class="text-[13px] leading-5">{record.punchOut}</TableCell>
						<TableCell class="text-[13px] leading-5">{record.workingHours}</TableCell>
						<TableCell>
							<Badge
								variant={record.status === 'Present'
									? 'secondary'
									: record.status === 'Late'
										? 'outline'
										: record.status === 'On Leave'
											? 'outline'
											: 'destructive'}
								class={record.status === 'On Leave' ? 'border-[#A855F7] text-[#A855F7]' : undefined}
							>
								{record.status}
							</Badge>
						</TableCell>
						<TableCell class="text-right">
							<Button
								variant="ghost"
								size="sm"
								class="h-6 border border-[#EBEEEE] text-xs text-[#222626]"
								onclick={() => openCorrection(record)}
							>
								Correct
							</Button>
						</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	</div>
</div>

<Dialog.Root bind:open={correctionDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Attendance Correction</Dialog.Title>
			<Dialog.Description>
				Manually override the biometric punch-in time for {selectedRecord?.name}.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="time">Corrected Punch-In Time</Label>
				<Input id="time" type="time" bind:value={correctionTime} />
			</div>
			<div class="space-y-2">
				<Label for="reason">Reason for Correction</Label>
				<Input id="reason" placeholder="e.g. Biometric device failure" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (correctionDialogOpen = false)}>Cancel</Button>
			<Button onclick={applyCorrection}>Apply Correction</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
