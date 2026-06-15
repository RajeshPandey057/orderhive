<script lang="ts" module>
	import LucideBell from '~icons/lucide/bell';
	import LucideBookMarked from '~icons/lucide/book-marked';
	import LucideBuilding2 from '~icons/lucide/building-2';
	import LucideCalendarClock from '~icons/lucide/calendar-clock';
	import LucideCalendarDays from '~icons/lucide/calendar-days';
	import LucideClipboardCheck from '~icons/lucide/clipboard-check';
	import LucideClock from '~icons/lucide/clock';
	import LucideUploadCloud from '~icons/lucide/cloud-upload';
	import LucideFileText from '~icons/lucide/file-text';
	import LucideGraduationCap from '~icons/lucide/graduation-cap';
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
		'Employee Management': LucideUsers,
		'Education Module': LucideGraduationCap,
		'Pending Sales': LucideClipboardCheck,
		'Approved Sales': LucideClipboardCheck,
		"Next Month's Sales": LucideCalendarClock,
		'Holiday Calendar': LucideCalendarDays,
		'Holiday Management': LucideCalendarDays,
		Invoices: LucideFileText,
		'Agent Dashboard': LucideLayoutPanelTop,
		'Compliance Dashboard': LucideLayoutPanelTop,
		'Finance Dashboard': LucideLayoutPanelTop,
		'User Management': LucideUserCog,
		Profile: LucideUserCog,
		'Bulk Import': LucideUploadCloud,
		Attendance: LucideClock,
		'Attendance Management': LucideClock,
		'Attendance Record': LucideClock,
		'My Attendance': LucideClock,
		'Leave Management': LucideCalendarClock,
		'My Leaves': LucideCalendarClock
	};

	function getIconForMenuItem(title: string): typeof LucideLayoutPanelTop {
		return iconMap[title] || LucideLayoutPanelTop;
	}

	const compact = <T,>(items: (T | undefined)[]) =>
		items.filter((item): item is T => Boolean(item));
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { getDefaultRoute, getMenuItems, isMenuItemActive, type AccessType } from '$lib/constants';
	import FullLogoDark from '@/svg/full-logo-dark.svelte';
	import LogoDark from '@/svg/logo-dark.svelte';
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

	const navBaseItems = $derived(
		data?.user?.role
			? getMenuItems(data.user.role).map((item) => ({
					title: item.title,
					url: item.url,
					icon: getIconForMenuItem(item.title),
					external: item.external
				}))
			: []
	);

	const navItems = $derived(
		navBaseItems.map((item) => ({
			...item,
			isActive: isMenuItemActive(item.url, page.url.pathname)
		}))
	);

	const navSections = $derived.by(() => {
		if (!data?.user?.role) return [];
		if (data.user.role !== 'admin' && data.user.role !== 'super-admin') return [];

		const navMap = new Map(
			navItems.map((item) => [
				item.url,
				{
					title: item.title,
					url: item.url,
					isActive: item.isActive,
					icon: item.icon,
					external: item.external
				}
			])
		);

		return [
			{
				title: 'Deals',
				items: compact([
					{
						title: 'Sales Dashboard',
						url: navMap.get('/admin/dashboard')?.url || '/admin/dashboard',
						isActive: navMap.get('/admin/dashboard')?.isActive,
						icon: navMap.get('/admin/dashboard')?.icon,
						external: navMap.get('/admin/dashboard')?.external
					},
					{
						title: 'All Sales/Deals',
						url: navMap.get('/admin/all-sales')?.url || '/admin/all-sales',
						isActive: navMap.get('/admin/all-sales')?.isActive,
						icon: navMap.get('/admin/all-sales')?.icon,
						external: navMap.get('/admin/all-sales')?.external
					},
					navMap.get('/admin/bulk-import')
				])
			},
			{
				title: 'Listing',
				items: compact([
					navMap.get('/listing/view-listings'),
					navMap.get('/listing/listing-management')
				])
			},
			{
				title: 'Leave & Attendance',
				items: compact([
					navMap.get('/attendance'),
					navMap.get('/my-attendance'),
					navMap.get('/leave')
				])
			},
			{
				title: 'Employee Management',
				items: compact([
					{
						title: 'Employees & Access Mgmt',
						url: navMap.get('/hr/employees')?.url || '/hr/employees',
						isActive: isMenuItemActive('/hr/employees', page.url.pathname),
						icon: navMap.get('/hr/employees')?.icon,
						external: navMap.get('/hr/employees')?.external
					},
					navMap.get('/holidays')
				])
			},
			{
				title: 'Learning',
				items: compact([navMap.get('/education')])
			}
		];
	});
</script>

<Sidebar.Root {collapsible} {...restProps}>
	{@const sidebar = useSidebar()}
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem
				class="flex justify-center overflow-hidden px-2 py-6 group-data-[collapsible=icon]:px-0"
				onclick={() => data?.user?.role && goto(resolve(getDefaultRoute(data.user.role)))}
			>
				{#if sidebar.open}
					<FullLogoDark />
				{:else}
					<LogoDark />
				{/if}
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={navItems} sections={navSections} />
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
