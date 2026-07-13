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
	import {
		formatDateInput,
		getPeriodRange,
		parseDateInput,
		type DateFilterPeriod
	} from '$lib/date-period';
	import { Download, Radio, Search } from '@lucide/svelte';
	import { collection, getFirestore, onSnapshot, orderBy, query, where } from 'firebase/firestore';
	import { toast } from 'svelte-sonner';
	import { correctAttendance, reconcileAttendance, syncUnprocessed } from '../hr/hr.remote';

	let {
		data
	}: {
		data: {
			attendanceRecords: AttendanceLog[];
			employeeCount: number;
			activeEmployees: Array<Pick<Employee, 'email' | 'name' | 'code' | 'location'>>;
		};
	} = $props();

	type KpiFilter = 'all' | 'attended' | 'late' | 'on-leave' | 'absent' | 'not-recorded';
	type AttendanceTableRecord = AttendanceLog & { inferredStatus?: 'not-recorded' };

	// ── Tab state ───────────────────────────────────────────────────────────────
	let activeTab = $state<'attendance' | 'punch-log'>('attendance');

	// ── Punch Log: real-time state ───────────────────────────────────────────────
	function todayStr() {
		return formatDateInput(new Date());
	}
	let punchDate = $state(todayStr());
	let punchLogs = $state<BiometricPunch[]>([]);
	let punchLoading = $state(false);
	let punchSearch = $state('');

	$effect(() => {
		const db = getFirestore();
		const q = query(
			collection(db, 'biometricPunches'),
			where('date', '==', punchDate),
			orderBy('timeStr', 'desc')
		);
		punchLoading = true;
		const unsub = onSnapshot(
			q,
			(snap) => {
				punchLogs = snap.docs.map((doc) => {
					const d = doc.data();
					return {
						id: doc.id,
						deviceSn: d.deviceSn ?? '',
						deviceUserId: d.deviceUserId ?? '',
						employeeEmail: d.employeeEmail ?? null,
						employeeName: d.employeeName ?? null,
						date: d.date ?? '',
						timeStr: d.timeStr ?? '',
						timestamp: d.timestamp ?? '',
						inOutMode: typeof d.inOutMode === 'number' ? d.inOutMode : 0,
						verifyType: typeof d.verifyType === 'number' ? d.verifyType : 0,
						processed: d.processed === true,
						branch: d.branch ?? undefined
					} satisfies BiometricPunch;
				});
				punchLoading = false;
			},
			(err) => {
				console.error('[PunchLog] Firestore listener error:', err);
				punchLoading = false;
			}
		);
		return unsub;
	});

	const inOutLabel: Record<number, string> = {
		0: 'Check In',
		1: 'Check Out',
		2: 'Break Out',
		3: 'Break In',
		4: 'OT In',
		5: 'OT Out'
	};
	const verifyLabel: Record<number, string> = {
		1: 'Fingerprint',
		2: 'Password',
		3: 'Card',
		15: 'Face'
	};

	const filteredPunchLogs = $derived(
		punchLogs.filter((p) => {
			const q = punchSearch.trim().toLowerCase();
			if (!q) return true;
			return (
				(p.employeeName ?? '').toLowerCase().includes(q) ||
				(p.employeeEmail ?? '').toLowerCase().includes(q) ||
				p.deviceUserId.toLowerCase().includes(q)
			);
		})
	);
	const resolvedCount = $derived(punchLogs.filter((p) => p.employeeEmail !== null).length);
	const unresolvedCount = $derived(punchLogs.filter((p) => p.employeeEmail === null).length);

	// ── Attendance correction state ───────────────────────────────────────────────
	let correctionDialogOpen = $state(false);
	let selectedRecord = $state<AttendanceLog | null>(null);
	let correctionTime = $state('10:00');
	let correctionPunchOut = $state('');
	let correctionReason = $state('');
	let filterPeriod = $state<DateFilterPeriod>('today');
	let searchQuery = $state('');
	let selectedAttendanceDate = $state(todayStr());
	let customRangeFrom = $state(todayStr());
	let customRangeTo = $state(todayStr());
	let selectedKpiFilter = $state<KpiFilter>('all');
	let saving = $state(false);
	let syncing = $state(false);

	// ── Period range helper ───────────────────────────────────────────────────────
	const attendanceRecords = $derived(data.attendanceRecords ?? []);
	const activeEmployees = $derived(data.activeEmployees ?? []);
	const selectedRange = $derived.by(() => {
		const refDate =
			filterPeriod === 'this-month'
				? new Date()
				: parseDateInput(selectedAttendanceDate || todayStr());
		return getPeriodRange(filterPeriod, refDate, customRangeFrom, customRangeTo);
	});

	// Period-filtered base. This is also the source for CSV exports.
	const periodFilteredRecords = $derived.by(() => {
		const { start, end } = selectedRange;
		return attendanceRecords.filter((r) => r.date >= start && r.date <= end);
	});

	// Search applied on top — does not skew KPI numbers
	const searchFilteredRecords = $derived(
		periodFilteredRecords.filter((record) => matchesAttendanceSearch(record))
	);

	// ── KPI derivations — unique employees, not raw row counts ───────────────────
	const uniqueAttendedSet = $derived(
		new Set(
			periodFilteredRecords
				.filter((r) => r.status === 'present' || r.status === 'late')
				.map((r) => r.employeeEmail)
		)
	);
	const uniqueLateSet = $derived(
		new Set(periodFilteredRecords.filter((r) => r.status === 'late').map((r) => r.employeeEmail))
	);
	const lateInstances = $derived(periodFilteredRecords.filter((r) => r.status === 'late').length);
	// Employees with any record in the period (present, late, on-leave, absent)
	const uniqueAnyRecordSet = $derived(new Set(periodFilteredRecords.map((r) => r.employeeEmail)));
	const notRecordedRows = $derived.by((): AttendanceTableRecord[] => {
		const { start, end } = selectedRange;
		const displayDate = start === end ? start : `${start} to ${end}`;
		return activeEmployees
			.filter((employee) => !uniqueAnyRecordSet.has(employee.email))
			.map((employee) => ({
				id: `not-recorded-${employee.email}-${start}-${end}`,
				employeeEmail: employee.email,
				employeeName: employee.name || employee.email,
				employeeCode: employee.code,
				date: displayDate,
				branch: employee.location,
				punchIn: '',
				punchOut: '',
				workingMinutes: 0,
				status: 'absent',
				inferredStatus: 'not-recorded'
			}));
	});
	const unaccountedCount = $derived(notRecordedRows.length);
	const absentCount = $derived(periodFilteredRecords.filter((r) => r.status === 'absent').length);
	const attendanceRate = $derived(
		data.employeeCount > 0 ? Math.round((uniqueAttendedSet.size / data.employeeCount) * 100) : 0
	);
	const avgWorkingMinutes = $derived.by(() => {
		const valid = periodFilteredRecords.filter((r) => (r.workingMinutes ?? 0) > 0);
		if (!valid.length) return 0;
		return Math.round(valid.reduce((sum, r) => sum + (r.workingMinutes ?? 0), 0) / valid.length);
	});

	const searchFilteredNotRecordedRows = $derived(
		notRecordedRows.filter((record) => matchesAttendanceSearch(record))
	);

	// Table rows: search + KPI card filter
	const filteredAttendanceRecords = $derived.by((): AttendanceTableRecord[] => {
		if (selectedKpiFilter === 'not-recorded') return searchFilteredNotRecordedRows;
		return searchFilteredRecords.filter((record) => {
			if (selectedKpiFilter === 'all') return true;
			if (selectedKpiFilter === 'attended')
				return record.status === 'present' || record.status === 'late';
			if (selectedKpiFilter === 'late') return record.status === 'late';
			if (selectedKpiFilter === 'absent') return record.status === 'absent';
			return record.status === 'on-leave';
		});
	});

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
			const syncResult = await syncUnprocessed({});
			const reconcileResult = await reconcileAttendance({});
			toast.success(
				`Done — resolved ${syncResult.synced ?? 0} punch(es), reconciled ${reconcileResult.reconciled ?? 0} employee(s).`
			);
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to sync attendance');
		} finally {
			syncing = false;
		}
	}

	function getKpiCardClass(filter: Exclude<KpiFilter, 'all'>) {
		return selectedKpiFilter === filter
			? 'rounded-md border border-[#F04C06] bg-[#FFF0DE] p-4 text-left'
			: 'rounded-md border border-[#EBEEEE] p-4 text-left hover:bg-[#FBF9F8]';
	}

	function matchesAttendanceSearch(
		record: Pick<AttendanceLog, 'employeeName' | 'employeeEmail' | 'branch' | 'date'>
	) {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return true;
		return (
			record.employeeName.toLowerCase().includes(q) ||
			record.employeeEmail.toLowerCase().includes(q) ||
			(record.branch ?? '').toLowerCase().includes(q) ||
			record.date.toLowerCase().includes(q)
		);
	}

	async function downloadCSV() {
		const { start, end } = selectedRange;
		try {
			const res = await fetch(
				`/api/attendance-csv?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
			);
			if (!res.ok) {
				toast.error('Failed to export attendance');
				return;
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `attendance-${start}-to-${end}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			toast.error('Failed to export attendance');
		}
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
		<div class="flex items-center gap-2">
			<div>
				<h1 class="text-2xl leading-8 font-medium">Attendance Management</h1>
				<p class="text-[13px] leading-5 text-[#687976]">
					Monitor daily punch-ins and handle audited corrections.
				</p>
			</div>
		</div>
		<div class="flex gap-2">
			<Button
				type="button"
				variant="outline"
				class="h-8 border-[#EBEEEE] text-sm text-[#222626]"
				onclick={downloadCSV}>Export Logs</Button
			>
			<Button
				class="h-8 border border-black/5 bg-[#222626] text-sm text-white"
				onclick={handleSync}
				disabled={syncing}
			>
				{syncing ? 'Syncing...' : 'Sync & Reconcile'}
			</Button>
		</div>
	</div>

	<!-- Tab switcher -->
	<div class="flex items-center border-b border-[#EBEEEE]">
		<button
			type="button"
			class={activeTab === 'attendance'
				? 'border-b-2 border-[#222626] px-4 pb-3 text-sm font-medium text-[#222626]'
				: 'px-4 pb-3 text-sm font-normal text-[#687976] hover:text-[#222626]'}
			onclick={() => (activeTab = 'attendance')}
		>
			Attendance Records
		</button>
		<button
			type="button"
			class={activeTab === 'punch-log'
				? 'flex items-center gap-2 border-b-2 border-[#222626] px-4 pb-3 text-sm font-medium text-[#222626]'
				: 'flex items-center gap-2 px-4 pb-3 text-sm font-normal text-[#687976] hover:text-[#222626]'}
			onclick={() => (activeTab = 'punch-log')}
		>
			<span>Punch Log</span>
			{#if activeTab === 'punch-log'}
				<span
					class="flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700"
				>
					<Radio class="h-2.5 w-2.5" />
					Live
				</span>
			{/if}
		</button>
	</div>

	{#if activeTab === 'attendance'}
		<div class="space-y-4">
			<div class="flex flex-wrap items-center gap-3">
				<Select.Root type="single" bind:value={filterPeriod}>
					<Select.Trigger class="h-8 w-35">
						{filterPeriod === 'today'
							? 'Today'
							: filterPeriod === 'this-month'
								? 'This Month'
								: 'Custom'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="today">Today</Select.Item>
						<Select.Item value="this-month">This Month</Select.Item>
						<Select.Item value="custom">Custom</Select.Item>
					</Select.Content>
				</Select.Root>
				{#if filterPeriod === 'today'}
					<Input
						type="date"
						class="h-8 w-40 border-[#D4D9D9] text-[13px]"
						bind:value={selectedAttendanceDate}
						max={todayStr()}
					/>
				{:else if filterPeriod === 'this-month'}
					<div
						class="flex h-8 items-center rounded-md border border-[#D4D9D9] px-3 text-[13px] text-[#687976]"
					>
						This Month
					</div>
				{:else}
					<div class="flex flex-wrap items-center gap-2">
						<Label for="attendance-range-from" class="text-[13px] text-[#687976]">From</Label>
						<Input
							id="attendance-range-from"
							type="date"
							class="h-8 w-40 border-[#D4D9D9] text-[13px]"
							bind:value={customRangeFrom}
							max={todayStr()}
						/>
						<Label for="attendance-range-to" class="text-[13px] text-[#687976]">To</Label>
						<Input
							id="attendance-range-to"
							type="date"
							class="h-8 w-40 border-[#D4D9D9] text-[13px]"
							bind:value={customRangeTo}
							max={todayStr()}
						/>
					</div>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
				<!-- Workforce Present -->
				<button
					type="button"
					class={getKpiCardClass('attended')}
					onclick={() =>
						(selectedKpiFilter = selectedKpiFilter === 'attended' ? 'all' : 'attended')}
				>
					<div class="flex items-baseline gap-1.5">
						<div class="text-3xl leading-8 font-medium">{uniqueAttendedSet.size}</div>
						<span class="text-base text-[#8D8D8D]">/ {data.employeeCount}</span>
					</div>
					<p class="mt-2 text-[13px] text-[#687976]">Workforce present</p>
					<p class="mt-0.5 text-[11px] text-[#8D8D8D]">{attendanceRate}% of workforce</p>
				</button>
				<!-- Late Employees -->
				<button
					type="button"
					class={getKpiCardClass('late')}
					onclick={() => (selectedKpiFilter = selectedKpiFilter === 'late' ? 'all' : 'late')}
				>
					<div class="text-3xl leading-8 font-medium">{uniqueLateSet.size}</div>
					<p class="mt-2 text-[13px] text-[#687976]">Late employees</p>
					<p class="mt-0.5 text-[11px] text-[#8D8D8D]">{lateInstances} total late instances</p>
				</button>
				<!-- Avg Working Hours -->
				<button
					type="button"
					class="rounded-md border border-[#EBEEEE] p-4 text-left hover:bg-[#FBF9F8]"
					onclick={() =>
						(selectedKpiFilter = selectedKpiFilter === 'attended' ? 'all' : 'attended')}
				>
					<div class="text-3xl leading-8 font-medium">{minutesToDuration(avgWorkingMinutes)}</div>
					<p class="mt-2 text-[13px] text-[#687976]">Avg working hours</p>
					<p class="mt-0.5 text-[11px] text-[#8D8D8D]">per day · vs 08:00 standard</p>
				</button>
				<!-- Not Recorded -->
				<button
					type="button"
					class={getKpiCardClass('not-recorded')}
					onclick={() =>
						(selectedKpiFilter = selectedKpiFilter === 'not-recorded' ? 'all' : 'not-recorded')}
				>
					<div class="flex items-baseline gap-1.5">
						<div class="text-3xl leading-8 font-medium">{unaccountedCount}</div>
						<span class="text-base text-[#8D8D8D]">/ {data.employeeCount}</span>
					</div>
					<p class="mt-2 text-[13px] text-[#687976]">Not recorded</p>
					<p class="mt-0.5 text-[11px] text-[#8D8D8D]">no attendance log in period</p>
				</button>
				<!-- Absent -->
				<button
					type="button"
					class={getKpiCardClass('absent')}
					onclick={() => (selectedKpiFilter = selectedKpiFilter === 'absent' ? 'all' : 'absent')}
				>
					<div class="text-3xl leading-8 font-medium text-red-600">{absentCount}</div>
					<p class="mt-2 text-[13px] text-[#687976]">Absent</p>
					<p class="mt-0.5 text-[11px] text-[#8D8D8D]">explicit absent records</p>
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
				<Button
					type="button"
					variant="outline"
					class="h-8 border-[#EBEEEE] text-sm text-[#222626]"
					onclick={downloadCSV}
				>
					<Download class="mr-2 h-4 w-4" />
					Download CSV
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
								<TableCell class="text-[13px]">{minutesToDuration(record.workingMinutes)}</TableCell
								>
								<TableCell>
									<div class="flex items-center gap-1.5">
										{#if record.inferredStatus === 'not-recorded'}
											<Badge variant="outline" class="border-[#D4D9D9] text-[#687976]"
												>Not recorded</Badge
											>
										{:else if record.status === 'late'}
											<Badge variant="secondary">Present</Badge>
											<Badge variant="outline" class="border-amber-200 bg-amber-50 text-amber-700"
												>Late</Badge
											>
										{:else}
											<Badge
												variant={record.status === 'present'
													? 'secondary'
													: record.status === 'on-leave'
														? 'outline'
														: 'destructive'}
											>
												{formatStatus(record.status)}
											</Badge>
										{/if}
										{#if record.source === 'biometric'}
											<Badge
												variant="outline"
												class="border-blue-200 bg-blue-50 text-[10px] text-blue-700"
											>
												Biometric
											</Badge>
										{/if}
									</div>
								</TableCell>
								<TableCell class="text-right">
									{#if record.inferredStatus !== 'not-recorded'}
										<Button
											variant="ghost"
											size="sm"
											class="h-6 border border-[#EBEEEE] text-xs"
											onclick={() => openCorrection(record)}
										>
											Correct
										</Button>
									{:else}
										<span class="text-xs text-[#8D8D8D]">-</span>
									{/if}
								</TableCell>
							</TableRow>
						{/each}
					{/if}
				</TableBody>
			</Table>
		</div>
	{:else}
		<!-- ── Punch Log (real-time Firestore listener) ─────────────────────── -->
		<div class="space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					<Input
						type="date"
						class="h-8 w-40 border-[#D4D9D9] text-[13px]"
						bind:value={punchDate}
						max={todayStr()}
					/>
					<div
						class="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700"
					>
						<span class="relative flex h-2 w-2">
							<span
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
							></span>
							<span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
						</span>
						Live
					</div>
				</div>
				<div class="relative w-full max-w-70">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#859693]" />
					<Input
						class="h-8 border-[#D4D9D9] pl-9 text-[13px]"
						placeholder="Search by name, email, or ID"
						bind:value={punchSearch}
					/>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
				<div class="rounded-md border border-[#EBEEEE] p-4">
					<div class="text-3xl leading-8 font-medium">{punchLogs.length}</div>
					<p class="mt-2 text-[13px] text-[#687976]">Total Punches</p>
				</div>
				<div class="rounded-md border border-[#EBEEEE] p-4">
					<div class="text-3xl leading-8 font-medium text-green-700">{resolvedCount}</div>
					<p class="mt-2 text-[13px] text-[#687976]">Resolved</p>
				</div>
				<div class="rounded-md border border-[#EBEEEE] p-4">
					<div class="text-3xl leading-8 font-medium text-amber-600">{unresolvedCount}</div>
					<p class="mt-2 text-[13px] text-[#687976]">Unresolved</p>
				</div>
			</div>
		</div>
		<div class="rounded-md border border-[#EBEEEE] bg-white">
			<Table>
				<TableHeader>
					<TableRow class="bg-[#FBF9F8]">
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Timestamp</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Employee ID</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Email</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Name</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Branch</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">In / Out</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Verify</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#if punchLoading}
						<TableRow>
							<TableCell colspan={8} class="h-24 text-center text-[13px] text-[#687976]">
								Loading punches…
							</TableCell>
						</TableRow>
					{:else if filteredPunchLogs.length === 0}
						<TableRow>
							<TableCell colspan={8} class="h-24 text-center text-[13px] text-[#687976]">
								{punchLogs.length === 0
									? `No punches recorded for ${punchDate}.`
									: 'No results match your search.'}
							</TableCell>
						</TableRow>
					{:else}
						{#each filteredPunchLogs as punch (punch.id)}
							<TableRow class={punch.employeeEmail === null ? 'bg-amber-50/40' : ''}>
								<TableCell class="font-mono text-[13px]">{punch.timeStr}</TableCell>
								<TableCell class="text-[13px] font-medium">{punch.deviceUserId}</TableCell>
								<TableCell class="max-w-45 truncate text-[13px]"
									>{punch.employeeEmail ?? '—'}</TableCell
								>
								<TableCell class="text-[13px]">{punch.employeeName ?? '—'}</TableCell>
								<TableCell class="text-[13px]">{punch.branch ?? '—'}</TableCell>
								<TableCell>
									<Badge
										variant="outline"
										class={punch.inOutMode === 0 || punch.inOutMode === 4
											? 'border-green-200 bg-green-50 text-green-700'
											: punch.inOutMode === 1 || punch.inOutMode === 5
												? 'border-blue-200 bg-blue-50 text-blue-700'
												: 'border-[#EBEEEE]'}
									>
										{inOutLabel[punch.inOutMode] ?? `Mode ${punch.inOutMode}`}
									</Badge>
								</TableCell>
								<TableCell class="text-[13px]">
									{verifyLabel[punch.verifyType] ?? `Type ${punch.verifyType}`}
								</TableCell>
								<TableCell>
									{#if punch.employeeEmail === null}
										<Badge
											variant="outline"
											class="border-amber-200 bg-amber-50 text-[11px] text-amber-700"
										>
											Unresolved
										</Badge>
									{:else}
										<Badge
											variant="outline"
											class="border-green-200 bg-green-50 text-[11px] text-green-700"
										>
											Resolved
										</Badge>
									{/if}
								</TableCell>
							</TableRow>
						{/each}
					{/if}
				</TableBody>
			</Table>
		</div>
	{/if}
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
