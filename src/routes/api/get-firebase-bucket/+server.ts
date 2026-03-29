import { error } from '@sveltejs/kit';

export const GET = async () => {
	try {
		const firebaseBucket = process.env.FIREBASE_BUCKET;
		const dotenvPrivateKeyCi = process.env.DOTENV_PRIVATE_KEY_CI;

		if (!firebaseBucket) {
			throw error(500, 'FIREBASE_BUCKET environment variable is not set');
		}

		return new Response(
			JSON.stringify({
				bucket: firebaseBucket,
				key: dotenvPrivateKeyCi
			}),
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (err) {
		console.error('Error retrieving Firebase bucket:', err);
		const message = err instanceof Error ? err.message : 'Failed to retrieve Firebase bucket';
		throw error(500, message);
	}
};
