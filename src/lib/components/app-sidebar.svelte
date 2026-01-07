<script lang="ts" module>
	import LucideBell from '~icons/lucide/bell';
	import LucideBookMarked from '~icons/lucide/book-marked';
	import LucideLayoutPanelTop from '~icons/lucide/layout-panel-top';

	const data = {
		navMain: [
			{
				title: 'Dashboard',
				url: '/dashboard',
				icon: LucideLayoutPanelTop,
				isActive: true
			},
			{
				title: 'Sales Tracker',
				url: '/agent/sales-tracker',
				icon: LucideBookMarked
			},
			{
				title: 'Notifications',
				url: '/agent/notifications',
				icon: LucideBell
			}
		]
	};
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import FullLogo from '@/svg/full-logo.svelte';
	import type { ComponentProps } from 'svelte';
	import { firekitUser } from 'svelte-firekit';
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem class="px-2 py-6" onclick={() => goto('/dashboard')}>
				<FullLogo />
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser
			user={{
				email: firekitUser?.email || '',
				name: firekitUser?.displayName || 'shadcn',
				avatar: firekitUser?.photoURL || undefined
			}}
		/>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
