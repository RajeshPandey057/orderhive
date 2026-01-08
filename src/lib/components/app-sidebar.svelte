<script lang="ts" module>
	import LucideBell from '~icons/lucide/bell';
	import LucideBookMarked from '~icons/lucide/book-marked';
	import LucideCalendarClock from '~icons/lucide/calendar-clock';
	import LucideClipboardCheck from '~icons/lucide/clipboard-check';
	import LucideFileText from '~icons/lucide/file-text';
	import LucideLayoutPanelTop from '~icons/lucide/layout-panel-top';
	import LucideReceipt from '~icons/lucide/receipt';
	import LucideShield from '~icons/lucide/shield';
	import LucideUserCog from '~icons/lucide/user-cog';
	import LucideUsers from '~icons/lucide/users';

	// Icon mapping for menu items
	const iconMap: Record<string, typeof LucideLayoutPanelTop> = {
		Dashboard: LucideLayoutPanelTop,
		'Sales Tracker': LucideBookMarked,
		Notifications: LucideBell,
		'Access Management': LucideShield,
		'All Sales': LucideReceipt,
		'Team Management': LucideUsers,
		'Pending Sales': LucideClipboardCheck,
		'Approved Sales': LucideClipboardCheck,
		"Next Month's Sales": LucideCalendarClock,
		Invoices: LucideFileText,
		'Agent Dashboard': LucideLayoutPanelTop,
		'Compliance Dashboard': LucideLayoutPanelTop,
		'Finance Dashboard': LucideLayoutPanelTop,
		'User Management': LucideUserCog
	};

	function getIconForMenuItem(title: string): typeof LucideLayoutPanelTop {
		return iconMap[title] || LucideLayoutPanelTop;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getRoleContext } from '$lib/auth/role.svelte';
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

	// Get role context
	const roleManager = getRoleContext();

	// Build navigation items dynamically based on role
	const navItems = $derived(
		roleManager.menuItems.map((item) => ({
			title: item.title,
			url: item.url,
			icon: getIconForMenuItem(item.title),
			isActive: roleManager.isMenuItemActive(item.url, page.url.pathname)
		}))
	);
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem class="px-2 py-6" onclick={() => goto(roleManager.getDefaultRoute())}>
				<FullLogo />
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={navItems} />
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
