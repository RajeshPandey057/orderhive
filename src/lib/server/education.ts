import {
	buildEducationSearchIndex,
	type EducationVideoSourceType,
	type EducationVideoStatus
} from '$lib/education';
import { firestore } from '$lib/server/firebase';

type EducationVideoRecord = {
	itemType?: 'video' | 'pdf';
	title?: string;
	subject?: string;
	tags?: string[];
	sourceType?: EducationVideoSourceType;
	sourceUrl?: string;
	embedUrl?: string;
	driveFileId?: string;
	filePath?: string;
	fileName?: string;
	fileSize?: number;
	contentType?: string;
	lastModified?: number;
	searchText?: string;
	searchTokens?: string[];
	status?: EducationVideoStatus;
	createdAt?: FirebaseFirestore.Timestamp | string | null;
	updatedAt?: FirebaseFirestore.Timestamp | string | null;
	createdByUid?: string;
	createdByEmail?: string;
};

export const educationVideosCollection = firestore.collection('educationVideos');

export function serializeEducationVideo(id: string, record: EducationVideoRecord): EducationVideo {
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
		itemType: record.itemType === 'pdf' ? 'pdf' : 'video',
		title: record.title ?? 'Untitled video',
		subject: record.subject ?? '',
		tags,
		sourceType: record.sourceType === 'upload' ? 'upload' : 'google-drive',
		sourceUrl: record.sourceUrl ?? '',
		embedUrl: record.embedUrl ?? '',
		driveFileId: record.driveFileId ?? '',
		filePath: record.filePath ?? '',
		fileName: record.fileName ?? '',
		fileSize: record.fileSize ?? 0,
		contentType: record.contentType ?? '',
		lastModified: record.lastModified ?? 0,
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
