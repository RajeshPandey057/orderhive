import { getContext, setContext } from 'svelte';

// Role types
export type AccessType = 'admin' | 'agent' | 'compliance' | 'finance' | 'super-admin';

export interface RoleState {
	role: AccessType | null;
	email: string | null;
	initialized: boolean;
	loading: boolean;
}

// Menu items configuration per role
export interface MenuItem {
	title: string;
	url: string;
	icon?: unknown;
}

// Route prefixes allowed for each role
const ROLE_ROUTES: Record<AccessType, string[]> = {
	admin: ['/admin', '/dashboard', '/profile'],
	agent: ['/agent', '/dashboard', '/profile'],
	compliance: ['/compliance', '/dashboard', '/profile'],
	finance: ['/finance', '/dashboard', '/profile'],
	'super-admin': ['/admin', '/agent', '/compliance', '/finance', '/dashboard', '/profile']
};

// Menu configurations for each role
export const ROLE_MENUS: Record<AccessType, Omit<MenuItem, 'icon'>[]> = {
	agent: [
		{ title: 'Dashboard', url: '/agent/dashboard' },
		{ title: 'Sales Tracker', url: '/agent/sales-tracker' },
		{ title: 'Notifications', url: '/agent/notifications' }
	],
	admin: [
		{ title: 'Dashboard', url: '/admin/dashboard' },
		{ title: 'Access Management', url: '/admin/access-management' },
		{ title: 'All Sales', url: '/admin/all-sales' },
		{ title: 'Team Management', url: '/admin/team-management' }
	],
	compliance: [
		{ title: 'Dashboard', url: '/compliance/dashboard' },
		{ title: 'Pending Sales', url: '/compliance/pending-sales' },
		{ title: 'Approved Sales', url: '/compliance/approved-sales' },
		{ title: "Next Month's Sales", url: '/compliance/next-months-sales' },
		{ title: 'Invoices', url: '/compliance/invoices' }
	],
	finance: [
		{ title: 'Dashboard', url: '/finance/dashboard' },
		{ title: 'Pending Sales', url: '/finance/pending-sales' },
		{ title: 'Approved Sales', url: '/finance/approved-sales' },
		{ title: "Next Month's Sales", url: '/finance/next-months-sales' },
		{ title: 'Invoices', url: '/finance/invoices' }
	],
	'super-admin': [
		{ title: 'Dashboard', url: '/admin/dashboard' },
		{ title: 'Access Management', url: '/admin/access-management' },
		{ title: 'All Sales', url: '/admin/all-sales' },
		{ title: 'Team Management', url: '/admin/team-management' },
		{ title: 'Agent Dashboard', url: '/agent/dashboard' },
		{ title: 'Compliance Dashboard', url: '/compliance/dashboard' },
		{ title: 'Finance Dashboard', url: '/finance/dashboard' }
	]
};

const ROLE_CONTEXT_KEY = Symbol('role-context');
const ROLE_STORAGE_KEY = 'ind-deals-role';

/**
 * Creates a reactive role state manager
 */
function createRoleState() {
	let role = $state<AccessType | null>(null);
	let email = $state<string | null>(null);
	let initialized = $state(false);
	let loading = $state(false);

	return {
		// Getters for reactive access
		get role() {
			return role;
		},
		get email() {
			return email;
		},
		get initialized() {
			return initialized;
		},
		get loading() {
			return loading;
		},
		get menuItems() {
			return role ? ROLE_MENUS[role] : [];
		},

		/**
		 * Initialize role from localStorage if available
		 */
		initFromStorage(): boolean {
			if (typeof window === 'undefined') return false;

			try {
				const stored = localStorage.getItem(ROLE_STORAGE_KEY);
				if (stored) {
					const data = JSON.parse(stored) as { role: AccessType; email: string };
					if (data.role && data.email) {
						role = data.role;
						email = data.email;
						initialized = true;
						return true;
					}
				}
			} catch {
				console.warn('Failed to parse role from localStorage');
			}
			return false;
		},

		/**
		 * Set the role and persist to localStorage
		 */
		setRole(newRole: AccessType, userEmail: string) {
			role = newRole;
			email = userEmail;
			initialized = true;
			loading = false;

			if (typeof window !== 'undefined') {
				localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify({ role: newRole, email: userEmail }));
			}
		},

		/**
		 * Set loading state
		 */
		setLoading(isLoading: boolean) {
			loading = isLoading;
		},

		/**
		 * Clear the role and remove from localStorage
		 */
		clear() {
			role = null;
			email = null;
			initialized = false;
			loading = false;

			if (typeof window !== 'undefined') {
				localStorage.removeItem(ROLE_STORAGE_KEY);
			}
		},

		/**
		 * Check if user can access a given route
		 */
		canAccessRoute(pathname: string): boolean {
			if (!role) return false;

			const allowedPrefixes = ROLE_ROUTES[role];
			return allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
		},

		/**
		 * Get the default redirect route for the current role
		 */
		getDefaultRoute(): string {
			if (!role) return '/';

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
		},

		/**
		 * Check if a menu item is active based on current pathname
		 */
		isMenuItemActive(menuUrl: string, currentPathname: string): boolean {
			// Exact match or starts with (for nested routes)
			return currentPathname === menuUrl || currentPathname.startsWith(menuUrl + '/');
		}
	};
}

export type RoleManager = ReturnType<typeof createRoleState>;

/**
 * Set up the role context in a layout component
 */
export function setRoleContext(): RoleManager {
	const roleState = createRoleState();
	setContext(ROLE_CONTEXT_KEY, roleState);
	return roleState;
}

/**
 * Get the role context from a child component
 */
export function getRoleContext(): RoleManager {
	const context = getContext<RoleManager>(ROLE_CONTEXT_KEY);
	if (!context) {
		throw new Error(
			'Role context not found. Make sure setRoleContext() is called in a parent component.'
		);
	}
	return context;
}

/**
 * Check if role context exists (useful for optional usage)
 */
export function hasRoleContext(): boolean {
	try {
		getContext<RoleManager>(ROLE_CONTEXT_KEY);
		return true;
	} catch {
		return false;
	}
}
