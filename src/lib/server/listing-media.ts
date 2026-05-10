type ListingMediaKind = 'photo' | 'video';

type ListingAttachmentFile = {
	downloadURL?: string;
	url?: string;
	thumbnailURL?: string;
	posterURL?: string;
	width?: number;
	height?: number;
};

type ListingSourceRecord = {
	attachments?: {
		pictures?: ListingAttachmentFile[];
		videos?: ListingAttachmentFile[];
	};
	mediaAssets?: Array<{
		type?: ListingMediaKind;
		url?: string;
		downloadURL?: string;
		thumbnailURL?: string;
		posterURL?: string;
		width?: number;
		height?: number;
	}>;
};

type ListingMediaExtra = {
	thumbnailURL?: string;
	posterURL?: string;
	width?: number;
	height?: number;
};

const DEFAULT_PHOTO_WIDTH = 1600;
const DEFAULT_PHOTO_HEIGHT = 1067;
const DEFAULT_VIDEO_WIDTH = 1280;
const DEFAULT_VIDEO_HEIGHT = 720;

function normalizeMediaUrl(value?: string): string | null {
	if (!value || typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
	return null;
}

function toMediaItem(
	type: ListingMediaKind,
	url: string,
	index: number,
	extra?: ListingMediaExtra
): ListingMediaItem {
	if (type === 'video') {
		return {
			id: `video-${index}`,
			type: 'video',
			url,
			thumbnailURL: extra?.thumbnailURL,
			posterURL: extra?.posterURL,
			width: extra?.width ?? DEFAULT_VIDEO_WIDTH,
			height: extra?.height ?? DEFAULT_VIDEO_HEIGHT
		};
	}

	return {
		id: `photo-${index}`,
		type: 'photo',
		url,
		thumbnailURL: extra?.thumbnailURL,
		width: extra?.width ?? DEFAULT_PHOTO_WIDTH,
		height: extra?.height ?? DEFAULT_PHOTO_HEIGHT
	};
}

export function normalizeListingMedia(source: ListingSourceRecord): {
	items: ListingMediaItem[];
	images: string[];
	videos: string[];
} {
	const images: string[] = [];
	const videos: string[] = [];
	const items: ListingMediaItem[] = [];
	const seen = new Set<string>();

	const push = (
		type: ListingMediaKind,
		urlValue: string | undefined,
		extra?: ListingMediaExtra
	) => {
		const url = normalizeMediaUrl(urlValue);
		if (!url) return;

		const key = `${type}:${url}`;
		if (seen.has(key)) return;
		seen.add(key);

		if (type === 'photo') images.push(url);
		if (type === 'video') videos.push(url);

		items.push(toMediaItem(type, url, items.length + 1, extra));
	};

	for (const picture of source.attachments?.pictures ?? []) {
		push('photo', picture?.downloadURL ?? picture?.url, {
			thumbnailURL: picture?.thumbnailURL,
			width: picture?.width,
			height: picture?.height
		});
	}

	for (const video of source.attachments?.videos ?? []) {
		push('video', video?.downloadURL ?? video?.url, {
			thumbnailURL: video?.thumbnailURL,
			posterURL: video?.posterURL,
			width: video?.width,
			height: video?.height
		});
	}

	for (const mediaAsset of source.mediaAssets ?? []) {
		const type = mediaAsset?.type === 'video' ? 'video' : 'photo';
		push(type, mediaAsset?.url ?? mediaAsset?.downloadURL, {
			thumbnailURL: mediaAsset?.thumbnailURL,
			posterURL: mediaAsset?.posterURL,
			width: mediaAsset?.width,
			height: mediaAsset?.height
		});
	}

	return { items, images, videos };
}
