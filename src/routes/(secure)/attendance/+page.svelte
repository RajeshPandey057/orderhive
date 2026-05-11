<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Download, Search } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { correctAttendance, syncAttendance } from '../hr/hr.remote';

	let {
		data
	}: {
		data: { attendanceRecords: AttendanceLog[]; employeeCount: number };
	} = $props();

	let correctionDialogOpen = $state(false);
	let selectedRecord = $state<AttendanceLog | null>(null);
	let correctionTime = $state('10:00');
	let correctionPunchOut = $state('');
	let correctionReason = $state('');
	let filterPeriod = $state('monthly');
	let searchQuery = $state('');
	let selectedKpiFilter = $state<'all' | 'on-time' | 'present' | 'absent' | 'on-leave'>('all');
	let saving = $state(false);
	let syncing = $state(false);

	const attendanceRecords = $derived(data.attendanceRecords ?? []);
	const searchFilteredAttendanceRecords = $derived(
		attendanceRecords.filter((record) => {
			const q = searchQuery.trim().toLowerCase();
			if (!q) return true;
			return (
				record.employeeName.toLowerCase().includes(q) ||
				record.employeeEmail.toLowerCase().includes(q) ||
				(record.branch ?? '').toLowerCase().includes(q) ||
				record.date.toLowerCase().includes(q)
			);
		})
	);
	const presentCount = $derived(
		searchFilteredAttendanceRecords.filter((record) => record.status === 'present').length
	);
	const absentCount = $derived(
		searchFilteredAttendanceRecords.filter((record) => record.status === 'absent').length
	);
	const onLeaveCount = $derived(
		searchFilteredAttendanceRecords.filter((record) => record.status === 'on-leave').length
	);
	const presentTotalCount = $derived(
		searchFilteredAttendanceRecords.filter(
			(record) => record.status === 'present' || record.status === 'late'
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
			if (selectedKpiFilter === 'on-time') return record.status === 'present';
			if (selectedKpiFilter === 'present')
				return record.status === 'present' || record.status === 'late';
			if (selectedKpiFilter === 'absent') return record.status === 'absent';
			return record.status === 'on-leave';
		})
	);

	function openCorrection(record: AttendanceLog) {
		selectedRecord = record;
		correctionTime = record.punchIn || '10:00';
		correctionPunchOut = record.punchOut || '';
		correctionReason = '';
		correctionDialogOpen = true;
	}

	async function applyCorrection() {
		if (!selectedRecord) return;
		saving = true;
		try {
			await correctAttendance({
				id: selectedRecord.id,
				employeeEmail: selectedRecord.employeeEmail,
				date: selectedRecord.date,
				punchIn: correctionTime,
				punchOut: correctionPunchOut,
				reason: correctionReason
			});
			toast.success('Attendance corrected');
			correctionDialogOpen = false;
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to correct attendance');
		} finally {
			saving = false;
		}
	}

	async function handleSync() {
		syncing = true;
		try {
			const result = await syncAttendance({ rows: [] });
			toast.success(`Biometric sync completed. Imported ${result.imported ?? 0} row(s).`);
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to sync attendance');
		} finally {
			syncing = false;
		}
	}

	function getKpiCardClass(filter: 'on-time' | 'present' | 'absent' | 'on-leave') {
		return selectedKpiFilter === filter
			? 'rounded-md border border-[#F04C06] bg-[#FFF0DE] p-4 text-left'
			: 'rounded-md border border-[#EBEEEE] p-4 text-left hover:bg-[#FBF9F8]';
	}

	function formatStatus(status: AttendanceStatus) {
		return status.replace('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
	}

	function minutesToDuration(minutes?: number) {
		const safe = Math.max(0, Number(minutes ?? 0));
		const hours = Math.floor(safe / 60);
		const mins = safe % 60;
		return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
	}
</script>

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl leading-8 font-medium">Attendance Management</h1>
			<p class="text-[13px] leading-5 text-[#687976]">
				Monitor daily punch-ins and handle audited corrections.
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" class="h-8 border-[#EBEEEE] text-sm text-[#222626]"
				>Export Logs</Button
			>
			<Button
				class="h-8 border border-black/5 bg-[#222626] text-sm text-white"
				onclick={handleSync}
				disabled={syncing}
			>
				{syncing ? 'Syncing...' : 'Sync Biometric'}
			</Button>
		</div>
	</div>

	<div class="space-y-4">
		<div class="flex flex-wrap items-center gap-3">
			<Select.Root type="single" bind:value={filterPeriod}>
				<Select.Trigger class="h-8 w-[140px]">{filterPeriod}</Select.Trigger>
				<Select.Content>
					<Select.Item value="weekly">Weekly</Select.Item>
					<Select.Item value="monthly">Monthly</Select.Item>
					<Select.Item value="yearly">Yearly</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
			<button
				type="button"
				class={getKpiCardClass('on-time')}
				onclick={() => (selectedKpiFilter = 'on-time')}
			>
				<div class="text-3xl leading-8 font-medium">{onTimeRate}%</div>
				<p class="mt-2 text-[13px] text-[#687976]">On time rate</p>
			</button>
			<button
				type="button"
				class={getKpiCardClass('present')}
				onclick={() => (selectedKpiFilter = 'present')}
			>
				<div class="flex items-center justify-between">
					<div class="text-3xl leading-8 font-medium">
						{presentTotalCount}<span class="ml-1 text-base text-[#8D8D8D]"
							>/{data.employeeCount}</span
						>
					</div>
					<div class="text-3xl leading-8 font-medium">
						{searchFilteredAttendanceRecords.length
							? Math.round((presentTotalCount / searchFilteredAttendanceRecords.length) * 100)
							: 0}%
					</div>
				</div>
				<p class="mt-2 text-[13px] text-[#687976]">Present</p>
			</button>
			<button
				type="button"
				class={getKpiCardClass('absent')}
				onclick={() => (selectedKpiFilter = 'absent')}
			>
				<div class="flex items-center justify-between">
					<div class="text-3xl leading-8 font-medium">
						{absentCount}<span class="ml-1 text-base text-[#8D8D8D]">/{data.employeeCount}</span>
					</div>
					<div class="text-3xl leading-8 font-medium">
						{searchFilteredAttendanceRecords.length
							? Math.round((absentCount / searchFilteredAttendanceRecords.length) * 100)
							: 0}%
					</div>
				</div>
				<p class="mt-2 text-[13px] text-[#687976]">Absent</p>
			</button>
			<button
				type="button"
				class={getKpiCardClass('on-leave')}
				onclick={() => (selectedKpiFilter = 'on-leave')}
			>
				<div class="flex items-center justify-between">
					<div class="text-3xl leading-8 font-medium">
						{onLeaveCount}<span class="ml-1 text-base text-[#8D8D8D]">/{data.employeeCount}</span>
					</div>
					<div class="text-3xl leading-8 font-medium">
						{searchFilteredAttendanceRecords.length
							? Math.round((onLeaveCount / searchFilteredAttendanceRecords.length) * 100)
							: 0}%
					</div>
				</div>
				<p class="mt-2 text-[13px] text-[#687976]">On Leave</p>
			</button>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="relative w-full max-w-[320px]">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#859693]" />
				<Input
					class="h-8 border-[#D4D9D9] pl-9 text-[13px]"
					placeholder="Search by name, branch, date"
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
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Employee</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Date</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Branch</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Punch In</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Punch Out</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Working Hours</TableHead>
					<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Status</TableHead>
					<TableHead class="h-9 text-right text-[13px] font-normal text-[#687976]"
						>Actions</TableHead
					>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#if filteredAttendanceRecords.length === 0}
					<TableRow>
						<TableCell colspan={8} class="h-24 text-center text-[13px] text-[#687976]"
							>No attendance records found.</TableCell
						>
					</TableRow>
				{:else}
					{#each filteredAttendanceRecords as record (record.id)}
						<TableRow>
							<TableCell class="text-[13px] font-medium"
								>{record.employeeName || record.employeeEmail}</TableCell
							>
							<TableCell class="text-[13px]">{record.date}</TableCell>
							<TableCell class="text-[13px]">{record.branch || '-'}</TableCell>
							<TableCell class="text-[13px]">{record.punchIn || '-'}</TableCell>
							<TableCell class="text-[13px]">{record.punchOut || '-'}</TableCell>
							<TableCell class="text-[13px]">{minutesToDuration(record.workingMinutes)}</TableCell>
							<TableCell>
								<Badge
									variant={record.status === 'present'
										? 'secondary'
										: record.status === 'late' || record.status === 'on-leave'
											? 'outline'
											: 'destructive'}
								>
									{formatStatus(record.status)}
								</Badge>
							</TableCell>
							<TableCell class="text-right">
								<Button
									variant="ghost"
									size="sm"
									class="h-6 border border-[#EBEEEE] text-xs"
									onclick={() => openCorrection(record)}
								>
									Correct
								</Button>
							</TableCell>
						</TableRow>
					{/each}
				{/if}
			</TableBody>
		</Table>
	</div>
</div>

<Dialog.Root bind:open={correctionDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Attendance Correction</Dialog.Title>
			<Dialog.Description>
				Override punch times for {selectedRecord?.employeeName || selectedRecord?.employeeEmail}.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="time">Corrected Punch-In</Label>
					<Input id="time" type="time" bind:value={correctionTime} />
				</div>
				<div class="space-y-2">
					<Label for="out-time">Corrected Punch-Out</Label>
					<Input id="out-time" type="time" bind:value={correctionPunchOut} />
				</div>
			</div>
			<div class="space-y-2">
				<Label for="reason">Reason for Correction</Label>
				<Input
					id="reason"
					placeholder="e.g. Biometric device failure"
					bind:value={correctionReason}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (correctionDialogOpen = false)}>Cancel</Button>
			<Button onclick={applyCorrection} disabled={saving}
				>{saving ? 'Saving...' : 'Apply Correction'}</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
