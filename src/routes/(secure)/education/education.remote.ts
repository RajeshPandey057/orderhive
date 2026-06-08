import { command, getRequestEvent } from '$app/server';
import { canManageEducationVideos } from '$lib/constants';
import {
	buildEducationSearchIndex,
	normalizeEducationTags,
	normalizeGoogleDriveVideoSource
} from '$lib/education';
import { educationVideosCollection } from '$lib/server/education';
import { error } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const createEducationVideoSchema = z.object({
	title: z.string().trim().min(1, 'Title is required'),
	driveLink: z.string().trim().min(1, 'Google Drive link is required'),
	tags: z.array(z.string()).default([]),
	subject: z.string().trim().default('')
});

const updateEducationVideoSchema = createEducationVideoSchema.extend({
	id: z.string().trim().min(1, 'Video id is required')
});

function requireEducationVideoManager() {
	const { locals } = getRequestEvent();
	const user = locals.user;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	if (!canManageEducationVideos(user.role)) {
		throw error(403, 'You do not have permission to manage education videos');
	}

	return user;
}

export const createEducationVideo = command(createEducationVideoSchema, async (data) => {
	const user = requireEducationVideoManager();
	const normalizedSource = normalizeGoogleDriveVideoSource(data.driveLink);

	if (!normalizedSource) {
		throw error(400, 'Please provide a valid Google Drive file link');
	}

	const tags = normalizeEducationTags(data.tags);
	const title = data.title.trim();
	const subject = data.subject.trim();
	const { searchText, searchTokens } = buildEducationSearchIndex({
		title,
		subject,
		tags
	});

	const docRef = educationVideosCollection.doc();

	await docRef.set({
		title,
		subject,
		tags,
		sourceType: 'google-drive',
		sourceUrl: normalizedSource.sourceUrl,
		embedUrl: normalizedSource.embedUrl,
		driveFileId: normalizedSource.driveFileId,
		searchText,
		searchTokens,
		status: 'ready',
		createdAt: FieldValue.serverTimestamp(),
		updatedAt: FieldValue.serverTimestamp(),
		createdByUid: user.uid,
		createdByEmail: user.email
	});

	return { success: true, id: docRef.id };
});

export const updateEducationVideo = command(updateEducationVideoSchema, async (data) => {
	const user = requireEducationVideoManager();
	const normalizedSource = normalizeGoogleDriveVideoSource(data.driveLink);

	if (!normalizedSource) {
		throw error(400, 'Please provide a valid Google Drive file link');
	}

	const docRef = educationVideosCollection.doc(data.id);
	const existing = await docRef.get();

	if (!existing.exists) {
		throw error(404, 'Education video not found');
	}

	const tags = normalizeEducationTags(data.tags);
	const title = data.title.trim();
	const subject = data.subject.trim();
	const { searchText, searchTokens } = buildEducationSearchIndex({
		title,
		subject,
		tags
	});

	await docRef.set(
		{
			title,
			subject,
			tags,
			sourceType: 'google-drive',
			sourceUrl: normalizedSource.sourceUrl,
			embedUrl: normalizedSource.embedUrl,
			driveFileId: normalizedSource.driveFileId,
			searchText,
			searchTokens,
			status: 'ready',
			updatedAt: FieldValue.serverTimestamp(),
			updatedByUid: user.uid,
			updatedByEmail: user.email
		},
		{ merge: true }
	);

	return { success: true, id: docRef.id };
});
