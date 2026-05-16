<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getInitials } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import Loader2 from '~icons/lucide/loader-2';
	import UserRound from '~icons/lucide/user-round';
	import
		{
			createEmployee,
			updateEmployee,
			updateEmployeeAccess
		} from '../../../routes/(secure)/hr/hr.remote';
	import { searchUsers as searchUsersRemote } from '../../../routes/(secure)/users.remote';

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
		{ value: 'senior-manager', label: 'Senior Manager' },
		{ value: 'general', label: 'General' }
	] as const;
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

	$effect(() => {
		if (!employee && formData.doj && !formData.probationEndingDate) {
			formData.probationEndingDate = calculateProbationEndingDate(formData.doj);
		}
	});

	const accessTypeLabel = $derived(
		accessTypes.find((type) => type.value === formData.accessType)?.label ?? 'Select access'
	);
	const hideReportingSection = $derived(formData.accessType === 'senior-manager');

	type UserResult = {
		id: string;
		email: string | null;
		displayName?: string | null;
		photoURL?: string | null;
	};

	let reportingPopoverOpen = $state(false);
	let reportingSearchValue = $state('');
	let reportingSearchResults = $state<UserResult[]>([]);
	let reportingSearchLoading = $state(false);
	let reportingDebounceTimer: ReturnType<typeof setTimeout> | undefined;

	let seniorPopoverOpen = $state(false);
	let seniorSearchValue = $state('');
	let seniorSearchResults = $state<UserResult[]>([]);
	let seniorSearchLoading = $state(false);
	let seniorDebounceTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (!hideReportingSection) return;
		reportingPopoverOpen = false;
		reportingSearchValue = '';
		reportingSearchResults = [];
		reportingSearchLoading = false;
		if (reportingDebounceTimer) clearTimeout(reportingDebounceTimer);
		reportingDebounceTimer = undefined;

		seniorPopoverOpen = false;
		seniorSearchValue = '';
		seniorSearchResults = [];
		seniorSearchLoading = false;
		if (seniorDebounceTimer) clearTimeout(seniorDebounceTimer);
		seniorDebounceTimer = undefined;
	});

	async function doSearch(
		setLoading: (value: boolean) => void,
		setResults: (users: UserResult[]) => void,
		term: string,
		roleFilter: 'manager' | 'senior-manager'
	) {
		setLoading(true);
		try {
			const users = await searchUsersRemote({ q: term.trim(), roleFilter });
			setResults(users);
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	}

	function handleReportingManagerSearchInput(value: string) {
		reportingSearchValue = value;
		if (reportingDebounceTimer) clearTimeout(reportingDebounceTimer);
		reportingDebounceTimer = setTimeout(() => {
			doSearch(
				(value) => (reportingSearchLoading = value),
				(users) => (reportingSearchResults = users),
				value,
				'manager'
			);
		}, 300);
	}

	function handleSeniorManagerSearchInput(value: string) {
		seniorSearchValue = value;
		if (seniorDebounceTimer) clearTimeout(seniorDebounceTimer);
		seniorDebounceTimer = setTimeout(() => {
			doSearch(
				(value) => (seniorSearchLoading = value),
				(users) => (seniorSearchResults = users),
				value,
				'senior-manager'
			);
		}, 300);
	}

	function selectReportingManager(user: UserResult) {
		const email = user.email ?? '';
		formData.reportingManagerEmail = email;
		reportingPopoverOpen = false;
	}

	function selectSeniorManager(user: UserResult) {
		const email = user.email ?? '';
		formData.seniorManagerEmail = email;
		seniorPopoverOpen = false;
	}

	function toNumber(value: string) {
		const n = Number(value);
		return Number.isFinite(n) && value.trim() !== '' ? n : undefined;
	}

	function calculateProbationEndingDate(doj: string) {
		const start = new Date(`${doj}T00:00:00`);
		if (Number.isNaN(start.getTime())) return '';
		const end = new Date(start);
		end.setMonth(end.getMonth() + 3);
		end.setDate(end.getDate() - 1);
		const year = end.getFullYear();
		const month = String(end.getMonth() + 1).padStart(2, '0');
		const day = String(end.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function accessPayload() {
		return {
			accessType: formData.accessType as
				| 'admin'
				| 'agent'
				| 'finance'
				| 'compliance'
				| 'manager'
				| 'senior-manager'
				| 'general',
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

		{#if !hideReportingSection}
			<section class="space-y-4">
				<h3 class="text-sm leading-5 font-medium">Reporting</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label>Reporting Manager</Label>
						<Popover.Root bind:open={reportingPopoverOpen}>
							<Popover.Trigger
								class="flex h-8 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-accent"
							>
								{#if formData.reportingManagerEmail}
									<Avatar.Root class="h-5 w-5">
										<Avatar.Fallback class="text-[10px]">
											{getInitials(formData.reportingManagerEmail)}
										</Avatar.Fallback>
									</Avatar.Root>
									<span class="truncate">{formData.reportingManagerEmail}</span>
								{:else}
									<UserRound class="h-4 w-4 text-muted-foreground" />
									<span class="text-muted-foreground">Select reporting manager...</span>
								{/if}
							</Popover.Trigger>
							<Popover.Content class="w-72 p-0" align="start">
								<Command.Root>
									<Command.Input
										placeholder="Search managers..."
										value={reportingSearchValue}
										oninput={(e) =>
											handleReportingManagerSearchInput((e.target as HTMLInputElement).value)}
									/>
									<Command.List>
										{#if reportingSearchLoading}
											<div class="flex items-center justify-center py-4">
												<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
											</div>
										{:else if reportingSearchResults.length === 0}
											<Command.Empty>
												{reportingSearchValue.trim() ? 'No users found.' : 'Type to search...'}
											</Command.Empty>
										{:else}
											<Command.Group>
												{#each reportingSearchResults as user (user.id)}
													<Command.Item
														value={user.id}
														onSelect={() => selectReportingManager(user)}
													>
														<Avatar.Root class="h-5 w-5">
															{#if user.photoURL}
																<Avatar.Image
																	src={user.photoURL}
																	alt={user.displayName ?? 'User'}
																/>
															{/if}
															<Avatar.Fallback class="text-[10px]">
																{getInitials(user.displayName ?? user.email ?? 'User')}
															</Avatar.Fallback>
														</Avatar.Root>
														<div class="ml-2 min-w-0">
															<div class="truncate text-sm font-medium">
																{user.displayName ?? user.email ?? 'User'}
															</div>
															<div class="truncate text-xs text-muted-foreground">{user.email}</div>
														</div>
													</Command.Item>
												{/each}
											</Command.Group>
										{/if}
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
					</div>

					<div class="space-y-2">
						<Label>Senior Manager</Label>
						<Popover.Root bind:open={seniorPopoverOpen}>
							<Popover.Trigger
								class="flex h-8 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-accent"
							>
								{#if formData.seniorManagerEmail}
									<Avatar.Root class="h-5 w-5">
										<Avatar.Fallback class="text-[10px]">
											{getInitials(formData.seniorManagerEmail)}
										</Avatar.Fallback>
									</Avatar.Root>
									<span class="truncate">{formData.seniorManagerEmail}</span>
								{:else}
									<UserRound class="h-4 w-4 text-muted-foreground" />
									<span class="text-muted-foreground">Select senior manager...</span>
								{/if}
							</Popover.Trigger>
							<Popover.Content class="w-72 p-0" align="start">
								<Command.Root>
									<Command.Input
										placeholder="Search senior managers..."
										value={seniorSearchValue}
										oninput={(e) =>
											handleSeniorManagerSearchInput((e.target as HTMLInputElement).value)}
									/>
									<Command.List>
										{#if seniorSearchLoading}
											<div class="flex items-center justify-center py-4">
												<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
											</div>
										{:else if seniorSearchResults.length === 0}
											<Command.Empty>
												{seniorSearchValue.trim() ? 'No users found.' : 'Type to search...'}
											</Command.Empty>
										{:else}
											<Command.Group>
												{#each seniorSearchResults as user (user.id)}
													<Command.Item value={user.id} onSelect={() => selectSeniorManager(user)}>
														<Avatar.Root class="h-5 w-5">
															{#if user.photoURL}
																<Avatar.Image
																	src={user.photoURL}
																	alt={user.displayName ?? 'User'}
																/>
															{/if}
															<Avatar.Fallback class="text-[10px]">
																{getInitials(user.displayName ?? user.email ?? 'User')}
															</Avatar.Fallback>
														</Avatar.Root>
														<div class="ml-2 min-w-0">
															<div class="truncate text-sm font-medium">
																{user.displayName ?? user.email ?? 'User'}
															</div>
															<div class="truncate text-xs text-muted-foreground">{user.email}</div>
														</div>
													</Command.Item>
												{/each}
											</Command.Group>
										{/if}
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
					</div>
				</div>
			</section>
		{/if}
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
