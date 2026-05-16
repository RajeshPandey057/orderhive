<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EmployeeProfileView from '$lib/components/hr/employee-profile-view.svelte';
	import OnboardingForm from '$lib/components/hr/onboarding-form.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Search, ShieldOff, UserPlus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { archiveEmployee, disableEmployeeAccess } from '../hr.remote';

	let { data } = $props<{ data: { employees: Employee[] } }>();

	let employeeSheetOpen = $state(false);
	let profileSheetOpen = $state(false);
	let selectedEmployee = $state<Employee | null>(null);
	let profileEmployee = $state<Employee | null>(null);
	let searchQuery = $state('');
	let selectedFilter = $state<
		| 'all'
		| 'active'
		| 'archived'
		| 'admin'
		| 'agent'
		| 'finance'
		| 'compliance'
		| 'manager'
		| 'senior-manager'
		| 'access-only'
	>('all');
	let busyEmail = $state('');

	const employees: Employee[] = $derived(data.employees ?? []);
	const totalEmployees = $derived(employees.filter((e) => e.code).length);
	const activeEmployees = $derived(employees.filter((e) => e.status === 'active' && e.code).length);
	const accessOnlyCount = $derived(
		employees.filter((e) => !e.code && e.accessStatus === 'enabled').length
	);
	const enabledAccessCount = $derived(employees.filter((e) => e.accessStatus === 'enabled').length);

	const filteredEmployees = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return employees.filter((employee) => {
			if (selectedFilter === 'active' && employee.status !== 'active') return false;
			if (selectedFilter === 'archived' && employee.status !== 'archived') return false;
			if (
				selectedFilter === 'access-only' &&
				(employee.code || employee.accessStatus !== 'enabled')
			)
				return false;
			if (
				['admin', 'agent', 'finance', 'compliance', 'manager', 'senior-manager'].includes(
					selectedFilter
				) &&
				employee.accessType !== selectedFilter
			) {
				return false;
			}
			if (!q) return true;
			return (
				employee.name.toLowerCase().includes(q) ||
				employee.email.toLowerCase().includes(q) ||
				employee.code.toLowerCase().includes(q) ||
				employee.department.toLowerCase().includes(q) ||
				employee.designation.toLowerCase().includes(q)
			);
		});
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
				<Sidebar.Trigger class="-ms-1" />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<div>
					<h1 class="text-2xl leading-8 font-medium">Employees & Access Mgmt</h1>
					<p class="text-[13px] leading-5 text-[#687976]">
						Manage HR profiles and platform access from one backend-driven view.
					</p>
				</div>
			</div>
			<Button
				class="h-8 border border-black/5 bg-[#222626] px-3 text-sm font-normal text-white"
				onclick={openCreate}
			>
				<UserPlus class="mr-2 h-4 w-4" />
				Add Employee
			</Button>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2"
					><CardTitle class="text-[13px] font-normal text-[#687976]">Employees</CardTitle
					></CardHeader
				>
				<CardContent><div class="text-2xl leading-8 font-medium">{totalEmployees}</div></CardContent
				>
			</Card>
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2"
					><CardTitle class="text-[13px] font-normal text-[#687976]">Active</CardTitle></CardHeader
				>
				<CardContent
					><div class="text-2xl leading-8 font-medium">{activeEmployees}</div></CardContent
				>
			</Card>
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2"
					><CardTitle class="text-[13px] font-normal text-[#687976]">Access Enabled</CardTitle
					></CardHeader
				>
				<CardContent
					><div class="text-2xl leading-8 font-medium">{enabledAccessCount}</div></CardContent
				>
			</Card>
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2"
					><CardTitle class="text-[13px] font-normal text-[#687976]">Access Only</CardTitle
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
					bind:value={searchQuery}
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
						onclick={() => (selectedFilter = option.value)}
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
