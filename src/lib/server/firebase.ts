import {
	FIREBASE_BUCKET,
	FIREBASE_CLIENT_EMAIL,
	FIREBASE_PRIVATE_KEY,
	FIREBASE_PROJECT_ID
} from '$env/static/private';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type SessionCookieOptions } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';

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
export const firestore = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

type UploadedFile = {
	path: string;
	downloadURL: string;
	token: string;
	contentType: string;
	size: number;
	name: string;
	lastModified: number;
};

export async function uploadFileWithLink(
	imageFile: File | null,
	path: string
): Promise<UploadedFile | null> {
	if (!imageFile || imageFile.size <= 0) return null;

	const bucket = storage.bucket();
	const fileName = `${path}/${randomUUID()}-${imageFile.name}`;
	const file = bucket.file(fileName);
	const token = randomUUID();
	const imageData = await imageFile.arrayBuffer();

	await file.save(Buffer.from(imageData), {
		contentType: imageFile.type || 'application/octet-stream',
		metadata: {
			firebaseStorageDownloadTokens: token
		}
	});

	const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;

	return {
		path: fileName,
		downloadURL,
		token,
		contentType: imageFile.type || 'application/octet-stream',
		size: imageFile.size,
		name: imageFile.name,
		lastModified: imageFile.lastModified
	};
}

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
