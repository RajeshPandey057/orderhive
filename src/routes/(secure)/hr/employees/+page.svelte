<script lang="ts">
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import OnboardingForm from '$lib/components/hr/onboarding-form.svelte';
	import { Search, UserPlus } from '@lucide/svelte';

	let employeeSheetOpen = $state(false);

	let employees = $state([
		{
			id: 1,
			name: 'John Doe',
			code: 'IND-001',
			email: 'john@indglobal.re',
			platformAccess: 'Sales',
			designation: 'HR',
			status: 'Active',
			branch: 'Business Bay, Dubai'
		},
		{
			id: 2,
			name: 'Jane Smith',
			code: 'IND-002',
			email: 'jane@indglobal.re',
			platformAccess: 'Operations',
			designation: 'Operations',
			status: 'Active',
			branch: 'Al Barsha, Dubai'
		},
		{
			id: 3,
			name: 'Rahul Kumar',
			code: 'IND-003',
			email: 'rahul@indglobal.re',
			platformAccess: 'HR',
			designation: 'HR',
			status: 'Active',
			branch: 'India Office'
		}
	]);

	const totalEmployees = $derived(employees.length);
	const dubaiEmployees = $derived(employees.filter((e) => e.branch.toLowerCase().includes('dubai')).length);
	const indiaEmployees = $derived(employees.filter((e) => e.branch.toLowerCase().includes('india')).length);

	type NewEmployeePayload = {
		name: string;
		code: string;
		email: string;
		platformAccess: string;
		designation: string;
		status: string;
		branch: string;
	};

	function handleCreateEmployee(newEmployee: NewEmployeePayload) {
		employees = [
			{
				id: Date.now(),
				...newEmployee
			},
			...employees
		];
		employeeSheetOpen = false;
	}
</script>

<Sheet.Root bind:open={employeeSheetOpen}>
	<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl leading-8 font-medium">Employee Management</h1>
				<p class="text-[13px] leading-5 text-[#687976]">
					Manage and track all company employees across branches.
				</p>
			</div>
			<Sheet.Trigger
				class={`${buttonVariants({ variant: 'default' })} h-8 border border-black/5 bg-[#222626] px-3 text-sm font-normal text-white`}
			>
				<UserPlus class="mr-2 h-4 w-4" />
				Add Employee
			</Sheet.Trigger>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2">
					<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]">Total Employees</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-2xl leading-8 font-medium text-[#222626]">{totalEmployees}</div>
				</CardContent>
			</Card>
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2">
					<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]">Dubai Branch</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-2xl leading-8 font-medium text-[#222626]">{dubaiEmployees}</div>
				</CardContent>
			</Card>
			<Card class="border-[#EBEEEE] shadow-none">
				<CardHeader class="pb-2">
					<CardTitle class="text-[13px] leading-5 font-normal text-[#687976]">India Branch</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-2xl leading-8 font-medium text-[#222626]">{indiaEmployees}</div>
				</CardContent>
			</Card>
		</div>

		<div class="flex items-center gap-4">
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#859693]" />
				<Input
					class="h-8 border-[#D4D9D9] pl-10 text-[13px] leading-5 text-[#222626]"
					placeholder="Search employees by name, code, or email..."
				/>
			</div>
		</div>

		<div class="rounded-md border border-[#EBEEEE] bg-white">
			<Table>
				<TableHeader>
					<TableRow class="bg-[#FBF9F8]">
						<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Employee</TableHead>
						<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Code</TableHead>
						<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Platform Access</TableHead>
						<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Designation</TableHead>
						<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Branch</TableHead>
						<TableHead class="h-9 text-[13px] leading-5 font-normal text-[#687976]">Status</TableHead>
						<TableHead class="h-9 text-right text-[13px] leading-5 font-normal text-[#687976]">
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each employees as emp}
						<TableRow class="h-[52px]">
							<TableCell>
								<div class="flex flex-col">
									<span class="text-[13px] leading-5 font-medium text-[#222626]">{emp.name}</span>
									<span class="text-[13px] leading-5 text-[#687976]">{emp.email}</span>
								</div>
							</TableCell>
							<TableCell class="text-[13px] leading-5 text-[#222626]">{emp.code}</TableCell>
							<TableCell class="text-[13px] leading-5 text-[#222626]">{emp.platformAccess}</TableCell>
							<TableCell class="text-[13px] leading-5 text-[#222626]">{emp.designation}</TableCell>
							<TableCell class="text-[13px] leading-5 text-[#222626]">{emp.branch}</TableCell>
							<TableCell>
								<Badge variant="secondary" class="border border-[#EBEEEE] bg-[#FBF9F8] text-[#222626]">
									{emp.status}
								</Badge>
							</TableCell>
							<TableCell class="text-right">
								<Button variant="ghost" size="sm" class="h-6 border border-[#EBEEEE] text-xs text-[#222626]">
									Edit
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="h-6 border border-[#EBEEEE] text-xs text-[#DC2626]"
								>
									Archive
								</Button>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	</div>

	<Sheet.Content
		side="right"
		class="w-[50vw] max-w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0"
	>
		<OnboardingForm onCreate={handleCreateEmployee} />
	</Sheet.Content>
</Sheet.Root>
