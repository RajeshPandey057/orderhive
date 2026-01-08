import { command, getRequestEvent } from '$app/server';
import { firestore } from '$lib/server/firebase';
import { getDefaultRoute, options, SESSION_TOKEN, type AccessType } from '@/constants';
import z from 'zod';

const AuthInput = z.object({
	uid: z.string(),
	email: z.email()
});

export const authenticatedRedirect = command(AuthInput, async (input) => {
	const { cookies, url } = getRequestEvent();
	const { uid, email } = input;

	console.log('Authenticating user:', email);

	try {
		// Check if user exists in roles collection
		const roleDoc = await firestore.collection('roles').doc(email).get();

		if (!roleDoc.exists) {
			console.log('User not found in roles collection:', email);
			cookies.delete(SESSION_TOKEN, { path: '/' });
			return {
				success: false,
				error: 'Account not found. Please contact IND Global admin.',
				redirectUrl: null
			};
		}

		const roleData = roleDoc.data() as { accessType: AccessType };
		const role = roleData?.accessType;

		if (!role) {
			console.log('No accessType found for user:', email);
			cookies.delete(SESSION_TOKEN, { path: '/' });
			return {
				success: false,
				error: 'No role assigned. Please contact admin.',
				redirectUrl: null
			};
		}

		console.log('User role found:', role);

		// Store simple user data in cookie
		const userData = JSON.stringify({ uid, email, role });
		cookies.set(SESSION_TOKEN, userData, options);

		// Determine redirect destination
		const redirectTo = url.searchParams.get('redirectTo');
		const defaultRedirect = getDefaultRoute(role);

		return {
			success: true,
			role,
			redirectUrl: redirectTo ?? defaultRedirect
		};
	} catch (err) {
		console.error('Error authenticating user:', err);
		cookies.delete(SESSION_TOKEN, { path: '/' });
		return {
			success: false,
			error: 'Error signing in user',
			redirectUrl: null
		};
	}
});

// Helper to clear session cookie on logout
export const clearAuthCookies = command(z.object({}), async () => {
	const { cookies } = getRequestEvent();
	cookies.delete(SESSION_TOKEN, { path: '/' });
	return { success: true };
});
