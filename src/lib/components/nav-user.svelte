<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { getInitials } from '@/utils';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { firekitAuth } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';

	let {
		user
	}: { user: { name: string; email: string; avatar: string | undefined; role: string } } = $props();

	let loggingOut = $state(false);

	async function handleLogout() {
		if (loggingOut) return;
		loggingOut = true;
		try {
			await firekitAuth.signOut();
			toast.success('Logged out successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to logout');
			loggingOut = false;
		}
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton
			onclick={handleLogout}
			aria-disabled={loggingOut}
			class="h-10 text-sm text-[#222626]"
		>
			<LogOutIcon class="size-4" />
			<span>{loggingOut ? 'Logging out...' : 'Log Out'}</span>
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton
			onclick={() => goto('/profile')}
			size="lg"
			class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
		>
			<Avatar.Root class="size-8 rounded-lg">
				<Avatar.Image src={user.avatar} alt={user.name} />
				<Avatar.Fallback class="rounded-lg text-accent-foreground"
					>{getInitials(user.name)}</Avatar.Fallback
				>
			</Avatar.Root>
			<div class="grid flex-1 text-start text-sm leading-tight">
				<span class="truncate font-medium">{user.name}</span>
				<a href="mailto:{user.email}" class="truncate text-xs hover:underline">
					{user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : user.email}
				</a>
			</div>
			<ChevronsUpDownIcon class="ms-auto size-4" />
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
