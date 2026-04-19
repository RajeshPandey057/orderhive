<script lang="ts" module>
	import LucideBell from '~icons/lucide/bell';
	import LucideBuilding2 from '~icons/lucide/building-2';
	import LucideBookMarked from '~icons/lucide/book-marked';
	import LucideCalendarClock from '~icons/lucide/calendar-clock';
	import LucideClipboardCheck from '~icons/lucide/clipboard-check';
	import LucideUploadCloud from '~icons/lucide/cloud-upload';
	import LucideFileText from '~icons/lucide/file-text';
	import LucideLayoutPanelTop from '~icons/lucide/layout-panel-top';
	import LucideList from '~icons/lucide/list';
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
		'Listing Management': LucideBuilding2,
		'View Listings': LucideList,
		'All Sales': LucideReceipt,
		'Team Management': LucideUsers,
		'Pending Sales': LucideClipboardCheck,
		'Approved Sales': LucideClipboardCheck,
		"Next Month's Sales": LucideCalendarClock,
		Invoices: LucideFileText,
		'Agent Dashboard': LucideLayoutPanelTop,
		'Compliance Dashboard': LucideLayoutPanelTop,
		'Finance Dashboard': LucideLayoutPanelTop,
		'User Management': LucideUserCog,
		'Bulk Import': LucideUploadCloud
	};

	function getIconForMenuItem(title: string): typeof LucideLayoutPanelTop {
		return iconMap[title] || LucideLayoutPanelTop;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { getDefaultRoute, getMenuItems, isMenuItemActive, type AccessType } from '$lib/constants';
	import FullLogo from '@/svg/full-logo.svelte';
	import Logo from '@/svg/logo.svelte';
	import type { ComponentProps } from 'svelte';
	import { firekitUser } from 'svelte-firekit';
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		data,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		data: { user: { uid: string; email: string; role: AccessType } | null };
	} = $props();

	// Build navigation items dynamically based on role
	const navItems = $derived(
		data?.user?.role
			? getMenuItems(data.user.role).map((item) => ({
					title: item.title,
					url: item.url,
					icon: getIconForMenuItem(item.title),
					isActive: isMenuItemActive(item.url, page.url.pathname),
					external: item.external
				}))
			: []
	);
</script>

<Sidebar.Root {collapsible} {...restProps}>
	{@const sidebar = useSidebar()}
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem
				class="px-2 py-6"
				onclick={() => data?.user?.role && goto(getDefaultRoute(data.user.role))}
			>
				{#if sidebar.open}
					<FullLogo />
				{:else}
					<Logo />
				{/if}
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
				avatar: firekitUser?.photoURL || undefined,
				role: data?.user?.role || ''
			}}
		/>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
