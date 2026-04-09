import { getDefaultRoute, ROLE_ROUTES, SESSION_TOKEN, type AccessType } from '$lib/constants';
import { redirect, type Handle } from '@sveltejs/kit';

interface UserData {
	uid: string;
	email: string;
	role: AccessType;
}

export const handle: Handle = ({ event, resolve }) => {
	const isSecureRoute = event.route.id?.startsWith('/(secure)');
	const path = event.url.pathname;
	const { cookies, locals } = event;
	locals.user = null;

	// In local dev, auto-login as admin and bypass login wall
	if (import.meta.env.DEV) {
		locals.user = { uid: 'dev-admin-user', email: 'admin@localhost', role: 'admin' };

		if (path === '/') {
			redirect(303, '/admin/dashboard');
		}

		return resolve(event);
	}

	if (!isSecureRoute) {
		return resolve(event);
	}

	// Read user data from cookie
	const session = cookies.get(SESSION_TOKEN);

	if (session) {
		try {
			const userData: UserData = JSON.parse(session);
			if (userData.uid && userData.email && userData.role) {
				locals.user = userData;
			}
		} catch {
			// Invalid cookie, clear it
			cookies.delete(SESSION_TOKEN, { path: '/' });
		}
	}

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
