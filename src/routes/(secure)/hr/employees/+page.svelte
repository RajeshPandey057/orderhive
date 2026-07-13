<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import EmployeeProfileView from '$lib/components/hr/employee-profile-view.svelte';
	import OnboardingForm from '$lib/components/hr/onboarding-form.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Sheet from '$lib/components/ui/sheet';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Download, Search, ShieldOff, UserPlus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { archiveEmployee, disableEmployeeAccess } from '../hr.remote';

	type EmployeeDirectoryFilter =
		| 'all'
		| 'active'
		| 'archived'
		| 'admin'
		| 'agent'
		| 'finance'
		| 'compliance'
		| 'manager'
		| 'senior-manager'
		| 'access-only';

	type EmployeePagination = {
		page: number;
		pageSize: number;
		totalCount: number;
		totalPages: number;
		filter: EmployeeDirectoryFilter;
		search: string;
	};

	let { data } = $props<{
		data: {
			employees: Employee[];
			pagination: EmployeePagination;
			user: { role?: string } | null;
		};
	}>();

	let employeeSheetOpen = $state(false);
	let profileSheetOpen = $state(false);
	let selectedEmployee = $state<Employee | null>(null);
	let profileEmployee = $state<Employee | null>(null);
	let searchQuery = $state('');
	let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let exportingEmployees = $state(false);
	let busyEmail = $state('');

	const employees: Employee[] = $derived(data.employees ?? []);
	const pagination = $derived(data.pagination);
	const selectedFilter = $derived(pagination.filter);
	const totalEmployees = $derived(pagination.totalCount);
	const activeEmployees = $derived(employees.filter((e) => e.status === 'active' && e.code).length);
	const accessOnlyCount = $derived(
		employees.filter((e) => !e.code && e.accessStatus === 'enabled').length
	);
	const enabledAccessCount = $derived(employees.filter((e) => e.accessStatus === 'enabled').length);
	const pageStart = $derived(
		pagination.totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
	);
	const pageEnd = $derived(Math.min(pagination.page * pagination.pageSize, pagination.totalCount));
	const canExportEmployees = $derived(
		data.user?.role === 'admin' || data.user?.role === 'super-admin'
	);

	const filteredEmployees = $derived(employees);

	$effect(() => {
		if (searchDebounceTimer) return;
		const serverSearch = pagination.search ?? '';
		if (searchQuery !== serverSearch) searchQuery = serverSearch;
	});

	const filterOptions = [
		{ value: 'all', label: 'All' },
		{ value: 'active', label: 'Active' },
		{ value: 'archived', label: 'Archived' },
		{ value: 'admin', label: 'Admin' },
		{ value: 'agent', label: 'Agent' },
		{ value: 'finance', label: 'Finance' },
		{ value: 'compliance', label: 'Compliance' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'senior-manager', label: 'Senior Manager' },
		{ value: 'access-only', label: 'Access Only' }
	] as const;

	function employeePageUrl(page: number, filter: EmployeeDirectoryFilter = selectedFilter) {
		const params = new URLSearchParams();
		const q = searchQuery.trim();
		if (page > 1) params.set('page', String(page));
		if (filter !== 'all') params.set('filter', filter);
		if (q) params.set('q', q);
		const query = params.toString();
		return query ? `/hr/employees?${query}` : '/hr/employees';
	}

	async function changeFilter(filter: EmployeeDirectoryFilter) {
		await goto(employeePageUrl(1, filter));
	}

	function handleSearchInput(value: string) {
		searchQuery = value;
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(async () => {
			await goto(employeePageUrl(1));
			searchDebounceTimer = undefined;
		}, 300);
	}

	function openCreate() {
		selectedEmployee = null;
		employeeSheetOpen = true;
	}

	function openEdit(employee: Employee) {
		selectedEmployee = employee;
		employeeSheetOpen = true;
	}

	function openProfile(employee: Employee) {
		profileEmployee = employee;
		profileSheetOpen = true;
	}

	async function handleArchive(employee: Employee) {
		busyEmail = employee.email;
		try {
			await archiveEmployee({
				email: employee.email,
				lastWorkingDay: employee.lastWorkingDay ?? ''
			});
			toast.success('Employee archived');
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to archive employee');
		} finally {
			busyEmail = '';
		}
	}

	async function handleDisableAccess(employee: Employee) {
		busyEmail = employee.email;
		try {
			await disableEmployeeAccess({ email: employee.email });
			toast.success('Access disabled');
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to disable access');
		} finally {
			busyEmail = '';
		}
	}

	async function exportEmployees() {
		if (exportingEmployees) return;

		exportingEmployees = true;
		try {
			const res = await fetch('/api/admin/employees-export');

			if (!res.ok) {
				toast.error('Failed to export employee list');
				return;
			}

			const blob = await res.blob();
			const today = new Date().toISOString().slice(0, 10);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `employee-directory-${today}.csv`;
			a.click();
			URL.revokeObjectURL(url);

			toast.success('Employee list exported successfully');
		} catch {
			toast.error('Failed to export employee list');
		} finally {
			exportingEmployees = false;
		}
	}

	function accessLabel(employee: Employee) {
		if (employee.accessStatus === 'missing') return 'No Access';
		if (employee.accessStatus === 'disabled') return 'Disabled';
		return employee.accessType?.replaceAll('-', ' ') ?? 'Enabled';
	}
</script>

<Sheet.Root bind:open={employeeSheetOpen}>
	<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<div>
					<h1 class="text-2xl leading-8 font-medium">Employees & Access Mgmt</h1>
					<p class="text-[13px] leading-5 text-[#687976]">
						Manage HR profiles and platform access from one backend-driven view.
					</p>
				</div>
			</div>
			<div class="flex flex-wrap items-center justify-end gap-2">
				{#if canExportEmployees}
					<Button
						variant="outline"
						class="h-8 border-[#EBEEEE] px-3 text-sm font-normal"
						onclick={exportEmployees}
						disabled={exportingEmployees}
					>
						<Download class="mr-2 h-4 w-4" />
						{exportingEmployees ? 'Exporting...' : 'Export Employee List'}
					</Button>
				{/if}
				<Button
					class="h-8 border border-black/5 bg-[#222626] px-3 text-sm font-normal text-white"
					onclick={openCreate}
				>
					<UserPlus class="mr-2 h-4 w-4" />
					Add Employee
				</Button>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2"
					><CardTitle class="text-[13px] font-normal text-[#687976]">Records</CardTitle></CardHeader
				>
				<CardContent><div class="text-2xl leading-8 font-medium">{totalEmployees}</div></CardContent
				>
			</Card>
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2"
					><CardTitle class="text-[13px] font-normal text-[#687976]">Active on Page</CardTitle
					></CardHeader
				>
				<CardContent
					><div class="text-2xl leading-8 font-medium">{activeEmployees}</div></CardContent
				>
			</Card>
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2"
					><CardTitle class="text-[13px] font-normal text-[#687976]"
						>Access Enabled on Page</CardTitle
					></CardHeader
				>
				<CardContent
					><div class="text-2xl leading-8 font-medium">{enabledAccessCount}</div></CardContent
				>
			</Card>
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2"
					><CardTitle class="text-[13px] font-normal text-[#687976]">Access Only on Page</CardTitle
					></CardHeader
				>
				<CardContent
					><div class="text-2xl leading-8 font-medium">{accessOnlyCount}</div></CardContent
				>
			</Card>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="relative min-w-[260px] flex-1">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#859693]" />
				<Input
					class="h-8 border-[#D4D9D9] pl-10 text-[13px]"
					placeholder="Search employees, roles, or email..."
					value={searchQuery}
					oninput={(event) => handleSearchInput((event.target as HTMLInputElement).value)}
				/>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each filterOptions as option (option.value)}
					<Button
						variant={selectedFilter === option.value ? 'default' : 'outline'}
						size="sm"
						class={selectedFilter === option.value
							? 'h-8 bg-[#222626] text-white'
							: 'h-8 border-[#EBEEEE]'}
						onclick={() => changeFilter(option.value)}
					>
						{option.label}
					</Button>
				{/each}
			</div>
		</div>

		<div class="overflow-hidden rounded-md border border-[#EBEEEE] bg-white">
			<Table>
				<TableHeader>
					<TableRow class="bg-[#FBF9F8]">
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Employee</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Code</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Department</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Branch</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Status</TableHead>
						<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Access</TableHead>
						<TableHead class="h-9 text-right text-[13px] font-normal text-[#687976]"
							>Actions</TableHead
						>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#if filteredEmployees.length === 0}
						<TableRow>
							<TableCell colspan={7} class="h-24 text-center text-[13px] text-[#687976]">
								No employees or access records found.
							</TableCell>
						</TableRow>
					{:else}
						{#each filteredEmployees as employee (employee.email)}
							<TableRow
								class="h-13 cursor-pointer hover:bg-[#FBF9F8]"
								onclick={() => openProfile(employee)}
							>
								<TableCell>
									<div class="flex flex-col">
										<span class="text-[13px] font-medium text-[#222626]">{employee.name}</span>
										<span class="text-[13px] text-[#687976]">{employee.email}</span>
									</div>
								</TableCell>
								<TableCell class="text-[13px] text-[#222626]"
									>{employee.code || 'Access only'}</TableCell
								>
								<TableCell class="text-[13px] text-[#222626]">
									<div class="flex flex-col">
										<span>{employee.department || '-'}</span>
										<span class="text-[#687976]">{employee.designation || '-'}</span>
									</div>
								</TableCell>
								<TableCell class="text-[13px] text-[#222626]">{employee.location || '-'}</TableCell>
								<TableCell>
									<Badge
										variant={employee.status === 'active' ? 'secondary' : 'outline'}
										class="capitalize"
									>
										{employee.status}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge
										variant={employee.accessStatus === 'enabled' ? 'secondary' : 'outline'}
										class="capitalize"
									>
										{accessLabel(employee)}
									</Badge>
								</TableCell>
								<TableCell class="text-right" onclick={(event) => event.stopPropagation()}>
									<Button
										variant="ghost"
										size="sm"
										class="h-6 border border-[#EBEEEE] text-xs"
										onclick={(event) => {
											event.stopPropagation();
											openEdit(employee);
										}}
									>
										{employee.code ? 'Edit' : 'Complete Profile'}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="h-6 border border-[#EBEEEE] text-xs text-[#DC2626]"
										disabled={busyEmail === employee.email || employee.status === 'archived'}
										onclick={(event) => {
											event.stopPropagation();
											handleArchive(employee);
										}}
									>
										Archive
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="h-6 border border-[#EBEEEE] text-xs text-[#DC2626]"
										disabled={busyEmail === employee.email || employee.accessStatus !== 'enabled'}
										onclick={(event) => {
											event.stopPropagation();
											handleDisableAccess(employee);
										}}
									>
										<ShieldOff class="mr-1 h-3 w-3" />
										Disable
									</Button>
								</TableCell>
							</TableRow>
						{/each}
					{/if}
				</TableBody>
			</Table>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-[13px] text-[#687976]">
				Showing {pageStart}-{pageEnd} of {pagination.totalCount} records
			</p>
			<Pagination.Root
				count={pagination.totalCount}
				perPage={pagination.pageSize}
				page={pagination.page}
				onPageChange={(page) => goto(employeePageUrl(page))}
				class="mx-0 w-auto"
			>
				{#snippet children({ pages, currentPage })}
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.Previous />
						</Pagination.Item>
						{#each pages as page (page.key)}
							{#if page.type === 'ellipsis'}
								<Pagination.Item>
									<Pagination.Ellipsis />
								</Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link {page} isActive={currentPage === page.value}>
										{page.value}
									</Pagination.Link>
								</Pagination.Item>
							{/if}
						{/each}
						<Pagination.Item>
							<Pagination.Next />
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>
	</div>

	<Sheet.Content side="right" class="w-[60vw] max-w-[60vw] overflow-y-auto p-0 sm:max-w-[60vw]">
		<OnboardingForm employee={selectedEmployee} onSaved={() => (employeeSheetOpen = false)} />
	</Sheet.Content>
</Sheet.Root>

<Sheet.Root bind:open={profileSheetOpen}>
	<Sheet.Content side="right" class="w-[70vw] max-w-[70vw] overflow-y-auto p-0 sm:max-w-[70vw]">
		<EmployeeProfileView employee={profileEmployee} />
	</Sheet.Content>
</Sheet.Root>
