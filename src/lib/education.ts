const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);
const DRIVE_FILE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/;

export type EducationVideoStatus = 'ready' | 'invalid' | 'archived';
export type EducationVideoSourceType = 'google-drive';

export type NormalizedGoogleDriveSource = {
	driveFileId: string;
	sourceUrl: string;
	embedUrl: string;
};

export function getGoogleDriveThumbnailUrl(driveFileId: string, size = 1200): string {
	return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w${size}`;
}

export function normalizeEducationTags(tags: string[]): string[] {
	const uniqueTags = new Map<string, string>();

	for (const tag of tags) {
		const trimmed = tag.trim();
		if (!trimmed) continue;

		const key = trimmed.toLowerCase();
		if (!uniqueTags.has(key)) {
			uniqueTags.set(key, trimmed);
		}
	}

	return [...uniqueTags.values()];
}

export function buildEducationSearchIndex(input: {
	title: string;
	subject?: string;
	tags?: string[];
}) {
	const searchText = [input.title, input.subject ?? '', ...(input.tags ?? [])]
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean)
		.join(' ');

	const searchTokens = [...new Set(searchText.split(/[^a-z0-9]+/).filter((token) => token.length > 1))];

	return { searchText, searchTokens };
}

export function normalizeGoogleDriveVideoSource(rawUrl: string): NormalizedGoogleDriveSource | null {
	const trimmedUrl = rawUrl.trim();
	if (!trimmedUrl) return null;

	let parsedUrl: URL;

	try {
		parsedUrl = new URL(trimmedUrl);
	} catch {
		return null;
	}

	if (!DRIVE_HOSTS.has(parsedUrl.hostname)) {
		return null;
	}

	const driveFileId = extractGoogleDriveFileId(parsedUrl);
	if (!driveFileId) {
		return null;
	}

	return {
		driveFileId,
		sourceUrl: `https://drive.google.com/file/d/${driveFileId}/view`,
		embedUrl: `https://drive.google.com/file/d/${driveFileId}/preview`
	};
}

function extractGoogleDriveFileId(parsedUrl: URL): string | null {
	const pathMatch = parsedUrl.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
	if (pathMatch?.[1] && DRIVE_FILE_ID_PATTERN.test(pathMatch[1])) {
		return pathMatch[1];
	}

	const queryId = parsedUrl.searchParams.get('id')?.trim();
	if (queryId && DRIVE_FILE_ID_PATTERN.test(queryId)) {
		return queryId;
	}

	return null;
}
