<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { getInitials } from '@/utils';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

	let { user }: { user: { name: string; email: string; avatar: string | undefined } } = $props();
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton
			onclick={() => goto('/profile')}
			size="lg"
			class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
		>
			<Avatar.Root class="size-8 rounded-lg">
				<Avatar.Image src={user.avatar} alt={user.name} />
				<Avatar.Fallback class="rounded-lg">{getInitials(user.name)}</Avatar.Fallback>
			</Avatar.Root>
			<div class="grid flex-1 text-start text-sm leading-tight">
				<span class="truncate font-medium">{user.name}</span>
				<span class="truncate text-xs">{user.email}</span>
			</div>
			<ChevronsUpDownIcon class="ms-auto size-4" />
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
