import {
	FIREBASE_BUCKET,
	FIREBASE_CLIENT_EMAIL,
	FIREBASE_PRIVATE_KEY,
	FIREBASE_PROJECT_ID
} from '$env/static/private';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type SessionCookieOptions } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

export const firebaseApp =
	getApps().find((it) => it.name === 'firebase-admin-app') ??
	initializeApp(
		{
			credential: cert({
				projectId: FIREBASE_PROJECT_ID,
				clientEmail: FIREBASE_CLIENT_EMAIL,
				privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
			}),
			storageBucket: FIREBASE_BUCKET
		},
		'firebase-admin-app'
	);
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);

export async function createSessionCookie(
	idToken: string,
	sessionCookieOptions: SessionCookieOptions
) {
	if (!idToken) return null;

	try {
		return auth.createSessionCookie(idToken, sessionCookieOptions);
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function revokeAllSessions(session: string) {
	if (!session) return null;
	try {
		const decodedIdToken = await auth.verifySessionCookie(session);
		await auth.revokeRefreshTokens(decodedIdToken.sub);
	} catch (err) {
		console.error(err);
	}
}
export async function validateToken(token: string) {
	if (!token) return null;
	try {
		return auth.verifyIdToken(token);
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function verifySessionCookie(token: string) {
	if (!token) return null;
	try {
		return auth.verifySessionCookie(token);
	} catch (err) {
		console.error(err);
		return null;
	}
}
