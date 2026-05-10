<script lang="ts">
	import PhotoSwipeLightbox from 'photoswipe/lightbox';
	import 'photoswipe/style.css';
	import { onDestroy, onMount } from 'svelte';
	import PlayCircleIcon from '~icons/lucide/play-circle';

	type Props = {
		mediaItems?: ListingMediaItem[];
		listingId: string;
		listingTitle: string;
	};

	const { mediaItems = [], listingId, listingTitle }: Props = $props();

	const galleryId = $derived(`listing-media-gallery-${listingId.toLowerCase()}`);

	function getFallbackMedia(seed: string): ListingMediaItem[] {
		return [1, 2, 3, 4, 5].map((index) => ({
			id: `fallback-photo-${index}`,
			type: 'photo',
			url: `https://picsum.photos/seed/${seed}-gallery-${index}/1200/800`,
			thumbnailURL: `https://picsum.photos/seed/${seed}-gallery-${index}/600/400`,
			width: 1200,
			height: 800
		}));
	}

	const items = $derived(mediaItems.length > 0 ? mediaItems : getFallbackMedia(listingId));
	const previewLimit = 5;
	const previewItems = $derived(items.length > previewLimit ? items.slice(0, previewLimit) : items);
	const hiddenCount = $derived(Math.max(items.length - previewLimit, 0));

	function escapeHtml(value: string): string {
		return value
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#039;');
	}

	function buildVideoSlideHtml(item: Extract<ListingMediaItem, { type: 'video' }>): string {
		const safeUrl = escapeHtml(item.url);
		const safeLabel = escapeHtml(listingTitle);

		return `
		<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:1rem;box-sizing:border-box;">
			<div style="width:min(100%,980px);">
				<video src="${safeUrl}" controls playsinline preload="metadata" style="display:block;width:100%;max-height:80vh;border-radius:0.5rem;background:#000;" ${item.posterURL ? `poster="${escapeHtml(item.posterURL)}"` : ''}></video>
				<p style="margin-top:0.5rem;font-size:0.875rem;color:#ffffff;opacity:0.9;">
					Video for ${safeLabel}. If playback fails,
					<a href="${safeUrl}" target="_blank" rel="noreferrer" style="color:#93c5fd;text-decoration:underline;">open video directly</a>.
				</p>
			</div>
		</div>`;
	}

	function getThumb(item: ListingMediaItem): string {
		if (item.type === 'video') {
			return (
				item.thumbnailURL ??
				item.posterURL ??
				`https://picsum.photos/seed/${listingId}-video-thumb-${item.id}/600/400`
			);
		}

		return item.thumbnailURL ?? item.url;
	}

	let lightbox: PhotoSwipeLightbox | null = null;

	onMount(() => {
		if (items.length === 0) return;

		lightbox = new PhotoSwipeLightbox({
			dataSource: items.map((item) =>
				item.type === 'video'
					? {
							type: 'html',
							html: buildVideoSlideHtml(item)
						}
					: {
							src: item.url,
							width: item.width ?? 1600,
							height: item.height ?? 1067,
							alt: `${listingTitle} media`
						}
			),
			pswpModule: () => import('photoswipe')
		});

		lightbox.init();
	});

	onDestroy(() => {
		lightbox?.destroy();
		lightbox = null;
	});

	function openAt(event: MouseEvent, index: number) {
		if (!lightbox) return;
		event.preventDefault();
		lightbox.loadAndOpen(index);
	}

	function getAspectRatio(item: ListingMediaItem): string {
		const width = item.width ?? (item.type === 'video' ? 1280 : 1600);
		const height = item.height ?? (item.type === 'video' ? 720 : 1067);
		return `${width} / ${height}`;
	}

	function getTileClass(index: number): string {
		if (index === 0) {
			return 'lg:col-span-5 lg:row-span-2';
		}

		if (index === 1 || index === 2) {
			return 'lg:col-span-3';
		}

		if (index === 3) {
			return 'lg:col-span-4';
		}

		if (index === 4) {
			return 'lg:col-span-3 lg:row-span-2';
		}

		if (index === 5) {
			return 'lg:col-span-4';
		}

		if (index === 6) {
			return 'lg:col-span-3';
		}

		return 'lg:col-span-3';
	}

	function isOverflowTile(index: number): boolean {
		return hiddenCount > 0 && index === previewItems.length - 1;
	}

	function getOverflowLabel(): string {
		return `+${hiddenCount}`;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h2 class="text-base font-semibold text-foreground">Gallery</h2>
		<p class="text-xs text-muted-foreground">
			{items.length} media item{items.length === 1 ? '' : 's'}
		</p>
	</div>

	<div
		class="pswp-gallery grid grid-cols-1 gap-2 sm:grid-cols-2 lg:auto-rows-[minmax(0,120px)] lg:grid-cols-12"
		id={galleryId}
	>
		{#each previewItems as item, index (item.id)}
			<div class={`overflow-hidden ${getTileClass(index)}`}>
				<button
					type="button"
					onclick={(event) => openAt(event, isOverflowTile(index) ? previewLimit : index)}
					class="group relative h-full w-full overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm"
					style={`aspect-ratio: ${getAspectRatio(item)};`}
					aria-label={isOverflowTile(index)
						? `Open gallery, ${hiddenCount} more media items`
						: `Open media ${index + 1}`}
				>
					<img
						src={getThumb(item)}
						alt={`${listingTitle} media ${index + 1}`}
						class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						loading="lazy"
					/>

					{#if item.type === 'video' && !isOverflowTile(index)}
						<div class="absolute inset-0 flex items-center justify-center bg-black/25">
							<PlayCircleIcon class="h-8 w-8 text-white drop-shadow" />
						</div>
						<span
							class="absolute top-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white"
						>
							Video
						</span>
					{/if}

					{#if isOverflowTile(index)}
						<div class="absolute inset-0 bg-black/35 backdrop-blur-[1px]"></div>
						<div
							class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white"
						>
							<span class="text-3xl font-semibold tracking-tight">{getOverflowLabel()}</span>
							<span class="text-xs font-medium tracking-[0.2em] uppercase">More</span>
						</div>
					{/if}
				</button>
			</div>
		{/each}
	</div>
</div>
