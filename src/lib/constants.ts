import { dev } from '$app/environment';

export const SESSION_TOKEN = 'ind-leads-session-token';
export const HOUR_IN_SECONDS = 60 * 55;
export const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
export const WEEK_IN_MILLISECONDS = 60 * 60 * 24 * 7 * 1000;
export const options = { path: '/', httpOnly: true, secure: !dev, maxAge: WEEK_IN_SECONDS };

export type AccessType = 'admin' | 'agent' | 'compliance' | 'finance' | 'super-admin';

// Route prefixes allowed for each role
export const ROLE_ROUTES: Record<AccessType, string[]> = {
	admin: ['/admin', '/dashboard', '/profile'],
	agent: ['/agent', '/dashboard', '/profile'],
	compliance: ['/compliance', '/dashboard', '/profile'],
	finance: ['/finance', '/dashboard', '/profile'],
	'super-admin': ['/admin', '/agent', '/compliance', '/finance', '/dashboard', '/profile']
};

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
