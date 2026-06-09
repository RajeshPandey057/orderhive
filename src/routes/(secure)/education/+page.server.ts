import { canAccessEducationModule, canManageEducationVideos } from '$lib/constants';
import { educationVideosCollection, serializeEducationVideo } from '$lib/server/education';
import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!canAccessEducationModule(locals.user.role)) {
		throw error(403, 'You do not have access to the Education Module');
	}

	const snap = await educationVideosCollection.get();
	const items = snap.docs
		.map((doc) => serializeEducationVideo(doc.id, doc.data()))
		.filter((item) => item.status === 'ready')
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	return {
		items,
		canManage: canManageEducationVideos(locals.user.role)
	};
}
