<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import {
		createEmployee,
		updateEmployee,
		updateEmployeeAccess
	} from '../../../routes/(secure)/hr/hr.remote';

	let {
		employee = null,
		onSaved
	}: {
		employee?: Employee | null;
		onSaved?: () => void;
	} = $props();

	const accessTypes = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'agent', label: 'Agent' },
		{ value: 'finance', label: 'Finance' },
		{ value: 'compliance', label: 'Compliance' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'senior-manager', label: 'Senior Manager' }
	] as const;
	const agentRoles = [
		{ value: 'sales-agent', label: 'Sales Agent' },
		{ value: 'reporting-manager', label: 'Reporting Manager' },
		{ value: 'senior-manager', label: 'Senior Manager' }
	];
	const agentLevels = [
		{ value: 'bronze', label: 'Bronze' },
		{ value: 'silver', label: 'Silver' },
		{ value: 'gold', label: 'Gold' },
		{ value: 'platinum', label: 'Platinum' }
	];
	const departments = [
		'Sales',
		'Presales',
		'Sales Operations',
		'Marketing',
		'HR',
		'Finance',
		'Compliance'
	];
	const locations = ['Dubai - Al Barsha', 'Dubai - Business Bay', 'India'];

	let saving = $state(false);
	let managedTeamText = $state('');
	let formData = $state({
		id: '',
		name: '',
		code: '',
		email: '',
		compensationAED: '',
		compensationINR: '',
		designation: '',
		department: '',
		accessType: 'agent',
		agentRole: 'sales-agent',
		agentLevel: '',
		status: 'active',
		reportingManagerEmail: '',
		seniorManagerEmail: '',
		doj: '',
		probationEndingDate: '',
		location: '',
		lastWorkingDay: ''
	});

	$effect(() => {
		formData = {
			id: employee?.id ?? '',
			name: employee?.name ?? '',
			code: employee?.code ?? '',
			email: employee?.email ?? '',
			compensationAED: employee?.compensationAED?.toString() ?? '',
			compensationINR: employee?.compensationINR?.toString() ?? '',
			designation: employee?.designation ?? '',
			department: employee?.department ?? '',
			accessType: employee?.accessType ?? 'agent',
			agentRole: employee?.agentRole || 'sales-agent',
			agentLevel: employee?.agentLevel ?? '',
			status: employee?.status ?? 'active',
			reportingManagerEmail: employee?.reportingManagerEmail ?? '',
			seniorManagerEmail: employee?.seniorManagerEmail ?? '',
			doj: employee?.doj ?? '',
			probationEndingDate: employee?.probationEndingDate ?? '',
			location: employee?.location ?? '',
			lastWorkingDay: employee?.lastWorkingDay ?? ''
		};
		managedTeamText = (employee?.managedTeamIds ?? []).join('\n');
	});

	const accessTypeLabel = $derived(
		accessTypes.find((type) => type.value === formData.accessType)?.label ?? 'Select access'
	);
	const agentRoleLabel = $derived(
		agentRoles.find((role) => role.value === formData.agentRole)?.label ?? 'Select agent role'
	);
	const agentLevelLabel = $derived(
		agentLevels.find((level) => level.value === formData.agentLevel)?.label ?? 'Select agent level'
	);

	function toNumber(value: string) {
		const n = Number(value);
		return Number.isFinite(n) && value.trim() !== '' ? n : undefined;
	}

	function accessPayload() {
		return {
			accessType: formData.accessType as
				| 'admin'
				| 'agent'
				| 'finance'
				| 'compliance'
				| 'manager'
				| 'senior-manager',
			agentRole: formData.accessType === 'agent' ? formData.agentRole : '',
			agentLevel: formData.accessType === 'agent' ? formData.agentLevel : '',
			managedTeamIds:
				formData.accessType === 'manager' || formData.accessType === 'senior-manager'
					? managedTeamText
							.split(/\r?\n|,/)
							.map((value) => value.trim())
							.filter(Boolean)
					: []
		};
	}

	async function handleSubmit() {
		if (!formData.email || (!formData.name && !employee)) {
			toast.error('Name and work email are required');
			return;
		}

		saving = true;
		try {
			if (employee?.code || formData.code) {
				const payload = {
					name: formData.name || formData.email.split('@')[0],
					code: formData.code || employee?.code || '',
					email: formData.email,
					department: formData.department,
					designation: formData.designation,
					location: formData.location,
					status: formData.status as 'active' | 'inactive' | 'archived',
					reportingManagerEmail: formData.reportingManagerEmail,
					seniorManagerEmail: formData.seniorManagerEmail,
					doj: formData.doj,
					probationEndingDate: formData.probationEndingDate,
					lastWorkingDay: formData.lastWorkingDay,
					compensationAED: toNumber(formData.compensationAED),
					compensationINR: toNumber(formData.compensationINR),
					access: accessPayload()
				};

				if (employee?.id && employee.code) {
					await updateEmployee({ id: employee.id, ...payload });
				} else {
					await createEmployee(payload);
				}
			} else {
				await updateEmployeeAccess({
					email: formData.email,
					access: accessPayload()
				});
			}
			toast.success(employee ? 'Employee updated' : 'Employee created');
			await invalidateAll();
			onSaved?.();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to save employee');
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex h-full max-h-screen w-full flex-col bg-white p-6 text-[#222626]">
	<div class="pb-4">
		<h2 class="text-2xl leading-8 font-medium">
			{employee ? 'Edit Employee & Access' : 'Employee Onboarding'}
		</h2>
		<p class="text-[13px] leading-5 text-[#687976]">
			Manage HR profile details and platform access from one place.
		</p>
	</div>
	<div class="border-t border-[#EBEEEE]"></div>

	<div class="min-h-0 flex-1 space-y-6 overflow-auto py-6">
		<section class="space-y-4">
			<h3 class="text-sm leading-5 font-medium">Employment Details</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="name">Full Name</Label>
					<Input id="name" bind:value={formData.name} placeholder="Employee name" class="h-8" />
				</div>
				<div class="space-y-2">
					<Label for="code">Employee Code</Label>
					<Input id="code" bind:value={formData.code} placeholder="INDG0001" class="h-8" />
				</div>
				<div class="space-y-2">
					<Label for="email">Work Email</Label>
					<Input
						id="email"
						type="email"
						bind:value={formData.email}
						placeholder="employee@company.com"
						class="h-8"
					/>
				</div>
				<div class="space-y-2">
					<Label for="designation">Designation</Label>
					<Input
						id="designation"
						bind:value={formData.designation}
						placeholder="Senior Agent"
						class="h-8"
					/>
				</div>
				<div class="space-y-2">
					<Label>Department</Label>
					<Select.Root type="single" bind:value={formData.department}>
						<Select.Trigger class="h-8">{formData.department || 'Select department'}</Select.Trigger
						>
						<Select.Content>
							{#each departments as department (department)}
								<Select.Item value={department}>{department}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Location</Label>
					<Select.Root type="single" bind:value={formData.location}>
						<Select.Trigger class="h-8">{formData.location || 'Select location'}</Select.Trigger>
						<Select.Content>
							{#each locations as location (location)}
								<Select.Item value={location}>{location}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Status</Label>
					<Select.Root type="single" bind:value={formData.status}>
						<Select.Trigger class="h-8 capitalize">{formData.status}</Select.Trigger>
						<Select.Content>
							<Select.Item value="active">Active</Select.Item>
							<Select.Item value="inactive">Inactive</Select.Item>
							<Select.Item value="archived">Archived</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label for="doj">Date of Joining</Label>
					<Input id="doj" type="date" bind:value={formData.doj} class="h-8" />
				</div>
				<div class="space-y-2">
					<Label for="probationEndingDate">Probation Ending Date</Label>
					<Input
						id="probationEndingDate"
						type="date"
						bind:value={formData.probationEndingDate}
						class="h-8"
					/>
				</div>
				<div class="space-y-2">
					<Label for="lastWorkingDay">Last Working Day</Label>
					<Input id="lastWorkingDay" type="date" bind:value={formData.lastWorkingDay} class="h-8" />
				</div>
				<div class="space-y-2">
					<Label for="compensationAED">Compensation AED</Label>
					<Input
						id="compensationAED"
						inputmode="decimal"
						bind:value={formData.compensationAED}
						class="h-8"
					/>
				</div>
				<div class="space-y-2">
					<Label for="compensationINR">Compensation INR</Label>
					<Input
						id="compensationINR"
						inputmode="decimal"
						bind:value={formData.compensationINR}
						class="h-8"
					/>
				</div>
			</div>
		</section>

		<section class="space-y-4">
			<h3 class="text-sm leading-5 font-medium">Platform Access</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label>Access Type</Label>
					<Select.Root type="single" bind:value={formData.accessType}>
						<Select.Trigger class="h-8">{accessTypeLabel}</Select.Trigger>
						<Select.Content>
							{#each accessTypes as type (type.value)}
								<Select.Item value={type.value}>{type.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				{#if formData.accessType === 'agent'}
					<div class="space-y-2">
						<Label>Agent Role</Label>
						<Select.Root type="single" bind:value={formData.agentRole}>
							<Select.Trigger class="h-8">{agentRoleLabel}</Select.Trigger>
							<Select.Content>
								{#each agentRoles as role (role.value)}
									<Select.Item value={role.value}>{role.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label>Agent Level</Label>
						<Select.Root type="single" bind:value={formData.agentLevel}>
							<Select.Trigger class="h-8">{agentLevelLabel}</Select.Trigger>
							<Select.Content>
								{#each agentLevels as level (level.value)}
									<Select.Item value={level.value}>{level.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
				{#if formData.accessType === 'manager' || formData.accessType === 'senior-manager'}
					<div class="space-y-2 md:col-span-2">
						<Label for="managedTeamIds">Managed Team UIDs</Label>
						<Textarea
							id="managedTeamIds"
							bind:value={managedTeamText}
							placeholder="One Firebase UID per line"
							class="min-h-24"
						/>
					</div>
				{/if}
			</div>
		</section>

		<section class="space-y-4">
			<h3 class="text-sm leading-5 font-medium">Reporting</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="reportingManagerEmail">Reporting Manager Email</Label>
					<Input
						id="reportingManagerEmail"
						type="email"
						bind:value={formData.reportingManagerEmail}
						class="h-8"
					/>
				</div>
				<div class="space-y-2">
					<Label for="seniorManagerEmail">Senior Manager Email</Label>
					<Input
						id="seniorManagerEmail"
						type="email"
						bind:value={formData.seniorManagerEmail}
						class="h-8"
					/>
				</div>
			</div>
		</section>
	</div>

	<div class="mt-auto border-t border-[#EBEEEE] pt-4">
		<Button
			class="h-8 w-full border border-black/5 bg-[#222626] text-sm text-white"
			onclick={handleSubmit}
			disabled={saving}
		>
			{saving ? 'Saving...' : employee ? 'Save Employee' : 'Create Employee'}
		</Button>
	</div>
</div>
