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
		'Sales Dashboard': LucideLayoutPanelTop,
		'AML Dashboard': LucideShield,
		Notifications: LucideBell,
		'Access Management': LucideShield,
		'Listing Management': LucideBuilding2,
		'View Listings': LucideList,
		'All Sales': LucideReceipt,
		'Team Management': LucideUsers,
		'Employee Management': LucideUsers,
		'Education Module': LucideGraduationCap,
		'Pending Sales': LucideClock,
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
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { getDefaultRoute, getMenuItems, isMenuItemActive, type AccessType } from '$lib/constants';
	import FullLogoDark from '@/svg/full-logo-dark.svelte';
	import type { ComponentProps } from 'svelte';
	import { onMount } from 'svelte';
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

	type SidebarNavItem = {
		title: string;
		url: string;
		icon?: typeof LucideLayoutPanelTop;
		isActive?: boolean;
		external?: boolean;
	};

	type SidebarNavSection = {
		title: string;
		items: SidebarNavItem[];
	};

	type AdminSidebarMode = 'control-panel' | 'dashboard-panel';

	const ADMIN_SIDEBAR_MODE_STORAGE_KEY = 'admin-sidebar-mode';
	const adminSidebarModeOptions: { value: AdminSidebarMode; label: string }[] = [
		{ value: 'control-panel', label: 'Control Panel' },
		{ value: 'dashboard-panel', label: 'Dashboard Panel' }
	];

	const adminSidebarModeDefaultRoutes: Record<AdminSidebarMode, string> = {
		'control-panel': '/admin/all-sales',
		'dashboard-panel': '/admin/finance-dashboard'
	};

	const adminDashboardPanelRoutes = new Set(['/admin/finance-dashboard', '/admin/aml-dashboard']);

	let adminSidebarMode = $state<AdminSidebarMode>('control-panel');

	const isAdminSidebarRole = $derived(
		data?.user?.role === 'admin' || data?.user?.role === 'super-admin'
	);

	onMount(() => {
		if (!browser || !isAdminSidebarRole) return;

		const storedMode = localStorage.getItem(ADMIN_SIDEBAR_MODE_STORAGE_KEY);
		if (storedMode === 'control-panel' || storedMode === 'dashboard-panel') {
			adminSidebarMode = storedMode;
		}
	});

	$effect(() => {
		if (!browser || !isAdminSidebarRole) return;
		localStorage.setItem(ADMIN_SIDEBAR_MODE_STORAGE_KEY, adminSidebarMode);
	});

	$effect(() => {
		if (!browser || !isAdminSidebarRole) return;

		const currentPath = page.url.pathname;
		if (!currentPath.startsWith('/admin')) return;

		const currentPathMode = adminDashboardPanelRoutes.has(currentPath)
			? 'dashboard-panel'
			: 'control-panel';

		if (currentPathMode !== adminSidebarMode) {
			goto(adminSidebarModeDefaultRoutes[adminSidebarMode], { replaceState: true });
		}
	});

	function handleAdminSidebarModeChange(value: string) {
		if (value !== 'control-panel' && value !== 'dashboard-panel') return;

		adminSidebarMode = value;
		goto(adminSidebarModeDefaultRoutes[value], { replaceState: true });
	}

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
		navBaseItems.map(
			(item): SidebarNavItem => ({
				...item,
				isActive: isMenuItemActive(item.url, page.url.pathname)
			})
		)
	);

	const adminControlPanelSections = $derived.by((): SidebarNavSection[] => {
		if (!isAdminSidebarRole) return [];

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

	const adminDashboardPanelSections = $derived.by((): SidebarNavSection[] => {
		if (!isAdminSidebarRole) return [];

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
				title: 'Dashboards',
				items: compact([
					{
						title: 'Finance Dashboard',
						url: navMap.get('/admin/finance-dashboard')?.url || '/admin/finance-dashboard',
						isActive: navMap.get('/admin/finance-dashboard')?.isActive,
						icon: navMap.get('/admin/finance-dashboard')?.icon,
						external: navMap.get('/admin/finance-dashboard')?.external
					},
					navMap.get('/admin/aml-dashboard')
				])
			}
		];
	});

	const activeAdminSidebarModeLabel = $derived(
		adminSidebarModeOptions.find((option) => option.value === adminSidebarMode)?.label ||
			'Control Panel'
	);

	const activeNavItems = $derived(isAdminSidebarRole ? [] : navItems);

	const activeNavSections = $derived.by((): SidebarNavSection[] => {
		if (!isAdminSidebarRole) return [];
		return adminSidebarMode === 'control-panel'
			? adminControlPanelSections
			: adminDashboardPanelSections;
	});

	const emptyStateMessage = $derived.by(() => {
		if (!isAdminSidebarRole) return undefined;
		return 'No menus are available for this panel yet.';
	});
</script>

<Sidebar.Root {collapsible} {...restProps}>
	{@const sidebar = useSidebar()}
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem
				class="flex items-center justify-between gap-2 overflow-hidden px-2 py-6 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
			>
				{#if sidebar.open}
					<button
						type="button"
						class="flex items-center overflow-hidden"
						onclick={() => data?.user?.role && goto(resolve(getDefaultRoute(data.user.role)))}
					>
						<FullLogoDark />
					</button>
				{/if}
				<Sidebar.Trigger class="text-white hover:bg-white/10 hover:text-white" />
			</Sidebar.MenuItem>
		</Sidebar.Menu>
		{#if isAdminSidebarRole}
			<div class="px-2 pb-2 group-data-[collapsible=icon]:hidden">
				<Select.Root
					type="single"
					bind:value={adminSidebarMode}
					onValueChange={handleAdminSidebarModeChange}
				>
					<Select.Trigger
						class="h-10 w-full border-white/10 bg-white/5 font-medium text-white hover:bg-white/10 focus-visible:border-white/20 focus-visible:ring-white/20"
					>
						{activeAdminSidebarModeLabel}
					</Select.Trigger>
					<Select.Content>
						{#each adminSidebarModeOptions as option (option.value)}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/if}
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={activeNavItems} sections={activeNavSections} {emptyStateMessage} />
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
