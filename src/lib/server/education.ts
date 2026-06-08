import {
	buildEducationSearchIndex,
	type EducationVideoStatus,
	type EducationVideoSourceType
} from '$lib/education';
import { firestore } from '$lib/server/firebase';

type EducationVideoRecord = {
	title?: string;
	subject?: string;
	tags?: string[];
	sourceType?: EducationVideoSourceType;
	sourceUrl?: string;
	embedUrl?: string;
	driveFileId?: string;
	searchText?: string;
	searchTokens?: string[];
	status?: EducationVideoStatus;
	createdAt?: FirebaseFirestore.Timestamp | string | null;
	updatedAt?: FirebaseFirestore.Timestamp | string | null;
	createdByUid?: string;
	createdByEmail?: string;
};

export const educationVideosCollection = firestore.collection('educationVideos');

export function serializeEducationVideo(
	id: string,
	record: EducationVideoRecord
): EducationVideo {
	const tags = Array.isArray(record.tags) ? record.tags.filter(Boolean) : [];
	const searchIndex = record.searchText
		? {
				searchText: record.searchText,
				searchTokens: Array.isArray(record.searchTokens) ? record.searchTokens : []
			}
		: buildEducationSearchIndex({
				title: record.title ?? '',
				subject: record.subject ?? '',
				tags
			});

	return {
		id,
		title: record.title ?? 'Untitled video',
		subject: record.subject ?? '',
		tags,
		sourceType: record.sourceType === 'google-drive' ? 'google-drive' : 'google-drive',
		sourceUrl: record.sourceUrl ?? '',
		embedUrl: record.embedUrl ?? '',
		driveFileId: record.driveFileId ?? '',
		searchText: searchIndex.searchText,
		searchTokens: searchIndex.searchTokens,
		status: record.status === 'archived' || record.status === 'invalid' ? record.status : 'ready',
		createdAt: toIsoString(record.createdAt),
		updatedAt: toIsoString(record.updatedAt),
		createdByUid: record.createdByUid ?? '',
		createdByEmail: record.createdByEmail ?? ''
	};
}

function toIsoString(value: FirebaseFirestore.Timestamp | string | null | undefined): string {
	if (!value) return new Date().toISOString();
	if (typeof value === 'string') return value;
	if ('toDate' in value) return value.toDate().toISOString();
	return new Date().toISOString();
}
