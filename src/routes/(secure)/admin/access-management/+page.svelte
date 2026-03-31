<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { firekitCollection } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';
	import Briefcase from '~icons/lucide/briefcase';
	import Hammer from '~icons/lucide/hammer';
	import Search from '~icons/lucide/search';
	import Trash2 from '~icons/lucide/trash-2';
	import Trophy from '~icons/lucide/trophy';
	import UserPlus from '~icons/lucide/user-plus';
	import { deleteUser, inviteUser, updateUser } from './access.remote';
	// Fetch roles collection from Firebase
	const rolesCollection = firekitCollection<Role>('roles');

	// State for filters
	let searchQuery = $state('');
	let selectedFilter = $state<
		'all' | 'admin' | 'agent' | 'compliance' | 'finance' | 'senior-manager' | 'reporting-manager'
	>('all');

	// Dialog state
	let dialogOpen = $state(false);

	// Edit Sheet state
	let editSheetOpen = $state(false);
	let selectedRole = $state<Role | null>(null);
	let editAccessType = $state<string | undefined>(undefined);

	// Form state for access type (needed for conditional rendering)
	let selectedAccessType = $state<string | undefined>('admin');

	// Computed filtered data
	let filteredData = $derived.by(() => {
		if (!rolesCollection.data) return [];

		let filtered = rolesCollection.data;

		// Apply access type filter
		if (selectedFilter === 'senior-manager' || selectedFilter === 'reporting-manager') {
			filtered = filtered.filter((role) => role.agentRole === selectedFilter);
		} else if (selectedFilter !== 'all') {
			filtered = filtered.filter((role) => role.accessType === selectedFilter);
		}

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(role) =>
					role.email.toLowerCase().includes(query) ||
					role.firstName?.toLowerCase().includes(query) ||
					role.lastName?.toLowerCase().includes(query) ||
					`${role.firstName} ${role.lastName}`.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	// Access type options
	const accessTypes = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'agent', label: 'Agent' },
		{ value: 'compliance', label: 'Compliance' },
		{ value: 'finance', label: 'Finance' }
	];

	// Agent role options
	const agentRoles = [
		{ value: 'sales-agent', label: 'Sales Agent' },
		{ value: 'reporting-manager', label: 'Reporting Manager' },
		{ value: 'senior-manager', label: 'Senior Manager' }
	];

	// Agent level options
	const agentLevels = [
		{ value: 'bronze', label: 'Bronze' },
		{ value: 'silver', label: 'Silver' },
		{ value: 'gold', label: 'Gold' },
		{ value: 'platinum', label: 'Platinum' }
	];

	// Derived labels for invite form
	const accessTypeLabel = $derived(
		accessTypes.find((t) => t.value === inviteUser.fields.accessType.value())?.label ??
			'Select access type'
	);

	const agentRoleLabel = $derived(
		agentRoles.find((r) => r.value === inviteUser.fields.agentRole.value())?.label ??
			'Select agent role'
	);

	const agentLevelLabel = $derived(
		agentLevels.find((l) => l.value === inviteUser.fields.agentLevel.value())?.label ??
			'Select agent level'
	);

	// Derived labels for edit form
	const editAccessTypeLabel = $derived(
		accessTypes.find((t) => t.value === updateUser.fields.accessType.value())?.label ??
			'Select access type'
	);

	const editAgentRoleLabel = $derived(
		agentRoles.find((r) => r.value === updateUser.fields.agentRole.value())?.label ??
			'Select agent role'
	);

	const editAgentLevelLabel = $derived(
		agentLevels.find((l) => l.value === updateUser.fields.agentLevel.value())?.label ??
			'Select agent level'
	);

	// Handle edit access - opens sheet with role data
	function handleEditAccess(role: Role) {
		selectedRole = role;
		editAccessType = role.accessType;
		// Pre-populate the update form fields
		updateUser.fields.email.set(role.email);
		updateUser.fields.accessType.set(
			role.accessType as 'admin' | 'agent' | 'finance' | 'compliance'
		);
		if (role.agentRole) updateUser.fields.agentRole.set(role.agentRole);
		if (role.agentLevel) updateUser.fields.agentLevel.set(role.agentLevel);
		editSheetOpen = true;
	}

	// Handle delete user
	async function handleDeleteUser() {
		if (!selectedRole) return;

		try {
			await deleteUser({ email: selectedRole.email });
			editSheetOpen = false;
			selectedRole = null;
			toast.success('User deleted successfully!');
		} catch {
			toast.error('Failed to delete user');
		}
	}

	// Handle edit access type change
	function handleEditAccessTypeChange(value: string | undefined) {
		editAccessType = value;
		updateUser.fields.accessType.set(value as 'admin' | 'agent' | 'finance' | 'compliance');
		// Clear agent fields if not agent
		if (value !== 'agent') {
			updateUser.fields.agentRole.set('');
			updateUser.fields.agentLevel.set('');
		}
	}

	// Get user initials for avatar
	function getInitials(role: Role): string {
		if (role.firstName && role.lastName) {
			return `${role.firstName.charAt(0)}${role.lastName.charAt(0)}`.toUpperCase();
		}
		if (role.firstName) return role.firstName.charAt(0).toUpperCase();
		if (role.lastName) return role.lastName.charAt(0).toUpperCase();
		// Use first two chars before @ from email
		const emailPrefix = role.email.split('@')[0];
		return emailPrefix.substring(0, 2).toUpperCase();
	}

	// Get display name
	function getDisplayName(role: Role): string {
		if (role.firstName && role.lastName) {
			return `${role.firstName} ${role.lastName}`;
		}
		if (role.firstName) return role.firstName;
		if (role.lastName) return role.lastName;
		return role.email.split('@')[0];
	}

	// Get access type badge styles
	function getAccessTypeBadge(accessType: string) {
		switch (accessType) {
			case 'admin':
				return 'bg-red-100 text-red-700';
			case 'agent':
				return 'bg-blue-100 text-blue-700';
			case 'compliance':
				return 'bg-green-100 text-green-700';
			case 'finance':
				return 'bg-purple-100 text-purple-700';
			case 'super-admin':
				return 'bg-orange-100 text-orange-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	// Capitalize access type
	function capitalizeAccessType(type: string): string {
		return type
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Handle access type change
	function handleAccessTypeChange(value: string | undefined) {
		selectedAccessType = value;
		inviteUser.fields.accessType.set(value as 'admin' | 'agent' | 'finance' | 'compliance');
		// Clear agent fields if not agent
		if (value !== 'agent') {
			inviteUser.fields.agentRole.set('');
			inviteUser.fields.agentLevel.set('');
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Access Management</h1>
		<Dialog.Root bind:open={dialogOpen}>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button {...props} class="gap-2">
						<UserPlus class="h-4 w-4" />
						Add Member
					</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title class="text-2xl font-semibold">Invite User</Dialog.Title>
				</Dialog.Header>
				<form
					{...inviteUser.enhance(async ({ form, submit }) => {
						try {
							await submit();

							const issues = inviteUser.fields.allIssues();
							if (!issues?.length) {
								form.reset();
								dialogOpen = false;
								selectedAccessType = undefined;
								toast.success('User invited successfully!');
							}
						} catch {
							toast.error('Failed to invite user');
						}
					})}
				>
					<div class="flex flex-col gap-6 py-4">
						<!-- Email Field -->
						<Field.Field>
							<Field.Label for="email">Enter Email</Field.Label>
							<Input
								id="email"
								type="email"
								placeholder="user@example.com"
								{...inviteUser.fields.email.as('text')}
								class="focus-visible:ring-orange-500"
							/>
							{#each inviteUser.fields.email.issues() as issue, i (i)}
								<Field.Error>{issue.message}</Field.Error>
							{/each}
						</Field.Field>

						<!-- Access Type Field -->
						<Field.Field>
							<Field.Label for="accessType">Access Type</Field.Label>
							<Select.Root
								type="single"
								value={inviteUser.fields.accessType.value()}
								onValueChange={handleAccessTypeChange}
							>
								<Select.Trigger id="accessType">
									<Hammer />
									{accessTypeLabel}
								</Select.Trigger>
								<Select.Content>
									{#each accessTypes as type (type.value)}
										<Select.Item class="self-start" value={type.value}>{type.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" {...inviteUser.fields.accessType.as('text')} />
							{#each inviteUser.fields.accessType.issues() as issue, i (i)}
								<Field.Error>{issue.message}</Field.Error>
							{/each}
						</Field.Field>

						<!-- Agent-specific fields (shown only when accessType is 'agent') -->
						{#if selectedAccessType === 'agent'}
							<!-- Agent Role Field -->
							<Field.Field>
								<Field.Label for="agentRole">Agent Role</Field.Label>
								<Select.Root
									type="single"
									value={inviteUser.fields.agentRole.value()}
									onValueChange={(v) => inviteUser.fields.agentRole.set(v)}
								>
									<Select.Trigger id="agentRole">
										<Briefcase />
										{agentRoleLabel}
									</Select.Trigger>
									<Select.Content>
										{#each agentRoles as role (role.value)}
											<Select.Item value={role.value}>{role.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...inviteUser.fields.agentRole.as('text')} />
								{#each inviteUser.fields.agentRole.issues() as issue, i (i)}
									<Field.Error>{issue.message}</Field.Error>
								{/each}
							</Field.Field>

							<!-- Agent Level Field -->
							<Field.Field>
								<Field.Label for="agentLevel">Agent Level</Field.Label>
								<Select.Root
									type="single"
									value={inviteUser.fields.agentLevel.value()}
									onValueChange={(v) => inviteUser.fields.agentLevel.set(v)}
								>
									<Select.Trigger id="agentLevel">
										<Trophy />
										{agentLevelLabel}
									</Select.Trigger>
									<Select.Content>
										{#each agentLevels as level (level.value)}
											<Select.Item value={level.value}>{level.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...inviteUser.fields.agentLevel.as('text')} />
								{#each inviteUser.fields.agentLevel.issues() as issue, i (i)}
									<Field.Error>{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						{/if}

						<!-- Submit Button -->
						<Button type="submit" class="w-full" disabled={!!inviteUser.pending}>
							{inviteUser.pending ? 'Inviting...' : 'Invite'}
						</Button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<!-- View Filters -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium">View:</span>
		<div class="flex gap-2">
			<Button
				variant={selectedFilter === 'all' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (selectedFilter = 'all')}
			>
				All
			</Button>
			<Button
				variant={selectedFilter === 'admin' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (selectedFilter = 'admin')}
			>
				Admin
			</Button>
			<Button
				variant={selectedFilter === 'agent' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (selectedFilter = 'agent')}
			>
				Agent
			</Button>
			<Button
				variant={selectedFilter === 'compliance' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (selectedFilter = 'compliance')}
			>
				Compliance
			</Button>
			<Button
				variant={selectedFilter === 'finance' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (selectedFilter = 'finance')}
			>
				Finance
			</Button>
			<Button
				variant={selectedFilter === 'senior-manager' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (selectedFilter = 'senior-manager')}
			>
				Senior Manager
			</Button>
			<Button
				variant={selectedFilter === 'reporting-manager' ? 'default' : 'outline'}
				size="sm"
				onclick={() => (selectedFilter = 'reporting-manager')}
			>
				Reporting Manager
			</Button>
		</div>
	</div>

	<!-- Search Bar -->
	<div class="relative max-w-sm">
		<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
		<Input
			placeholder="Search by name or email..."
			value={searchQuery}
			oninput={(e) => {
				searchQuery = e.currentTarget.value;
			}}
			class="pl-8"
		/>
	</div>

	<!-- Loading State -->
	{#if rolesCollection.loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div
					class="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
				></div>
				<p class="text-sm text-muted-foreground">Loading roles...</p>
			</div>
		</div>
	{:else if rolesCollection.error}
		<!-- Error State -->
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<p class="text-sm text-destructive">Error: {rolesCollection.error.message}</p>
			</div>
		</div>
	{:else if rolesCollection.empty}
		<!-- Empty State -->
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<p class="text-sm text-muted-foreground">No roles found</p>
			</div>
		</div>
	{:else}
		<!-- Data Table -->
		<div class="rounded-md border bg-card">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>User</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head class="flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="text-muted-foreground"
							>
								<rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
								<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
							</svg>
							Access Type
						</Table.Head>
						<Table.Head>Action</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if filteredData.length === 0}
						<Table.Row>
							<Table.Cell colspan={4} class="h-24 text-center">
								<p class="text-sm text-muted-foreground">
									No results found for "{searchQuery}"
								</p>
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each filteredData as role (role.uid || role.email)}
							<Table.Row>
								<Table.Cell class="font-medium">
									{getDisplayName(role)}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{role.email}
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getAccessTypeBadge(
											role.accessType
										)}"
									>
										{capitalizeAccessType(role.accessType)}
									</span>
								</Table.Cell>
								<Table.Cell>
									<Button variant="ghost" size="sm" onclick={() => handleEditAccess(role)}>
										Edit Access
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Results Count -->
		{#if filteredData.length > 0}
			<div class="text-sm text-muted-foreground">
				Showing {filteredData.length} of {rolesCollection.size} role(s)
			</div>
		{/if}
	{/if}
</div>

<!-- Edit Access Sheet -->
<Sheet.Root bind:open={editSheetOpen}>
	<Sheet.Content side="right" class="px-6 sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title class="text-start text-2xl font-semibold">Edit Access</Sheet.Title>
		</Sheet.Header>

		{#if selectedRole}
			<div class="flex flex-col gap-6 py-6">
				<!-- User Info with Avatar -->
				<div class="flex items-center gap-4">
					<Avatar.Root class="h-12 w-12 border-2 border-blue-200">
						<Avatar.Fallback class="bg-blue-100 font-semibold text-blue-700">
							{getInitials(selectedRole)}
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex flex-col">
						<span class="text-lg font-semibold">{getDisplayName(selectedRole)}</span>
						<span class="text-sm text-muted-foreground">{selectedRole.email}</span>
					</div>
				</div>

				<!-- Update Form -->
				<form
					{...updateUser.enhance(async ({ form, submit }) => {
						try {
							await submit();

							const issues = updateUser.fields.allIssues();
							if (!issues?.length) {
								form.reset();
								editSheetOpen = false;
								selectedRole = null;
								editAccessType = undefined;
								toast.success('Access updated successfully!');
							}
						} catch {
							toast.error('Failed to update access');
						}
					})}
				>
					<div class="flex flex-col gap-6">
						<!-- Hidden email field -->
						<input type="hidden" {...updateUser.fields.email.as('text')} />

						<!-- Role Type Field -->
						<Field.Field>
							<Field.Label for="editAccessType">Role Type</Field.Label>
							<div class="flex items-center gap-2">
								<Select.Root
									type="single"
									value={updateUser.fields.accessType.value()}
									onValueChange={handleEditAccessTypeChange}
								>
									<Select.Trigger id="editAccessType" class="flex-1">
										<Hammer />
										{editAccessTypeLabel}
									</Select.Trigger>
									<Select.Content>
										{#each accessTypes as type (type.value)}
											<Select.Item class="self-start" value={type.value}>{type.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>

								<!-- Delete Button -->
								<Button
									type="button"
									variant="destructive"
									class="gap-2"
									onclick={handleDeleteUser}
								>
									<Trash2 class="h-4 w-4" />
									Delete User
								</Button>
							</div>
							<input type="hidden" {...updateUser.fields.accessType.as('text')} />
							{#each updateUser.fields.accessType.issues() as issue, i (i)}
								<Field.Error>{issue.message}</Field.Error>
							{/each}
						</Field.Field>

						<!-- Agent-specific fields (shown only when accessType is 'agent') -->
						{#if editAccessType === 'agent'}
							<!-- Agent Role Field -->
							<Field.Field>
								<Field.Label for="editAgentRole">Agent Role</Field.Label>
								<Select.Root
									type="single"
									value={updateUser.fields.agentRole.value()}
									onValueChange={(v) => updateUser.fields.agentRole.set(v)}
								>
									<Select.Trigger id="editAgentRole">
										<Briefcase />
										{editAgentRoleLabel}
									</Select.Trigger>
									<Select.Content>
										{#each agentRoles as role (role.value)}
											<Select.Item value={role.value}>{role.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...updateUser.fields.agentRole.as('text')} />
								{#each updateUser.fields.agentRole.issues() as issue, i (i)}
									<Field.Error>{issue.message}</Field.Error>
								{/each}
							</Field.Field>

							<!-- Agent Level Field -->
							<Field.Field>
								<Field.Label for="editAgentLevel">Agent Level</Field.Label>
								<Select.Root
									type="single"
									value={updateUser.fields.agentLevel.value()}
									onValueChange={(v) => updateUser.fields.agentLevel.set(v)}
								>
									<Select.Trigger id="editAgentLevel">
										<Trophy />
										{editAgentLevelLabel}
									</Select.Trigger>
									<Select.Content>
										{#each agentLevels as level (level.value)}
											<Select.Item value={level.value}>{level.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...updateUser.fields.agentLevel.as('text')} />
								{#each updateUser.fields.agentLevel.issues() as issue, i (i)}
									<Field.Error>{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						{/if}

						<!-- Update Button -->
						<Button type="submit" class="w-full" disabled={!!updateUser.pending}>
							{updateUser.pending ? 'Updating...' : 'Update Access'}
						</Button>
					</div>
				</form>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
