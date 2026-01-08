<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { getRoleContext } from '@/auth/role.svelte';
	import { getInitials } from '@/utils';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

	let { user }: { user: { name: string; email: string; avatar: string | undefined } } = $props();
	const roleManager = getRoleContext();
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
				<a href="mailto:{user.email}" class="truncate text-xs hover:underline">
					{roleManager?.role
						? roleManager.role.charAt(0).toUpperCase() + roleManager.role.slice(1)
						: user.email}
				</a>
			</div>
			<ChevronsUpDownIcon class="ms-auto size-4" />
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
