<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Button from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';
	import * as Select from '$lib/components/ui/select';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		getGoogleDriveThumbnailUrl,
		normalizeEducationTags,
		normalizeGoogleDriveVideoSource,
		type NormalizedGoogleDriveSource
	} from '$lib/education';
	import { toast } from 'svelte-sonner';
	import ChevronLeftIcon from '~icons/lucide/chevron-left';
	import ChevronRightIcon from '~icons/lucide/chevron-right';
	import CirclePlayIcon from '~icons/lucide/circle-play';
	import GraduationCapIcon from '~icons/lucide/graduation-cap';
	import PencilIcon from '~icons/lucide/pencil';
	import PlusIcon from '~icons/lucide/plus';
	import SearchIcon from '~icons/lucide/search';
	import XIcon from '~icons/lucide/x';
	import { createEducationVideo, updateEducationVideo } from './education.remote';

	let { data } = $props<{
		data: {
			videos: EducationVideo[];
			canManage: boolean;
			user?: { role?: string | null } | null;
		};
	}>();

	const allVideos = $derived((data.videos ?? []) as EducationVideo[]);

	let searchQuery = $state('');
	let sortOrder = $state<'newest' | 'oldest' | 'title'>('newest');
	let addVideoOpen = $state(false);
	let title = $state('');
	let driveLink = $state('');
	let subject = $state('');
	let tagInputs = $state(['', '', '']);
	let titleError = $state('');
	let driveLinkError = $state('');
	let submitError = $state('');
	let creatingVideo = $state(false);
	let editingVideoId = $state<string | null>(null);
	let activeVideo = $state<EducationVideo | null>(null);
	let fullscreenContainer = $state<HTMLDivElement | null>(null);
	let thumbnailFailures = $state<Record<string, boolean>>({});

	const canManage = $derived(Boolean(data.canManage));

	const drivePreview = $derived.by(() => {
		const trimmedLink = driveLink.trim();
		if (!trimmedLink) {
			return { kind: 'idle' as const, message: 'Paste an open Google Drive file link to preview it.' };
		}

		const normalizedSource = normalizeGoogleDriveVideoSource(trimmedLink);
		if (!normalizedSource) {
			return {
				kind: 'invalid' as const,
				message:
					'Use a Google Drive file link such as /file/d/... or an open?id=... URL shared for viewing.'
			};
		}

		return {
			kind: 'valid' as const,
			message:
				'Drive link looks valid. Playback still depends on Google Drive sharing and embed settings.',
			source: normalizedSource
		};
	});

	const filteredVideos = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();

		return [...allVideos]
			.filter((video) => {
				if (!query) return true;
				return video.searchText.includes(query);
			})
			.sort((left, right) => {
				if (sortOrder === 'oldest') {
					return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
				}

				if (sortOrder === 'title') {
					return left.title.localeCompare(right.title);
				}

				return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
			});
	});

	function formatDate(value: string): string {
		return new Intl.DateTimeFormat('en-AE', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(value));
	}

	function addTagField() {
		tagInputs = [...tagInputs, ''];
	}

	function removeTagField(index: number) {
		tagInputs = tagInputs.filter((_, tagIndex) => tagIndex !== index);
	}

	function resetCreateForm() {
		editingVideoId = null;
		title = '';
		driveLink = '';
		subject = '';
		tagInputs = ['', '', ''];
		titleError = '';
		driveLinkError = '';
		submitError = '';
	}

	function openCreateSheet() {
		resetCreateForm();
		addVideoOpen = true;
	}

	function openEditSheet(video: EducationVideo) {
		editingVideoId = video.id;
		title = video.title;
		driveLink = video.sourceUrl;
		subject = video.subject;
		tagInputs = video.tags.length > 0 ? [...video.tags, '', '', ''].slice(0, Math.max(video.tags.length, 3)) : ['', '', ''];
		titleError = '';
		driveLinkError = '';
		submitError = '';
		addVideoOpen = true;
	}

	function validateCreateForm(): NormalizedGoogleDriveSource | null {
		titleError = '';
		driveLinkError = '';
		submitError = '';

		if (!title.trim()) {
			titleError = 'Title is required.';
		}

		const normalizedSource = normalizeGoogleDriveVideoSource(driveLink);
		if (!driveLink.trim()) {
			driveLinkError = 'Google Drive link is required.';
		} else if (!normalizedSource) {
			driveLinkError = 'Please provide a valid embeddable Google Drive file link.';
		}

		if (titleError || driveLinkError || !normalizedSource) {
			return null;
		}

		return normalizedSource;
	}

	async function handleCreateVideoSubmit(event: SubmitEvent) {
		event.preventDefault();

		const normalizedSource = validateCreateForm();
		if (!normalizedSource) return;

		creatingVideo = true;

		try {
			const payload = {
				title,
				driveLink: normalizedSource.sourceUrl,
				subject,
				tags: normalizeEducationTags(tagInputs)
			};

			if (editingVideoId) {
				await updateEducationVideo({
					id: editingVideoId,
					...payload
				});
				toast.success('Education video updated');
			} else {
				await createEducationVideo(payload);
				toast.success('Education video added');
			}
			addVideoOpen = false;
			resetCreateForm();
			await invalidateAll();
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Unable to save the video right now.';
			toast.error(submitError);
		} finally {
			creatingVideo = false;
		}
	}

	async function openVideo(video: EducationVideo) {
		activeVideo = video;
		await tick();

		try {
			await fullscreenContainer?.requestFullscreen?.();
		} catch {
			// Fullscreen is best effort only; keep the overlay open if the browser blocks it.
		}
	}

	async function closeVideo() {
		if (document.fullscreenElement === fullscreenContainer) {
			try {
				await document.exitFullscreen();
			} catch {
				// Ignore exit failures and close the overlay anyway.
			}
		}

		activeVideo = null;
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (!activeVideo) return;

		if (event.key === 'Escape') {
			activeVideo = null;
			return;
		}

		if (event.key === 'ArrowLeft') {
			openAdjacentVideo(-1);
			return;
		}

		if (event.key === 'ArrowRight') {
			openAdjacentVideo(1);
		}
	}

	function getVideoThumbnailUrl(video: EducationVideo): string | null {
		if (!video.driveFileId || thumbnailFailures[video.id]) return null;
		return getGoogleDriveThumbnailUrl(video.driveFileId);
	}

	function markThumbnailFailed(videoId: string) {
		thumbnailFailures = { ...thumbnailFailures, [videoId]: true };
	}

	const activeVideoIndex = $derived.by(() => {
		const currentVideo = activeVideo;
		if (!currentVideo) return -1;

		return filteredVideos.findIndex((video) => video.id === currentVideo.id);
	});

	const canGoToPreviousVideo = $derived(activeVideoIndex > 0);
	const canGoToNextVideo = $derived(
		activeVideoIndex >= 0 && activeVideoIndex < filteredVideos.length - 1
	);

	function openAdjacentVideo(direction: -1 | 1) {
		if (activeVideoIndex < 0) return;

		const nextVideo = filteredVideos[activeVideoIndex + direction];
		if (!nextVideo) return;

		activeVideo = nextVideo;
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="pt-2">
	<SecurePageHeader
		title="Education Module"
		description="Internal video library for training, walkthroughs, and onboarding content."
	/>
</div>

<div class="flex flex-1 flex-col gap-5 p-6">
	<div class="rounded-2xl border border-[#E7ECEA] bg-white p-5 shadow-sm">
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div class="flex flex-col gap-1">
					<p class="text-sm font-medium text-foreground">{filteredVideos.length} / {allVideos.length} videos</p>
					<p class="text-xs text-muted-foreground">
						Search across video title, tags, and subject metadata.
					</p>
				</div>
				{#if canManage}
					<Button.Root class="gap-2 self-start xl:self-auto" onclick={openCreateSheet}>
						<PlusIcon class="size-4" />
						Add Video
					</Button.Root>
				{/if}
			</div>

			<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
				<div class="relative flex-1">
					<SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						bind:value={searchQuery}
						class="h-11 pl-9"
						placeholder="Search by title, tags, or subject..."
					/>
				</div>

				<Select.Root type="single" bind:value={sortOrder}>
					<Select.Trigger class="h-11 w-full">
						{sortOrder === 'newest'
							? 'Sort: Newest'
							: sortOrder === 'oldest'
								? 'Sort: Oldest'
								: 'Sort: Title A-Z'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="newest">Newest</Select.Item>
						<Select.Item value="oldest">Oldest</Select.Item>
						<Select.Item value="title">Title A-Z</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</div>

	{#if filteredVideos.length === 0}
		<div class="rounded-2xl border border-dashed border-[#D8DFDD] bg-white px-6 py-12">
			<Empty.Root class="mx-auto max-w-xl text-center">
				<Empty.Header>
					<Empty.Media class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#FFF2E6] text-[#F04C06]">
						<GraduationCapIcon class="size-7" />
					</Empty.Media>
					<Empty.Title class="mt-4 text-xl font-semibold text-foreground">
						{searchQuery.trim() ? 'No matching videos found' : 'No videos in the library yet'}
					</Empty.Title>
					<Empty.Description class="mt-2 text-sm text-muted-foreground">
						{searchQuery.trim()
							? 'Try adjusting your search terms or sort order.'
							: 'Admins can add Google Drive video links to start building the Education Module.'}
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each filteredVideos as video (video.id)}
				<Card.Root class="gap-0 overflow-hidden border-[#E7ECEA] py-0 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
					<div class="border-b border-[#ECE7E1]">
						<button
							type="button"
							class="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black/15 text-white transition hover:bg-black/25"
							onclick={() => openVideo(video)}
							aria-label={`Play ${video.title}`}
						>
							{#if getVideoThumbnailUrl(video)}
								<img
									src={getVideoThumbnailUrl(video) ?? undefined}
									alt={`${video.title} thumbnail`}
									class="absolute inset-0 h-full w-full object-cover"
									loading="lazy"
									onerror={() => markThumbnailFailed(video.id)}
								/>
								<div class="absolute inset-0 bg-linear-to-t from-black/55 via-black/20 to-black/15"></div>
							{/if}

							<div class="flex flex-col items-center gap-2">
								<CirclePlayIcon class="size-12 transition group-hover:scale-105" />
								<span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] uppercase">
									Play Video
								</span>
							</div>
						</button>
					</div>

					<Card.Content class="space-y-2 px-4 pt-2 pb-3">
						<div class="flex items-start justify-between gap-2.5">
							<div class="min-w-0">
								<h2 class="truncate text-base font-semibold text-foreground">{video.title}</h2>
								<p class="mt-0 text-xs text-muted-foreground">
									Added by {video.createdByEmail || 'Admin'} on {formatDate(video.createdAt)}
								</p>
							</div>
							<div class="flex items-center gap-1.5">
								{#if canManage}
									<Button.Root
										type="button"
										variant="ghost"
										size="icon"
										class="size-8 text-[#F04C06] hover:bg-[#FFF1E6] hover:text-[#F04C06]"
										onclick={() => openEditSheet(video)}
										aria-label={`Edit ${video.title}`}
									>
										<PencilIcon class="size-4" />
									</Button.Root>
								{/if}
							</div>
						</div>

						<div class="flex flex-wrap gap-1">
							{#if video.tags.length > 0}
								{#each video.tags as tag (tag)}
									<Badge class="rounded-full bg-[#FFF1E6] px-2.5 py-1 text-[#A84B08]">
										{tag}
									</Badge>
								{/each}
							{:else}
								<Badge class="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
									Untagged
								</Badge>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<Sheet.Root bind:open={addVideoOpen}>
	<Sheet.Content side="right" class="w-full overflow-y-auto p-0 sm:max-w-2xl">
		<div class="flex h-full flex-col">
			<Sheet.Header class="border-b border-border px-6 py-5 text-left">
				<Sheet.Title class="text-2xl font-semibold">
					{editingVideoId ? 'Edit Video Link' : 'Add Video Link'}
				</Sheet.Title>
				<Sheet.Description>
					Paste an open Google Drive file link. The app will convert it into an embeddable player URL.
				</Sheet.Description>
			</Sheet.Header>

			<form class="flex flex-1 flex-col" onsubmit={handleCreateVideoSubmit}>
				<div class="flex-1 space-y-6 px-6 py-5">
					<Field.Field>
						<Field.Label for="education-title">Video title</Field.Label>
						<Input id="education-title" bind:value={title} placeholder="e.g. Weekly sales process walkthrough" />
						{#if titleError}
							<Field.Error>{titleError}</Field.Error>
						{/if}
					</Field.Field>

					<Field.Field>
						<Field.Label for="education-link">Google Drive link</Field.Label>
						<Input
							id="education-link"
							bind:value={driveLink}
							placeholder="https://drive.google.com/file/d/.../view"
						/>
						<Field.Description>
							Only Google Drive file links are supported in v1. Open/public links remain shareable outside the app.
						</Field.Description>
						{#if driveLinkError}
							<Field.Error>{driveLinkError}</Field.Error>
						{/if}
					</Field.Field>

					<div
						class={`rounded-2xl border p-4 text-sm ${
							drivePreview.kind === 'valid'
								? 'border-emerald-200 bg-emerald-50 text-emerald-800'
								: drivePreview.kind === 'invalid'
									? 'border-amber-200 bg-amber-50 text-amber-800'
									: 'border-[#E8ECEB] bg-[#F9FBFA] text-[#687976]'
						}`}
					>
						<p class="font-medium">
							{drivePreview.kind === 'valid'
								? 'Embeddable link detected'
								: drivePreview.kind === 'invalid'
									? 'Link needs attention'
									: 'Link preview'}
						</p>
						<p class="mt-1 leading-6">{drivePreview.message}</p>
					</div>

					{#if drivePreview.kind === 'valid'}
						<div class="overflow-hidden rounded-2xl border border-[#E7ECEA] bg-[#F8FAF9]">
							<div class="border-b border-border px-4 py-3 text-sm font-medium">Embed preview</div>
							<div class="aspect-video bg-black">
								<iframe
									src={drivePreview.source.embedUrl}
									title="Google Drive preview"
									class="h-full w-full"
									allow="autoplay; fullscreen"
									allowfullscreen
									referrerpolicy="strict-origin-when-cross-origin"
									sandbox="allow-same-origin allow-scripts allow-presentation"
								></iframe>
							</div>
						</div>
					{/if}

					<Field.Field>
						<div class="flex items-center justify-between">
							<Field.Label>Tags</Field.Label>
							<Button.Root type="button" variant="outline" size="sm" class="gap-2" onclick={addTagField}>
								<PlusIcon class="size-4" />
								Add tag
							</Button.Root>
						</div>
						<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{#each tagInputs as _, index (index)}
								<div class="flex items-center gap-2 rounded-xl border border-[#E7ECEA] bg-[#F9FBFA] p-2">
									<Input
										bind:value={tagInputs[index]}
										placeholder={`Tag ${index + 1}`}
										class="border-0 bg-transparent shadow-none focus-visible:ring-0"
										oninput={(event) => {
											const value = (event.currentTarget as HTMLInputElement).value;
											tagInputs[index] = value;
											tagInputs = [...tagInputs];
										}}
									/>
									{#if index >= 3}
										<Button.Root
											type="button"
											variant="ghost"
											size="icon"
											class="shrink-0"
											onclick={() => removeTagField(index)}
											aria-label={`Remove tag ${index + 1}`}
										>
											<XIcon class="size-4" />
										</Button.Root>
									{/if}
								</div>
							{/each}
						</div>
					</Field.Field>

					<Field.Field>
						<Field.Label for="education-subject">Subject</Field.Label>
						<Textarea
							id="education-subject"
							bind:value={subject}
							rows={7}
							placeholder="Add context, talking points, or a longer description for search."
						/>
					</Field.Field>

					{#if submitError}
						<div class="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
							{submitError}
						</div>
					{/if}
				</div>

				<Sheet.Footer class="border-t border-border px-6 py-4 sm:justify-between">
					<p class="text-xs leading-5 text-muted-foreground">
						The Education Module hides share/download actions in-app, but open Drive links cannot be fully secured.
					</p>
					<div class="flex items-center gap-3">
						<Button.Root
							type="button"
							variant="outline"
							onclick={() => {
								addVideoOpen = false;
								resetCreateForm();
							}}
						>
							Cancel
						</Button.Root>
						<Button.Root type="submit" disabled={creatingVideo}>
							{creatingVideo ? 'Saving...' : editingVideoId ? 'Update Video' : 'Save Video'}
						</Button.Root>
					</div>
				</Sheet.Footer>
			</form>
		</div>
	</Sheet.Content>
</Sheet.Root>

{#if activeVideo}
	<div
		bind:this={fullscreenContainer}
		class="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/90 p-4"
	>
		<div class="flex h-full w-full max-w-7xl flex-col gap-4">
			<div class="flex items-start justify-between gap-4 text-white">
				<div>
					<p class="text-xs font-medium tracking-[0.24em] uppercase text-white/70">Education Module</p>
					<h2 class="mt-1 text-2xl font-semibold">{activeVideo.title}</h2>
				</div>
				<div class="flex items-center gap-3">
					<Button.Root
						type="button"
						variant="outline"
						class="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
						disabled={!canGoToPreviousVideo}
						onclick={() => openAdjacentVideo(-1)}
					>
						<ChevronLeftIcon class="mr-2 size-4" />
						Previous
					</Button.Root>
					<Button.Root
						type="button"
						variant="outline"
						class="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
						disabled={!canGoToNextVideo}
						onclick={() => openAdjacentVideo(1)}
					>
						Next
						<ChevronRightIcon class="ml-2 size-4" />
					</Button.Root>
					<Button.Root
						type="button"
						variant="outline"
						class="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
						onclick={closeVideo}
					>
						<XIcon class="mr-2 size-4" />
						Close
					</Button.Root>
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
				<iframe
					src={activeVideo.embedUrl}
					title={activeVideo.title}
					class="h-full min-h-[70vh] w-full"
					allow="autoplay; fullscreen"
					allowfullscreen
					referrerpolicy="strict-origin-when-cross-origin"
					sandbox="allow-same-origin allow-scripts allow-presentation"
				></iframe>
			</div>
		</div>
	</div>
{/if}
