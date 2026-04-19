import { getDefaultRoute, ROLE_ROUTES, SESSION_TOKEN, type AccessType } from '$lib/constants';
import { redirect, type Handle } from '@sveltejs/kit';

interface UserData {
	uid: string;
	email: string;
	role: AccessType;
	managedTeamIds?: string[];
}

const VALID_ROLES: AccessType[] = [
	'admin',
	'agent',
	'compliance',
	'finance',
	'super-admin',
	'manager',
	'senior-manager'
];

export const handle: Handle = ({ event, resolve }) => {
	const isSecureRoute = event.route.id?.startsWith('/(secure)');
	if (!isSecureRoute) {
		return resolve(event);
	}
	const { cookies, locals } = event;
	locals.user = null;

	// In local dev, inject a super-admin user so auth is not required
	if (import.meta.env.DEV) {
		locals.user = { uid: 'dev-user', email: 'dev@example.com', role: 'super-admin' };
		return resolve(event);
	}

	// Read user data from cookie
	const session = cookies.get(SESSION_TOKEN);

	if (session) {
		try {
			const userData: UserData = JSON.parse(session);
			if (userData.uid && userData.email && userData.role && VALID_ROLES.includes(userData.role)) {
				locals.user = {
					uid: userData.uid,
					email: userData.email,
					role: userData.role,
					...(userData.managedTeamIds && { managedTeamIds: userData.managedTeamIds })
				};
			}
		} catch {
			// Invalid cookie, clear it
			cookies.delete(SESSION_TOKEN, { path: '/' });
		}
	}

	const path = event.url.pathname;

	// Redirect to login if not authenticated and trying to access secure route
	if (!locals.user && isSecureRoute) {
		redirect(303, `/?redirectTo=${encodeURIComponent(path + event.url.search)}`);
	}

	// Check role permissions for authenticated users on secure routes
	if (locals.user && isSecureRoute) {
		const allowedRoutes = ROLE_ROUTES[locals.user.role];
		const canAccess = allowedRoutes.some((prefix) => path.startsWith(prefix));

		if (!canAccess) {
			redirect(303, getDefaultRoute(locals.user.role));
		}
	}

	// Redirect authenticated users away from login page
	if (locals.user && path === '/') {
		redirect(303, getDefaultRoute(locals.user.role));
	}

	return resolve(event);
};
