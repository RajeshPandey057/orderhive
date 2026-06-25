<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { getInitials } from '$lib/utils.js';
	import Loader2 from '~icons/lucide/loader-2';
	import Plus from '~icons/lucide/plus';
	import Trash2 from '~icons/lucide/trash-2';
	import UserRound from '~icons/lucide/user-round';
	import { searchUsers as searchUsersRemote } from '../../routes/(secure)/users.remote';

	export type SplitEntry = {
		key: number;
		agentId: string;
		agentName: string;
		agentEmail: string;
		agentPhotoURL?: string;
		ownerRole: 'caller' | 'closer' | 'closer2' | 'closer3';
		percentage: number;
		managerEmail?: string;
		managerName?: string;
		seniorManagerEmail?: string;
		seniorManagerName?: string;
	};

	interface Props {
		splits: SplitEntry[];
		disabled?: boolean;
		onsplitschange?: (splits: SplitEntry[]) => void;
	}

	let { splits = $bindable([]), disabled = false, onsplitschange }: Props = $props();

	const PRESETS = [
		{ label: '100 / 0 / 0', caller: 100, closer: 0, third: 0 },
		{ label: '55 / 45 / 0', caller: 55, closer: 45, third: 0 },
		{ label: '70 / 30 / 0', caller: 70, closer: 30, third: 0 },
		{ label: '33 / 34 / 33', caller: 33, closer: 34, third: 33 }
	];

	function applyPreset(preset: { caller: number; closer: number; third: number }) {
		let updated = splits.map((s) => {
			if (s.ownerRole === 'caller') return { ...s, percentage: preset.caller };
			if (s.ownerRole === 'closer') return { ...s, percentage: preset.closer };
			return { ...s, percentage: 0 };
		});
		// If third > 0 and no closer2 row exists, add one
		const hasCloser2 = updated.some((s) => s.ownerRole === 'closer2');
		if (preset.third > 0 && !hasCloser2) {
			const newKey = nextKey++;
			updated = [
				...updated,
				{
					key: newKey,
					agentId: '',
					agentName: '',
					agentEmail: '',
					ownerRole: 'closer2',
					percentage: preset.third,
					managerEmail: '',
					seniorManagerEmail: ''
				}
			];
			agentPopoverOpen[newKey] = false;
			agentSearchValues[newKey] = '';
			agentSearchResults[newKey] = [];
			managerPopoverOpen[newKey] = false;
			managerSearchValues[newKey] = '';
			managerSearchResults[newKey] = [];
			smPopoverOpen[newKey] = false;
			smSearchValues[newKey] = '';
			smSearchResults[newKey] = [];
		} else if (preset.third > 0 && hasCloser2) {
			updated = updated.map((s) =>
				s.ownerRole === 'closer2' ? { ...s, percentage: preset.third } : s
			);
		}
		splits = updated;
		onsplitschange?.(splits);
	}

	let nextKey = $state(splits.length > 0 ? Math.max(...splits.map((s) => s.key)) + 1 : 0);

	type UserResult = {
		id: string;
		email: string | null;
		displayName?: string | null;
		photoURL?: string | null;
		reportingManagerEmail?: string | null;
		seniorManagerEmail?: string | null;
	};

	// --- Agent search state ---
	let agentPopoverOpen = $state<Record<number, boolean>>({});
	let agentSearchValues = $state<Record<number, string>>({});
	let agentSearchResults = $state<Record<number, UserResult[]>>({});
	let agentSearchLoading = $state<Record<number, boolean>>({});
	let agentDebounceTimers: Record<number, ReturnType<typeof setTimeout>> = {};

	// --- Manager search state ---
	let managerPopoverOpen = $state<Record<number, boolean>>({});
	let managerSearchValues = $state<Record<number, string>>({});
	let managerSearchResults = $state<Record<number, UserResult[]>>({});
	let managerSearchLoading = $state<Record<number, boolean>>({});
	let managerDebounceTimers: Record<number, ReturnType<typeof setTimeout>> = {};

	// --- Senior Manager search state ---
	let smPopoverOpen = $state<Record<number, boolean>>({});
	let smSearchValues = $state<Record<number, string>>({});
	let smSearchResults = $state<Record<number, UserResult[]>>({});
	let smSearchLoading = $state<Record<number, boolean>>({});
	let smDebounceTimers: Record<number, ReturnType<typeof setTimeout>> = {};

	const totalPercentage = $derived(splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0));
	const remaining = $derived(100 - totalPercentage);
	const isValid = $derived(Math.round(totalPercentage * 100) / 100 === 100);

	const ROLE_LABELS: Record<string, string> = {
		caller: 'Caller',
		closer: 'Closer',
		closer2: 'Closer 2',
		closer3: 'Closer 3'
	};
	const getRoleLabel = (role: string) => ROLE_LABELS[role] ?? role;

	const ROLE_BADGE_CLASSES: Record<string, string> = {
		caller: 'bg-blue-100 text-blue-700',
		closer: 'bg-purple-100 text-purple-700',
		closer2: 'bg-indigo-100 text-indigo-700',
		closer3: 'bg-violet-100 text-violet-700'
	};
	const getRoleBadgeClass = (role: string) =>
		ROLE_BADGE_CLASSES[role] ?? 'bg-gray-100 text-gray-600';

	const getRemainingBadgeClass = () => {
		if (remaining === 0) return 'bg-green-100 text-green-700';
		if (remaining < 0) return 'bg-red-100 text-red-700';
		return 'bg-amber-100 text-amber-700';
	};

	// Generic debounced search
	async function doSearch(
		loading: Record<number, boolean>,
		results: Record<number, UserResult[]>,
		key: number,
		term: string,
		roleFilter?: 'manager' | 'senior-manager'
	) {
		loading[key] = true;
		try {
			results[key] = await searchUsersRemote({ q: term.trim(), ...(roleFilter && { roleFilter }) });
		} catch {
			results[key] = [];
		} finally {
			loading[key] = false;
		}
	}

	function handleAgentSearchInput(key: number, value: string) {
		agentSearchValues[key] = value;
		if (agentDebounceTimers[key]) clearTimeout(agentDebounceTimers[key]);
		agentDebounceTimers[key] = setTimeout(
			() => doSearch(agentSearchLoading, agentSearchResults, key, value),
			300
		);
	}

	function handleManagerSearchInput(key: number, value: string) {
		managerSearchValues[key] = value;
		if (managerDebounceTimers[key]) clearTimeout(managerDebounceTimers[key]);
		managerDebounceTimers[key] = setTimeout(
			() => doSearch(managerSearchLoading, managerSearchResults, key, value, 'manager'),
			300
		);
	}

	function handleSmSearchInput(key: number, value: string) {
		smSearchValues[key] = value;
		if (smDebounceTimers[key]) clearTimeout(smDebounceTimers[key]);
		smDebounceTimers[key] = setTimeout(
			() => doSearch(smSearchLoading, smSearchResults, key, value, 'senior-manager'),
			300
		);
	}

	const normalizeEmail = (value: string) => value.trim().toLowerCase();

	async function findUserByEmail(email: string): Promise<UserResult | null> {
		const term = email.trim();
		if (!term) return null;
		try {
			const users = await searchUsersRemote({ q: term });
			const match = users.find((user) => normalizeEmail(user.email ?? '') === normalizeEmail(term));
			return match ?? null;
		} catch {
			return null;
		}
	}

	function applyHierarchyDefaults(split: SplitEntry, user: UserResult): SplitEntry {
		const managerEmail = (user.reportingManagerEmail ?? '').trim();
		const seniorManagerEmail = (user.seniorManagerEmail ?? '').trim();
		// Only fill in fields that are currently empty — preserve any manually selected values
		const newManagerEmail = split.managerEmail?.trim() ? split.managerEmail : managerEmail;
		const newSeniorManagerEmail = split.seniorManagerEmail?.trim()
			? split.seniorManagerEmail
			: seniorManagerEmail;
		return {
			...split,
			managerEmail: newManagerEmail,
			seniorManagerEmail: newSeniorManagerEmail,
			managerName: split.managerName?.trim() ? split.managerName : newManagerEmail,
			seniorManagerName: split.seniorManagerName?.trim()
				? split.seniorManagerName
				: newSeniorManagerEmail
		};
	}

	$effect(() => {
		const missingHierarchyRows = splits.filter(
			(split) =>
				split.agentEmail && (!split.managerEmail?.trim() || !split.seniorManagerEmail?.trim())
		);
		if (missingHierarchyRows.length === 0) return;

		void (async () => {
			let nextSplits = splits;
			for (const row of missingHierarchyRows) {
				const user = await findUserByEmail(row.agentEmail);
				if (!user) continue;
				nextSplits = nextSplits.map((split) =>
					split.key === row.key ? applyHierarchyDefaults(split, user) : split
				);
			}
			// Only commit if at least one value actually changed — prevents infinite loop
			// when an agent has no hierarchy data stored in Firestore
			const hasChanges = nextSplits.some((ns) => {
				const orig = splits.find((s) => s.key === ns.key);
				return (
					orig &&
					(ns.managerEmail !== orig.managerEmail ||
						ns.seniorManagerEmail !== orig.seniorManagerEmail)
				);
			});
			if (hasChanges) {
				splits = nextSplits;
				onsplitschange?.(splits);
			}
		})();
	});

	function selectAgent(key: number, agent: UserResult) {
		const email = agent.email ?? '';
		const name = agent.displayName ?? email;
		splits = splits.map((s) => {
			if (s.key !== key) return s;
			// Preserve any already-selected manager/SM — only fill from agent profile if currently empty
			const newManagerEmail = s.managerEmail?.trim()
				? s.managerEmail
				: (agent.reportingManagerEmail ?? '').trim();
			const newSeniorManagerEmail = s.seniorManagerEmail?.trim()
				? s.seniorManagerEmail
				: (agent.seniorManagerEmail ?? '').trim();
			return {
				...s,
				agentId: agent.id,
				agentEmail: email,
				agentName: name,
				agentPhotoURL: agent.photoURL ?? undefined,
				managerEmail: newManagerEmail,
				seniorManagerEmail: newSeniorManagerEmail,
				managerName: s.managerName?.trim() ? s.managerName : newManagerEmail,
				seniorManagerName: s.seniorManagerName?.trim() ? s.seniorManagerName : newSeniorManagerEmail
			};
		});
		agentPopoverOpen[key] = false;
		onsplitschange?.(splits);
	}

	function selectManager(key: number, user: UserResult) {
		const email = user.email ?? '';
		splits = splits.map((s) =>
			s.key === key
				? {
						...s,
						managerEmail: email,
						managerName: user.displayName ?? email
					}
				: s
		);
		managerPopoverOpen[key] = false;
		onsplitschange?.(splits);
	}

	function selectSeniorManager(key: number, user: UserResult) {
		const email = user.email ?? '';
		splits = splits.map((s) =>
			s.key === key
				? {
						...s,
						seniorManagerEmail: email,
						seniorManagerName: user.displayName ?? email
					}
				: s
		);
		smPopoverOpen[key] = false;
		onsplitschange?.(splits);
	}

	function updatePercentage(key: number, value: string) {
		const pct = parseFloat(value) || 0;
		splits = splits.map((s) => (s.key === key ? { ...s, percentage: pct } : s));
		onsplitschange?.(splits);
	}

	function addAgent() {
		const newKey = nextKey++;
		// Assign roles in order: closer, closer2, closer3
		const hasCloser = splits.some((s) => s.ownerRole === 'closer');
		const hasCloser2 = splits.some((s) => s.ownerRole === 'closer2');
		const nextRole = !hasCloser ? 'closer' : !hasCloser2 ? 'closer2' : 'closer3';
		splits = [
			...splits,
			{
				key: newKey,
				agentId: '',
				agentName: '',
				agentEmail: '',
				ownerRole: nextRole,
				percentage: 0,
				managerEmail: '',
				seniorManagerEmail: ''
			}
		];
		agentPopoverOpen[newKey] = false;
		agentSearchValues[newKey] = '';
		agentSearchResults[newKey] = [];
		managerPopoverOpen[newKey] = false;
		managerSearchValues[newKey] = '';
		managerSearchResults[newKey] = [];
		smPopoverOpen[newKey] = false;
		smSearchValues[newKey] = '';
		smSearchResults[newKey] = [];
		onsplitschange?.(splits);
	}

	function removeAgent(key: number) {
		splits = splits.filter((s) => s.key !== key);
		for (const store of [
			agentPopoverOpen,
			agentSearchValues,
			agentSearchResults,
			managerPopoverOpen,
			managerSearchValues,
			managerSearchResults,
			smPopoverOpen,
			smSearchValues,
			smSearchResults
		]) {
			delete store[key];
		}
		onsplitschange?.(splits);
	}
</script>

<div class="space-y-3">
	<!-- Header row with remaining indicator -->
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium text-foreground">Deal Split</span>
		<span
			class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold {getRemainingBadgeClass()}"
		>
			{#if remaining === 0}
				Split 100% ✓
			{:else if remaining < 0}
				Over by {Math.abs(remaining).toFixed(1)}%
			{:else}
				Remaining: {remaining.toFixed(1)}%
			{/if}
		</span>
	</div>

	<!-- Preset buttons -->
	{#if !disabled}
		<div class="flex flex-wrap gap-1.5">
			<span class="flex items-center text-xs text-muted-foreground">Preset:</span>
			{#each PRESETS as preset (preset.label)}
				<button
					type="button"
					class="rounded border border-input bg-muted/40 px-2 py-0.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
					onclick={() => applyPreset(preset)}
				>
					{preset.label}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Split rows -->
	{#each splits as split (split.key)}
		{@const isLocked = split.ownerRole === 'caller'}
		{@const requiresManager =
			split.ownerRole === 'caller' ||
			split.ownerRole === 'closer' ||
			split.ownerRole === 'closer2' ||
			split.ownerRole === 'closer3'}
		<div class="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-2">
			<!-- Agent row -->
			<div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
				<!-- Role badge -->
				<span
					class="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium {getRoleBadgeClass(
						split.ownerRole
					)}"
				>
					{getRoleLabel(split.ownerRole)}
				</span>

				<!-- Agent picker -->
				<Popover.Root
					open={agentPopoverOpen[split.key] ?? false}
					onOpenChange={(v) => (agentPopoverOpen[split.key] = v)}
				>
					<Popover.Trigger
						{disabled}
						class="flex h-9 min-w-48 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if split.agentId}
							<Avatar.Root class="h-5 w-5">
								{#if split.agentPhotoURL}
									<Avatar.Image src={split.agentPhotoURL} alt={split.agentName} />
								{/if}
								<Avatar.Fallback class="text-[10px]">{getInitials(split.agentName)}</Avatar.Fallback
								>
							</Avatar.Root>
							<span class="truncate">{split.agentName}</span>
						{:else}
							<UserRound class="h-4 w-4 text-muted-foreground" />
							<span class="text-muted-foreground">Select agent…</span>
						{/if}
					</Popover.Trigger>
					<Popover.Content class="w-72 p-0" align="start">
						<Command.Root>
							<Command.Input
								placeholder="Search agents…"
								value={agentSearchValues[split.key] ?? ''}
								oninput={(e) =>
									handleAgentSearchInput(split.key, (e.target as HTMLInputElement).value)}
							/>
							<Command.List>
								{#if agentSearchLoading[split.key]}
									<div class="flex items-center justify-center py-4">
										<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
									</div>
								{:else if (agentSearchResults[split.key] ?? []).length === 0}
									<Command.Empty>
										{(agentSearchValues[split.key] ?? '').trim()
											? 'No users found.'
											: 'Type to search…'}
									</Command.Empty>
								{:else}
									<Command.Group>
										{#each agentSearchResults[split.key] ?? [] as agent (agent.id)}
											<Command.Item value={agent.id} onSelect={() => selectAgent(split.key, agent)}>
												<Avatar.Root class="h-5 w-5">
													{#if agent.photoURL}
														<Avatar.Image src={agent.photoURL} alt={agent.displayName} />
													{/if}
													<Avatar.Fallback class="text-[10px]">
														{getInitials(agent.displayName ?? agent.email ?? 'User')}
													</Avatar.Fallback>
												</Avatar.Root>
												<div class="ml-2 min-w-0">
													<div class="truncate text-sm font-medium">
														{agent.displayName ?? agent.email ?? 'User'}
													</div>
													<div class="truncate text-xs text-muted-foreground">{agent.email}</div>
												</div>
											</Command.Item>
										{/each}
									</Command.Group>
								{/if}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>

				<!-- Percentage input -->
				<div class="flex items-center gap-1">
					<Input
						type="number"
						min="0"
						max="100"
						step="0.01"
						{disabled}
						value={split.percentage}
						oninput={(e) => updatePercentage(split.key, (e.target as HTMLInputElement).value)}
						class="w-20 [appearance:textfield] text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						placeholder="0"
					/>
					<span class="text-sm text-muted-foreground">%</span>
				</div>

				<!-- Remove button (only for closer2/closer3 rows) -->
				{#if !isLocked && !disabled}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						class="h-8 w-8 text-destructive hover:bg-destructive/10"
						onclick={() => removeAgent(split.key)}
					>
						<Trash2 class="h-3.5 w-3.5" />
					</Button>
				{:else}
					<div class="h-8 w-8"></div>
				{/if}
			</div>

			<!-- Manager / Senior Manager row -->
			<div class="grid grid-cols-2 gap-2 pl-1">
				<!-- Manager picker -->
				<div class="space-y-0.5">
					<span class="text-[10px] font-medium text-muted-foreground">
						Manager{requiresManager ? ' *' : ''}
					</span>
					<Popover.Root
						open={managerPopoverOpen[split.key] ?? false}
						onOpenChange={(v) => (managerPopoverOpen[split.key] = v)}
					>
						<Popover.Trigger
							{disabled}
							class="flex h-8 w-full items-center justify-start gap-1.5 rounded-md border border-input bg-background px-2.5 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 {requiresManager &&
							!split.managerEmail
								? 'border-destructive/60'
								: ''}"
						>
							{#if split.managerEmail}
								<Avatar.Root class="h-4 w-4">
									<Avatar.Fallback class="text-[8px]">
										{getInitials(split.managerName ?? split.managerEmail)}
									</Avatar.Fallback>
								</Avatar.Root>
								<span class="truncate">{split.managerName ?? split.managerEmail}</span>
							{:else}
								<UserRound class="h-3 w-3 text-muted-foreground" />
								<span class="text-muted-foreground">
									{requiresManager ? 'Select manager…' : 'Manager (optional)'}
								</span>
							{/if}
						</Popover.Trigger>
						<Popover.Content class="w-72 p-0" align="start">
							<Command.Root>
								<Command.Input
									placeholder="Search managers…"
									value={managerSearchValues[split.key] ?? ''}
									oninput={(e) =>
										handleManagerSearchInput(split.key, (e.target as HTMLInputElement).value)}
								/>
								<Command.List>
									{#if managerSearchLoading[split.key]}
										<div class="flex items-center justify-center py-4">
											<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
										</div>
									{:else if (managerSearchResults[split.key] ?? []).length === 0}
										<Command.Empty>
											{(managerSearchValues[split.key] ?? '').trim()
												? 'No users found.'
												: 'Type to search…'}
										</Command.Empty>
									{:else}
										<Command.Group>
											{#each managerSearchResults[split.key] ?? [] as user (user.id)}
												<Command.Item
													value={user.id}
													onSelect={() => selectManager(split.key, user)}
												>
													<Avatar.Root class="h-5 w-5">
														{#if user.photoURL}
															<Avatar.Image src={user.photoURL} alt={user.displayName} />
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

				<!-- Senior Manager picker -->
				<div class="space-y-0.5">
					<span class="text-[10px] font-medium text-muted-foreground">
						Senior Manager{requiresManager ? ' *' : ''}
					</span>
					<Popover.Root
						open={smPopoverOpen[split.key] ?? false}
						onOpenChange={(v) => (smPopoverOpen[split.key] = v)}
					>
						<Popover.Trigger
							{disabled}
							class="flex h-8 w-full items-center justify-start gap-1.5 rounded-md border border-input bg-background px-2.5 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 {requiresManager &&
							!split.seniorManagerEmail
								? 'border-destructive/60'
								: ''}"
						>
							{#if split.seniorManagerEmail}
								<Avatar.Root class="h-4 w-4">
									<Avatar.Fallback class="text-[8px]">
										{getInitials(split.seniorManagerName ?? split.seniorManagerEmail)}
									</Avatar.Fallback>
								</Avatar.Root>
								<span class="truncate">{split.seniorManagerName ?? split.seniorManagerEmail}</span>
							{:else}
								<UserRound class="h-3 w-3 text-muted-foreground" />
								<span class="text-muted-foreground">
									{requiresManager ? 'Select senior manager…' : 'Senior manager (optional)'}
								</span>
							{/if}
						</Popover.Trigger>
						<Popover.Content class="w-72 p-0" align="start">
							<Command.Root>
								<Command.Input
									placeholder="Search senior managers…"
									value={smSearchValues[split.key] ?? ''}
									oninput={(e) =>
										handleSmSearchInput(split.key, (e.target as HTMLInputElement).value)}
								/>
								<Command.List>
									{#if smSearchLoading[split.key]}
										<div class="flex items-center justify-center py-4">
											<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
										</div>
									{:else if (smSearchResults[split.key] ?? []).length === 0}
										<Command.Empty>
											{(smSearchValues[split.key] ?? '').trim()
												? 'No users found.'
												: 'Type to search…'}
										</Command.Empty>
									{:else}
										<Command.Group>
											{#each smSearchResults[split.key] ?? [] as user (user.id)}
												<Command.Item
													value={user.id}
													onSelect={() => selectSeniorManager(split.key, user)}
												>
													<Avatar.Root class="h-5 w-5">
														{#if user.photoURL}
															<Avatar.Image src={user.photoURL} alt={user.displayName} />
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
		</div>
	{/each}

	<!-- Add Agent button -->
	{#if !disabled}
		<Button type="button" variant="outline" size="sm" class="mt-1 w-full" onclick={addAgent}>
			<Plus class="mr-1.5 h-3.5 w-3.5" />
			Add Agent
		</Button>
	{/if}

	<!-- Validation feedback -->
	{#if !isValid && splits.length > 0}
		<p class="text-xs font-medium text-destructive">
			Split percentages must total exactly 100% (currently {totalPercentage.toFixed(1)}%)
		</p>
	{/if}
</div>
