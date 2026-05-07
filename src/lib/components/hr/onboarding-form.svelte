<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';

	type OnboardedEmployee = {
		name: string;
		code: string;
		email: string;
		platformAccess: string;
		designation: string;
		status: string;
		branch: string;
	};

	let { onCreate }: { onCreate?: (employee: OnboardedEmployee) => void } = $props();

	let step = $state(1);
	const totalSteps = 2;

	let formData = $state({
		name: '',
		code: '',
		email: '',
		compensationAED: '',
		compensationINR: '',
		designation: '',
		department: '',
		role: '',
		status: 'Active',
		reportingManagerEmail: '',
		seniorManagerEmail: '',
		doj: '',
		probationEndingDate: '',
		location: '',
		lastWorkingDay: '',
		documents: {
			passport: null,
			visa: null,
			nationalId: null,
			education: null,
			nda: null
		}
	});

	const roles = ['Admin', 'Agent', 'Compliance', 'Finance', 'PRO', 'General'];
	const statuses = ['Active', 'Inactive'];
	const departments = ['Sales', 'Presales', 'Sales Operations', 'Marketing', 'HR'];
	const locations = ['Dubai - Al Barsha', 'Dubai - Business Bay', 'India'];

	function nextStep() {
		if (step < totalSteps) step += 1;
	}

	function prevStep() {
		if (step > 1) step -= 1;
	}

	function handleSubmit() {
		if (!formData.name || !formData.code || !formData.email) return;

		onCreate?.({
			name: formData.name,
			code: formData.code,
			email: formData.email,
			platformAccess: formData.department || 'General',
			designation: formData.designation || 'General',
			status: formData.status || 'Active',
			branch: formData.location || 'Unassigned'
		});

		// Reset wizard after successful creation
		step = 1;
		formData = {
			name: '',
			code: '',
			email: '',
			compensationAED: '',
			compensationINR: '',
			designation: '',
			department: '',
			role: '',
			status: 'Active',
			reportingManagerEmail: '',
			seniorManagerEmail: '',
			doj: '',
			probationEndingDate: '',
			location: '',
			lastWorkingDay: '',
			documents: {
				passport: null,
				visa: null,
				nationalId: null,
				education: null,
				nda: null
			}
		};
	}

	const getStepState = (s: number) => {
		if (s < step) return 'completed';
		if (s === step) return 'active';
		return 'pending';
	};

	const stepTitle = (s: number) =>
		s === 1 ? 'Configure Profile' : 'Verify Profile';

	const stepDescription = (s: number) =>
		s === 1
			? 'Capture employee details required for onboarding.'
			: 'Review all details before creating employee.';
</script>

<div class="mx-auto flex h-full max-h-screen w-full flex-col bg-white p-6 text-[#222626]">
	<div class="flex items-start justify-between pb-4">
		<div>
			<h2 class="text-2xl leading-8 font-medium">Employee Onboarding</h2>
			<p class="text-[13px] leading-5 text-[#687976]">Complete the multi-step flow to add a new employee.</p>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2">
		{#each [1, 2] as s}
			{@const state = getStepState(s)}
			<div class="flex items-start gap-3">
				<div
					class={[
						'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium',
						state === 'completed'
							? 'bg-green-600 text-white'
							: state === 'active'
								? 'bg-[#F04C06] text-white'
								: 'bg-[#E5E7EB] text-[#687976]'
					]}
				>
					{s}
				</div>
				<div class="min-w-0">
					<p class="text-sm leading-5 font-medium text-[#222626]">{stepTitle(s)}</p>
					<p class="text-[13px] leading-5 text-[#687976]">{stepDescription(s)}</p>
				</div>
			</div>
		{/each}
	</div>
	<div class="border-t border-[#EBEEEE]"></div>

	<div class="min-h-0 flex-1 overflow-auto py-6">
		{#if step === 1}
			<div class="space-y-6">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="name">Full Name</Label>
						<Input id="name" bind:value={formData.name} placeholder="Employee Name" class="h-8" />
					</div>
					<div class="space-y-2">
						<Label for="code">Employee Code</Label>
						<Input id="code" bind:value={formData.code} placeholder="INDG0001" class="h-8" />
					</div>
					<div class="space-y-2">
						<Label for="email">Employee Email ID</Label>
						<Input id="email" type="email" bind:value={formData.email} placeholder="Unique Identifier" class="h-8" />
					</div>
					<div class="space-y-2">
						<Label for="designation">Designation</Label>
						<Input id="designation" bind:value={formData.designation} placeholder="Senior Agent" class="h-8" />
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label>Platform Access Role</Label>
						<Select.Root type="single" bind:value={formData.role}>
							<Select.Trigger class="h-8">{formData.role || 'Select Role'}</Select.Trigger>
							<Select.Content>
								{#each roles as role}
									<Select.Item value={role}>{role}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label>Department</Label>
						<Select.Root type="single" bind:value={formData.department}>
							<Select.Trigger class="h-8">{formData.department || 'Select Department'}</Select.Trigger>
							<Select.Content>
								{#each departments as dept}
									<Select.Item value={dept}>{dept}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label>Status</Label>
						<Select.Root type="single" bind:value={formData.status}>
							<Select.Trigger class="h-8">{formData.status || 'Select Status'}</Select.Trigger>
							<Select.Content>
								{#each statuses as status}
									<Select.Item value={status}>{status}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label>Location</Label>
						<Select.Root type="single" bind:value={formData.location}>
							<Select.Trigger class="h-8">{formData.location || 'Select Location'}</Select.Trigger>
							<Select.Content>
								{#each locations as location}
									<Select.Item value={location}>{location}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="reportingManagerEmail">Reporting Manager Email</Label>
						<Input id="reportingManagerEmail" type="email" bind:value={formData.reportingManagerEmail} placeholder="manager@company.com" class="h-8" />
					</div>
					<div class="space-y-2">
						<Label for="seniorManagerEmail">Senior Manager Email</Label>
						<Input id="seniorManagerEmail" type="email" bind:value={formData.seniorManagerEmail} placeholder="senior.manager@company.com" class="h-8" />
					</div>
					<div class="space-y-2">
						<Label for="doj">DOJ</Label>
						<Input id="doj" type="date" bind:value={formData.doj} class="h-8" />
					</div>
					<div class="space-y-2">
						<Label for="probationEndingDate">Probation Ending Date</Label>
						<Input id="probationEndingDate" type="date" bind:value={formData.probationEndingDate} class="h-8" />
					</div>
					<div class="space-y-2">
						<Label for="compensationAED">Compensation (AED)</Label>
						<Input id="compensationAED" type="number" bind:value={formData.compensationAED} placeholder="0.00" class="h-8" />
					</div>
					<div class="space-y-2">
						<Label for="compensationINR">Compensation (INR)</Label>
						<Input id="compensationINR" type="number" bind:value={formData.compensationINR} placeholder="0.00" class="h-8" />
					</div>
					<div class="space-y-2 md:col-span-2">
						<Label for="lastWorkingDay">
							Last Working Day
							{#if formData.status !== 'Inactive'}
								<span class="text-[#687976]">(required only when status is Inactive)</span>
							{/if}
						</Label>
						<Input id="lastWorkingDay" type="date" bind:value={formData.lastWorkingDay} disabled={formData.status !== 'Inactive'} class="h-8" />
					</div>
				</div>
			</div>
		{:else if step === 2}
			<div class="space-y-4">
				<div class="overflow-hidden rounded-md border border-[#EBEEEE] bg-white">
					<Table>
						<TableHeader>
							<TableRow class="bg-[#FBF9F8]">
								<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Field</TableHead>
								<TableHead class="h-9 text-[13px] font-normal text-[#687976]">Value</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow><TableCell>Employee Name</TableCell><TableCell>{formData.name || '-'}</TableCell></TableRow>
							<TableRow><TableCell>Employee Code</TableCell><TableCell>{formData.code || '-'}</TableCell></TableRow>
							<TableRow><TableCell>Email</TableCell><TableCell>{formData.email || '-'}</TableCell></TableRow>
							<TableRow><TableCell>Access Role</TableCell><TableCell>{formData.role || '-'}</TableCell></TableRow>
							<TableRow><TableCell>Department</TableCell><TableCell>{formData.department || '-'}</TableCell></TableRow>
							<TableRow><TableCell>Status</TableCell><TableCell>{formData.status || '-'}</TableCell></TableRow>
							<TableRow><TableCell>Location</TableCell><TableCell>{formData.location || '-'}</TableCell></TableRow>
							<TableRow><TableCell>Compensation AED</TableCell><TableCell>{formData.compensationAED || '-'}</TableCell></TableRow>
							<TableRow><TableCell>Compensation INR</TableCell><TableCell>{formData.compensationINR || '-'}</TableCell></TableRow>
						</TableBody>
					</Table>
				</div>
			</div>
		{/if}
	</div>

	<div class="mt-auto border-t border-[#EBEEEE] pt-4">
		<div class="flex items-center justify-between">
			<Button
				variant="outline"
				class="h-8 border-[#EBEEEE] text-sm text-[#222626]"
				onclick={prevStep}
				disabled={step === 1}
			>
				Go Back
			</Button>
			{#if step < totalSteps}
				<Button class="h-8 border border-black/5 bg-[#222626] text-sm text-white" onclick={nextStep}>
					Verify Profile
				</Button>
			{:else}
				<Button class="h-8 border border-black/5 bg-[#222626] text-sm text-white" onclick={handleSubmit}>
					Create Employee
				</Button>
			{/if}
		</div>
	</div>
</div>
