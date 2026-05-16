import { dev } from '$app/environment';

export const SESSION_TOKEN = 'ind-leads-session-token';
export const HOUR_IN_SECONDS = 60 * 55;
export const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
export const WEEK_IN_MILLISECONDS = 60 * 60 * 24 * 7 * 1000;
export const options = { path: '/', httpOnly: true, secure: !dev, maxAge: WEEK_IN_SECONDS };

export type AccessType =
	| 'admin'
	| 'agent'
	| 'compliance'
	| 'finance'
	| 'super-admin'
	| 'manager'
	| 'senior-manager'
	| 'general';

interface MenuItem {
	title: string;
	url: string;
	external?: boolean;
}

// Route prefixes allowed for each role
export const ROLE_ROUTES: Record<AccessType, string[]> = {
	admin: [
		'/admin',
		'/listing',
		'/dashboard',
		'/profile',
		'/hr',
		'/attendance',
		'/my-attendance',
		'/leave',
		'/holidays'
	],
	agent: ['/agent', '/listing', '/dashboard', '/profile', '/my-attendance', '/leave', '/holidays'],
	manager: [
		'/agent',
		'/listing',
		'/dashboard',
		'/profile',
		'/my-attendance',
		'/leave',
		'/holidays'
	],
	'senior-manager': [
		'/agent',
		'/listing',
		'/dashboard',
		'/profile',
		'/my-attendance',
		'/leave',
		'/holidays'
	],
	compliance: [
		'/compliance',
		'/listing',
		'/dashboard',
		'/profile',
		'/my-attendance',
		'/leave',
		'/holidays'
	],
	finance: ['/finance', '/listing', '/dashboard', '/profile', '/my-attendance', '/leave'],
	general: ['/general', '/profile', '/my-attendance', '/leave', '/holidays'],
	'super-admin': [
		'/admin',
		'/agent',
		'/listing',
		'/compliance',
		'/finance',
		'/dashboard',
		'/profile',
		'/hr',
		'/attendance',
		'/my-attendance',
		'/leave',
		'/holidays'
	]
};

// Menu items for each role
const roleMenuItems: Record<AccessType, MenuItem[]> = {
	admin: [
		{ title: 'Dashboard', url: '/admin/dashboard' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listing/view-listings' },
		{ title: 'All Sales', url: '/admin/all-sales' },
		// { title: 'Team Management', url: '/admin/team-management' },
		{ title: 'Employee Management', url: '/hr/employees' },
		{ title: 'Attendance Record', url: '/attendance' },
		{ title: 'My Attendance', url: '/my-attendance' },
		{ title: 'My Leaves', url: '/leave' },
		{ title: 'Holiday Management', url: '/holidays' },
		{ title: 'Bulk Import', url: '/admin/bulk-import' }
	],
	agent: [
		{ title: 'Dashboard', url: '/agent/dashboard' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listing/view-listings' },
		{ title: 'Sales Tracker', url: '/agent/sales-tracker' },
		{ title: 'My Attendance', url: '/my-attendance' },
		{ title: 'My Leaves', url: '/leave' },
		{ title: 'Holiday Calendar', url: '/holidays' },
		{ title: 'Notifications', url: '/agent/notifications' }
	],
	manager: [
		{ title: 'Dashboard', url: '/agent/dashboard' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listing/view-listings' },
		{ title: 'Team Sales', url: '/agent/sales-tracker' },
		{ title: 'My Attendance', url: '/my-attendance' },
		{ title: 'My Leaves', url: '/leave' },
		{ title: 'Holiday Calendar', url: '/holidays' },
		{ title: 'Notifications', url: '/agent/notifications' }
	],
	'senior-manager': [
		{ title: 'Dashboard', url: '/agent/dashboard' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listing/view-listings' },
		{ title: 'Team Sales', url: '/agent/sales-tracker' },
		{ title: 'My Attendance', url: '/my-attendance' },
		{ title: 'My Leaves', url: '/leave' },
		{ title: 'Holiday Calendar', url: '/holidays' },
		{ title: 'Notifications', url: '/agent/notifications' }
	],
	compliance: [
		{ title: 'Compliance Dashboard', url: '/compliance/dashboard' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listing/view-listings' },
		{ title: 'Pending Sales', url: '/compliance/pending-sales' },
		{ title: 'Approved Sales', url: '/compliance/approved-sales' },
		{ title: 'Invoices', url: '/compliance/invoices' },
		{ title: "Next Month's Sales", url: '/compliance/next-months-sales' },
		{ title: 'My Attendance', url: '/my-attendance' },
		{ title: 'My Leaves', url: '/leave' },
		{ title: 'Holiday Calendar', url: '/holidays' }
	],
	finance: [
		{ title: 'Finance Dashboard', url: '/finance/dashboard' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listing/view-listings' },
		{ title: 'Pending Sales', url: '/finance/pending-sales' },
		{ title: 'Approved Sales', url: '/finance/approved-sales' },
		{ title: 'Invoices', url: '/finance/invoices' },
		{ title: "Next Month's Sales", url: '/finance/next-months-sales' },
		{ title: 'My Attendance', url: '/my-attendance' },
		{ title: 'My Leaves', url: '/leave' }
	],
	general: [
		{ title: 'Dashboard', url: '/general/dashboard' },
		{ title: 'My Attendance', url: '/my-attendance' },
		{ title: 'My Leaves', url: '/leave' },
		{ title: 'Holiday Calendar', url: '/holidays' }
	],
	'super-admin': [
		{ title: 'Dashboard', url: '/admin/dashboard' },
		{ title: 'Listing Management', url: '/listing/listing-management' },
		{ title: 'View Listings', url: '/listing/view-listings' },
		{ title: 'All Sales', url: '/admin/all-sales' },
		// { title: 'Team Management', url: '/admin/team-management' },
		{ title: 'Bulk Import', url: '/admin/bulk-import' },
		{ title: 'Agent Dashboard', url: '/agent/dashboard' },
		{ title: 'Sales Tracker', url: '/agent/sales-tracker' },
		{ title: 'Compliance Dashboard', url: '/compliance/dashboard' },
		{ title: 'Finance Dashboard', url: '/finance/dashboard' },
		{ title: 'Employee Management', url: '/hr/employees' },
		{ title: 'Attendance Record', url: '/attendance' },
		{ title: 'My Attendance', url: '/my-attendance' },
		{ title: 'My Leaves', url: '/leave' },
		{ title: 'Holiday Management', url: '/holidays' }
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
		case 'manager':
		case 'senior-manager':
			return '/agent/dashboard';
		case 'compliance':
			return '/compliance/dashboard';
		case 'finance':
			return '/finance/dashboard';
		case 'general':
			return '/general/dashboard';
		default:
			return '/dashboard';
	}
}

// Check if a menu item is active
export function isMenuItemActive(itemUrl: string, currentPath: string): boolean {
	return currentPath.startsWith(itemUrl);
}
