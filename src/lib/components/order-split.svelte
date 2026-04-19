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
		ownerRole: 'caller' | 'closer' | 'extra';
		percentage: number;
	};

	interface Props {
		splits: SplitEntry[];
		disabled?: boolean;
		onsplitschange?: (splits: SplitEntry[]) => void;
	}

	let { splits = $bindable([]), disabled = false, onsplitschange }: Props = $props();

	let nextKey = $state(splits.length > 0 ? Math.max(...splits.map((s) => s.key)) + 1 : 0);

	// Per-row search state
	let popoverOpen = $state<Record<number, boolean>>({});
	let searchValues = $state<Record<number, string>>({});
	let searchResults = $state<
		Record<number, { id: string; email: string; displayName?: string; photoURL?: string }[]>
	>({});
	let searchLoading = $state<Record<number, boolean>>({});
	let debounceTimers: Record<number, ReturnType<typeof setTimeout>> = {};

	const totalPercentage = $derived(splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0));
	const remaining = $derived(100 - totalPercentage);
	const isValid = $derived(Math.round(totalPercentage * 100) / 100 === 100);

	const getRoleLabel = (role: 'caller' | 'closer' | 'extra') => {
		if (role === 'caller') return 'Caller';
		if (role === 'closer') return 'Closer';
		return 'Extra';
	};

	const getRoleBadgeClass = (role: 'caller' | 'closer' | 'extra') => {
		if (role === 'caller') return 'bg-blue-100 text-blue-700';
		if (role === 'closer') return 'bg-purple-100 text-purple-700';
		return 'bg-gray-100 text-gray-600';
	};

	const getRemainingBadgeClass = () => {
		if (remaining === 0) return 'bg-green-100 text-green-700';
		if (remaining < 0) return 'bg-red-100 text-red-700';
		return 'bg-amber-100 text-amber-700';
	};

	async function doSearch(key: number, term: string) {
		searchLoading[key] = true;
		try {
			searchResults[key] = await searchUsersRemote({ q: term.trim() });
		} catch {
			searchResults[key] = [];
		} finally {
			searchLoading[key] = false;
		}
	}

	function handleSearchInput(key: number, value: string) {
		searchValues[key] = value;
		if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
		debounceTimers[key] = setTimeout(() => doSearch(key, value), 300);
	}

	function selectAgent(
		key: number,
		agent: { id: string; email: string; displayName?: string; photoURL?: string }
	) {
		splits = splits.map((s) =>
			s.key === key
				? {
						...s,
						agentId: agent.id,
						agentEmail: agent.email,
						agentName: agent.displayName ?? agent.email,
						agentPhotoURL: agent.photoURL ?? undefined
					}
				: s
		);
		popoverOpen[key] = false;
		onsplitschange?.(splits);
	}

	function updatePercentage(key: number, value: string) {
		const pct = parseFloat(value) || 0;
		splits = splits.map((s) => (s.key === key ? { ...s, percentage: pct } : s));
		onsplitschange?.(splits);
	}

	function addAgent() {
		const newKey = nextKey++;
		splits = [
			...splits,
			{
				key: newKey,
				agentId: '',
				agentName: '',
				agentEmail: '',
				ownerRole: 'extra',
				percentage: 0
			}
		];
		popoverOpen[newKey] = false;
		searchValues[newKey] = '';
		searchResults[newKey] = [];
		onsplitschange?.(splits);
	}

	function removeAgent(key: number) {
		splits = splits.filter((s) => s.key !== key);
		delete popoverOpen[key];
		delete searchValues[key];
		delete searchResults[key];
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

	<!-- Split rows -->
	{#each splits as split (split.key)}
		{@const isLocked = split.ownerRole === 'caller' || split.ownerRole === 'closer'}
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
			<Popover.Root bind:open={popoverOpen[split.key]}>
				<Popover.Trigger
					{disabled}
					class="flex h-9 min-w-48 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if split.agentId}
						<Avatar.Root class="h-5 w-5">
							{#if split.agentPhotoURL}
								<Avatar.Image src={split.agentPhotoURL} alt={split.agentName} />
							{/if}
							<Avatar.Fallback class="text-[10px]">{getInitials(split.agentName)}</Avatar.Fallback>
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
							value={searchValues[split.key] ?? ''}
							oninput={(e) => handleSearchInput(split.key, (e.target as HTMLInputElement).value)}
						/>
						<Command.List>
							{#if searchLoading[split.key]}
								<div class="flex items-center justify-center py-4">
									<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
								</div>
							{:else if (searchResults[split.key] ?? []).length === 0}
								<Command.Empty>
									{(searchValues[split.key] ?? '').trim()
										? 'No agents found.'
										: 'Type to search agents…'}
								</Command.Empty>
							{:else}
								<Command.Group>
									{#each searchResults[split.key] ?? [] as agent (agent.id)}
										<Command.Item value={agent.id} onSelect={() => selectAgent(split.key, agent)}>
											<Avatar.Root class="h-5 w-5">
												{#if agent.photoURL}
													<Avatar.Image src={agent.photoURL} alt={agent.displayName} />
												{/if}
												<Avatar.Fallback class="text-[10px]"
													>{getInitials(agent.displayName ?? agent.email)}</Avatar.Fallback
												>
											</Avatar.Root>
											<div class="ml-2 min-w-0">
												<div class="truncate text-sm font-medium">
													{agent.displayName ?? agent.email}
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

			<!-- Remove button (only for 'extra' rows) -->
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
