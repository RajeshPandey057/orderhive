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

		const roleData = roleDoc.data() as { accessType: AccessType; managedTeamIds?: string[] };
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

		// Store user data in cookie (include managedTeamIds for manager/senior-manager)
		const sessionPayload: Record<string, unknown> = { uid, email, role };
		if (
			(role === 'manager' || role === 'senior-manager') &&
			Array.isArray(roleData.managedTeamIds)
		) {
			sessionPayload.managedTeamIds = roleData.managedTeamIds;
		}
		cookies.set(SESSION_TOKEN, JSON.stringify(sessionPayload), options);

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
