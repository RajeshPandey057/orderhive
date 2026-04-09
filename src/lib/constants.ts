import { dev } from '$app/environment';

export const SESSION_TOKEN = 'ind-leads-session-token';
export const HOUR_IN_SECONDS = 60 * 55;
export const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
export const WEEK_IN_MILLISECONDS = 60 * 60 * 24 * 7 * 1000;
export const options = { path: '/', httpOnly: true, secure: !dev, maxAge: WEEK_IN_SECONDS };

export type AccessType = 'admin' | 'agent' | 'compliance' | 'finance' | 'super-admin';

interface MenuItem {
	title: string;
	url: string;
	external?: boolean;
}

// Route prefixes allowed for each role
export const ROLE_ROUTES: Record<AccessType, string[]> = {
	admin: ['/admin', '/listing', '/dashboard', '/profile'],
	agent: ['/agent', '/listing', '/dashboard', '/profile'],
	compliance: ['/compliance', '/dashboard', '/profile'],
	finance: ['/finance', '/dashboard', '/profile'],
	'super-admin': ['/admin', '/agent', '/listing', '/compliance', '/finance', '/dashboard', '/profile']
};

// Menu items for each role
const roleMenuItems: Record<AccessType, MenuItem[]> = {
	admin: [
		{ title: 'Dashboard', url: '/admin/dashboard' },
		{ title: 'Access Management', url: '/admin/access-management' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listings', external: true },
		{ title: 'All Sales', url: '/admin/all-sales' },
		{ title: 'Team Management', url: '/admin/team-management' },
		{ title: 'Bulk Import', url: '/admin/bulk-import' }
	],
	agent: [
		{ title: 'Dashboard', url: '/agent/dashboard' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listings', external: true },
		{ title: 'Sales Tracker', url: '/agent/sales-tracker' },
		{ title: 'Notifications', url: '/agent/notifications' }
	],
	compliance: [
		{ title: 'Compliance Dashboard', url: '/compliance/dashboard' },
		{ title: 'Pending Sales', url: '/compliance/pending-sales' },
		{ title: 'Approved Sales', url: '/compliance/approved-sales' },
		{ title: 'Invoices', url: '/compliance/invoices' },
		{ title: "Next Month's Sales", url: '/compliance/next-months-sales' }
	],
	finance: [
		{ title: 'Finance Dashboard', url: '/finance/dashboard' },
		{ title: 'Pending Sales', url: '/finance/pending-sales' },
		{ title: 'Approved Sales', url: '/finance/approved-sales' },
		{ title: 'Invoices', url: '/finance/invoices' },
		{ title: "Next Month's Sales", url: '/finance/next-months-sales' }
	],
	'super-admin': [
		{ title: 'Dashboard', url: '/admin/dashboard' },
		{ title: 'Access Management', url: '/admin/access-management' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listings', external: true },
		{ title: 'All Sales', url: '/admin/all-sales' },
		{ title: 'Team Management', url: '/admin/team-management' },
		{ title: 'Bulk Import', url: '/admin/bulk-import' },
		{ title: 'Agent Dashboard', url: '/agent/dashboard' },
		{ title: 'Sales Tracker', url: '/agent/sales-tracker' },
		{ title: 'Compliance Dashboard', url: '/compliance/dashboard' },
		{ title: 'Finance Dashboard', url: '/finance/dashboard' }
	]
};

// Get menu items for a role
export function getMenuItems(role: AccessType): MenuItem[] {
	return roleMenuItems[role] || [];
}

// Get default route for a role
export function getDefaultRoute(role: AccessType): string {
	switch (role) {
		case 'admin':
		case 'super-admin':
			return '/admin/dashboard';
		case 'agent':
			return '/agent/dashboard';
		case 'compliance':
			return '/compliance/dashboard';
		case 'finance':
			return '/finance/dashboard';
		default:
			return '/dashboard';
	}
}

// Check if a menu item is active
export function isMenuItemActive(itemUrl: string, currentPath: string): boolean {
	return currentPath.startsWith(itemUrl);
}
