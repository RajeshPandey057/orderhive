import { SESSION_TOKEN } from '@/constants';
import { verifySessionCookie } from '@/server/firebase';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	const { cookies, locals } = event;
	locals.fbUser = null; // default if session cookie fails
	// decode the cookie and get the session property
	const session = cookies.get(SESSION_TOKEN);

	if (session) {
		// if session cookie is set, verify it is valid and set the user from it
		try {
			const decodedToken = await verifySessionCookie(session);
			if (decodedToken) {
				locals.fbUser = decodedToken;
			}
		} catch (err) {
			locals.fbUser = null;
			console.log(err);

			throw redirect(303, `/?message=There was an error please try again`);
		}
	} else {
		cookies.delete(SESSION_TOKEN, { path: '/' });
	}
	if (!locals.fbUser && event.route.id?.startsWith('/(auth)')) {
		throw redirect(
			303,
			`/?redirectTo=${
				event.url.pathname + event.url.search
			}&message=You must be logged in to access this page`
		);
	} else if (locals.fbUser && event.url.pathname === '/') {
		throw redirect(303, '/dashboard');
	}

	return resolve(event);
}
