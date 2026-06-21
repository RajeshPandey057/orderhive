<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Button from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		MAX_EDUCATION_PDF_SIZE,
		getGoogleDriveThumbnailUrl,
		isSupportedEducationPdf,
		normalizeEducationTags,
		normalizeGoogleDriveVideoSource,
		type NormalizedGoogleDriveSource
	} from '$lib/education';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ArchiveIcon from '~icons/lucide/archive';
	import ChevronLeftIcon from '~icons/lucide/chevron-left';
	import ChevronRightIcon from '~icons/lucide/chevron-right';
	import CirclePlayIcon from '~icons/lucide/circle-play';
	import FileTextIcon from '~icons/lucide/file-text';
	import GraduationCapIcon from '~icons/lucide/graduation-cap';
	import LoaderCircleIcon from '~icons/lucide/loader-circle';
	import PencilIcon from '~icons/lucide/pencil';
	import PlusIcon from '~icons/lucide/plus';
	import SearchIcon from '~icons/lucide/search';
	import XIcon from '~icons/lucide/x';
	import {
		archiveEducationItem,
		createEducationVideo,
		updateEducationVideo
	} from './education.remote';

	type EducationFilter = 'all' | 'video' | 'pdf';
	type SortOrder = 'newest' | 'oldest' | 'title';

	let { data } = $props<{
		data: {
			items: EducationVideo[];
			canManage: boolean;
		};
	}>();

	const allItems = $derived((data.items ?? []) as EducationVideo[]);
	const canManage = $derived(Boolean(data.canManage));

	let searchQuery = $state('');
	let mediaFilter = $state<EducationFilter>('all');
	let sortOrder = $state<SortOrder>('newest');
	let fullscreenContainer = $state<HTMLDivElement | null>(null);
	let activeItem = $state<EducationVideo | null>(null);
	let thumbnailFailures = $state<Record<string, boolean>>({});
	let pdfFrameLoading = $state<Record<string, boolean>>({});
	let pdfFrameError = $state<Record<string, boolean>>({});
	let pdfFrameReady = $state<Record<string, boolean>>({});
	let pdfFrameUrl = $state<Record<string, string>>({});

	let addVideoOpen = $state(false);
	let videoTitle = $state('');
	let driveLink = $state('');
	let videoSubject = $state('');
	let videoTagInputs = $state(['', '', '']);
	let videoTitleError = $state('');
	let driveLinkError = $state('');
	let videoSubmitError = $state('');
	let savingVideo = $state(false);
	let editingVideoId = $state<string | null>(null);

	let addPdfOpen = $state(false);
	let pdfTitle = $state('');
	let pdfSubject = $state('');
	let pdfTagInputs = $state(['', '', '']);
	let pdfFile = $state<File | null>(null);
	let pdfFileInputKey = $state(0);
	let currentPdfFileName = $state('');
	let pdfTitleError = $state('');
	let pdfFileError = $state('');
	let pdfSubmitError = $state('');
	let savingPdf = $state(false);
	let editingPdfId = $state<string | null>(null);

	let archivingId = $state<string | null>(null);

	const drivePreview = $derived.by(() => {
		const trimmedLink = driveLink.trim();
		if (!trimmedLink) {
			return {
				kind: 'idle' as const,
				message: 'Paste an open Google Drive file link to preview it.'
			};
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

	const filteredItems = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();

		return [...allItems]
			.filter((item) => {
				if (mediaFilter !== 'all' && item.itemType !== mediaFilter) {
					return false;
				}

				if (!query) return true;
				return item.searchText.includes(query);
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

	const activeItemIndex = $derived.by(() => {
		const currentItem = activeItem;
		if (!currentItem) return -1;

		return filteredItems.findIndex((item) => item.id === currentItem.id);
	});

	const canGoToPreviousItem = $derived(activeItemIndex > 0);
	const canGoToNextItem = $derived(
		activeItemIndex >= 0 && activeItemIndex < filteredItems.length - 1
	);

	// Fix: close overlay when user exits fullscreen via browser UI (ESC key consumed by browser)
	onMount(() => {
		function handleFullscreenChange() {
			if (!document.fullscreenElement) {
				if (activeItem?.itemType === 'pdf') {
					revokePdfFrameUrl(activeItem.id);
				}
				activeItem = null;
			}
		}
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	});

	function formatCountLabel(): string {
		if (mediaFilter === 'video') return 'videos';
		if (mediaFilter === 'pdf') return 'PDFs';
		return 'items';
	}

	function getEmptyTitle(): string {
		if (searchQuery.trim()) {
			return mediaFilter === 'all'
				? 'No matching content found'
				: mediaFilter === 'video'
					? 'No matching videos found'
					: 'No matching PDFs found';
		}

		return mediaFilter === 'all'
			? 'No education content in the library yet'
			: mediaFilter === 'video'
				? 'No videos in the library yet'
				: 'No PDFs in the library yet';
	}

	function getEmptyDescription(): string {
		if (searchQuery.trim()) {
			return 'Try adjusting your search terms or switching the content filter.';
		}

		if (mediaFilter === 'pdf') {
			return 'Admins can upload PDFs to start building the Education Module library.';
		}

		if (mediaFilter === 'video') {
			return 'Admins can add Google Drive video links to start building the Education Module.';
		}

		return 'Admins can add videos and PDFs to start building the Education Module.';
	}

	function getVideoThumbnailUrl(item: EducationVideo): string | null {
		if (item.itemType !== 'video' || !item.driveFileId || thumbnailFailures[item.id]) return null;
		return getGoogleDriveThumbnailUrl(item.driveFileId);
	}

	function markThumbnailFailed(itemId: string) {
		thumbnailFailures = { ...thumbnailFailures, [itemId]: true };
	}

	function getPdfFrameKey(itemId: string): string {
		return `${itemId}:overlay`;
	}

	function getPdfFrameUrl(itemId: string): string {
		return pdfFrameUrl[getPdfFrameKey(itemId)] ?? '';
	}

	function isPdfFrameLoading(itemId: string): boolean {
		return pdfFrameLoading[getPdfFrameKey(itemId)] === true;
	}

	function isPdfFrameError(itemId: string): boolean {
		return pdfFrameError[getPdfFrameKey(itemId)] === true;
	}

	function isPdfFrameReady(itemId: string): boolean {
		return pdfFrameReady[getPdfFrameKey(itemId)] === true;
	}

	function setPdfFrameLoading(itemId: string, isLoading: boolean) {
		pdfFrameLoading = {
			...pdfFrameLoading,
			[getPdfFrameKey(itemId)]: isLoading
		};
	}

	function setPdfFrameError(itemId: string) {
		const key = getPdfFrameKey(itemId);
		pdfFrameLoading = { ...pdfFrameLoading, [key]: false };
		pdfFrameError = { ...pdfFrameError, [key]: true };
		pdfFrameReady = { ...pdfFrameReady, [key]: false };
	}

	function revokePdfFrameUrl(itemId: string) {
		const key = getPdfFrameKey(itemId);
		const objectUrl = pdfFrameUrl[key];
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			pdfFrameUrl = { ...pdfFrameUrl, [key]: '' };
		}
	}

	function initPdfFrame(itemId: string) {
		const key = getPdfFrameKey(itemId);
		revokePdfFrameUrl(itemId);
		pdfFrameLoading = { ...pdfFrameLoading, [key]: true };
		pdfFrameError = { ...pdfFrameError, [key]: false };
		pdfFrameReady = { ...pdfFrameReady, [key]: false };
		void validatePdfFrame(itemId);
	}

	async function validatePdfFrame(itemId: string) {
		try {
			const response = await fetch(`/api/education/assets/${itemId}`);
			if (!response.ok) {
				throw new Error(`PDF asset request failed with ${response.status}`);
			}

			const contentType = response.headers.get('content-type') ?? '';
			if (!contentType.toLowerCase().includes('application/pdf')) {
				throw new Error(`PDF asset returned ${contentType || 'unknown content type'}`);
			}

			const blob = await response.blob();
			const objectUrl = URL.createObjectURL(blob);

			if (activeItem?.id !== itemId) {
				URL.revokeObjectURL(objectUrl);
				return;
			}

			const key = getPdfFrameKey(itemId);
			pdfFrameUrl = { ...pdfFrameUrl, [key]: `${objectUrl}#toolbar=0&navpanes=0&view=FitH` };
			pdfFrameReady = { ...pdfFrameReady, [key]: true };
		} catch (err) {
			console.error('[education] PDF asset request failed', { itemId, err });
			if (activeItem?.id === itemId) {
				setPdfFrameError(itemId);
			}
		}
	}

	function formatFileSize(size: number | undefined): string {
		if (!size || size <= 0) return '';

		const units = ['B', 'KB', 'MB', 'GB'];
		let value = size;
		let unitIndex = 0;

		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex += 1;
		}

		return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
	}

	function getPdfMetaLabel(item: EducationVideo): string {
		return [item.fileName, formatFileSize(item.fileSize)].filter(Boolean).join(' - ');
	}

	function addVideoTagField() {
		videoTagInputs = [...videoTagInputs, ''];
	}

	function removeVideoTagField(index: number) {
		videoTagInputs = videoTagInputs.filter((_, tagIndex) => tagIndex !== index);
	}

	function addPdfTagField() {
		pdfTagInputs = [...pdfTagInputs, ''];
	}

	function removePdfTagField(index: number) {
		pdfTagInputs = pdfTagInputs.filter((_, tagIndex) => tagIndex !== index);
	}

	function resetVideoForm() {
		editingVideoId = null;
		videoTitle = '';
		driveLink = '';
		videoSubject = '';
		videoTagInputs = ['', '', ''];
		videoTitleError = '';
		driveLinkError = '';
		videoSubmitError = '';
	}

	function resetPdfForm() {
		editingPdfId = null;
		pdfTitle = '';
		pdfSubject = '';
		pdfTagInputs = ['', '', ''];
		pdfFile = null;
		currentPdfFileName = '';
		pdfTitleError = '';
		pdfFileError = '';
		pdfSubmitError = '';
		pdfFileInputKey += 1;
	}

	function openCreateVideoSheet() {
		resetVideoForm();
		addPdfOpen = false;
		addVideoOpen = true;
	}

	function openEditVideoSheet(item: EducationVideo) {
		editingVideoId = item.id;
		videoTitle = item.title;
		driveLink = item.sourceUrl;
		videoSubject = item.subject;
		videoTagInputs =
			item.tags.length > 0
				? [...item.tags, '', '', ''].slice(0, Math.max(item.tags.length, 3))
				: ['', '', ''];
		videoTitleError = '';
		driveLinkError = '';
		videoSubmitError = '';
		addPdfOpen = false;
		addVideoOpen = true;
	}

	function openCreatePdfSheet() {
		resetPdfForm();
		addVideoOpen = false;
		addPdfOpen = true;
	}

	function openEditPdfSheet(item: EducationVideo) {
		editingPdfId = item.id;
		pdfTitle = item.title;
		pdfSubject = item.subject;
		pdfTagInputs =
			item.tags.length > 0
				? [...item.tags, '', '', ''].slice(0, Math.max(item.tags.length, 3))
				: ['', '', ''];
		pdfFile = null;
		currentPdfFileName = item.fileName ?? '';
		pdfTitleError = '';
		pdfFileError = '';
		pdfSubmitError = '';
		pdfFileInputKey += 1;
		addVideoOpen = false;
		addPdfOpen = true;
	}

	function validateVideoForm(): NormalizedGoogleDriveSource | null {
		videoTitleError = '';
		driveLinkError = '';
		videoSubmitError = '';

		if (!videoTitle.trim()) {
			videoTitleError = 'Title is required.';
		}

		const normalizedSource = normalizeGoogleDriveVideoSource(driveLink);
		if (!driveLink.trim()) {
			driveLinkError = 'Google Drive link is required.';
		} else if (!normalizedSource) {
			driveLinkError = 'Please provide a valid embeddable Google Drive file link.';
		}

		if (videoTitleError || driveLinkError || !normalizedSource) {
			return null;
		}

		return normalizedSource;
	}

	function validatePdfForm(requireFile: boolean): boolean {
		pdfTitleError = '';
		pdfFileError = '';
		pdfSubmitError = '';

		if (!pdfTitle.trim()) {
			pdfTitleError = 'Title is required.';
		}

		if (requireFile && !pdfFile) {
			pdfFileError = 'PDF file is required.';
		}

		if (pdfFile && !isSupportedEducationPdf(pdfFile)) {
			pdfFileError = 'Please upload a valid PDF file.';
		}

		if (pdfFile && pdfFile.size > MAX_EDUCATION_PDF_SIZE) {
			pdfFileError = 'PDF file must be 50 MB or smaller.';
		}

		return !(pdfTitleError || pdfFileError);
	}

	async function handleVideoSubmit(event: SubmitEvent) {
		event.preventDefault();

		const normalizedSource = validateVideoForm();
		if (!normalizedSource) return;

		savingVideo = true;

		try {
			const payload = {
				title: videoTitle,
				driveLink: normalizedSource.sourceUrl,
				subject: videoSubject,
				tags: normalizeEducationTags(videoTagInputs)
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
			resetVideoForm();
			await invalidateAll();
		} catch (err) {
			videoSubmitError = err instanceof Error ? err.message : 'Unable to save the video right now.';
			toast.error(videoSubmitError);
		} finally {
			savingVideo = false;
		}
	}

	function handlePdfFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		pdfFile = input.files?.[0] ?? null;
		currentPdfFileName = pdfFile?.name ?? (editingPdfId ? currentPdfFileName : '');
		pdfFileError = '';
	}

	async function handlePdfSubmit(event: SubmitEvent) {
		event.preventDefault();

		const requireFile = !editingPdfId;
		if (!validatePdfForm(requireFile)) return;

		savingPdf = true;

		try {
			const formData = new FormData();
			formData.append('title', pdfTitle);
			formData.append('subject', pdfSubject);

			for (const tag of normalizeEducationTags(pdfTagInputs)) {
				formData.append('tags', tag);
			}

			if (editingPdfId) {
				formData.append('id', editingPdfId);
			}

			if (pdfFile) {
				formData.append('pdfFile', pdfFile);
			}

			const response = await fetch('/api/education/pdfs', {
				method: editingPdfId ? 'PUT' : 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorText = (await response.text()).trim();
				throw new Error(errorText || 'Unable to save the PDF right now.');
			}

			toast.success(editingPdfId ? 'Education PDF updated' : 'Education PDF added');
			addPdfOpen = false;
			resetPdfForm();
			await invalidateAll();
		} catch (err) {
			pdfSubmitError = err instanceof Error ? err.message : 'Unable to save the PDF right now.';
			toast.error(pdfSubmitError);
		} finally {
			savingPdf = false;
		}
	}

	async function handleArchive(item: EducationVideo) {
		if (archivingId) return;
		archivingId = item.id;

		try {
			await archiveEducationItem({ id: item.id });
			toast.success(`"${item.title}" archived`);
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Unable to archive item right now.');
		} finally {
			archivingId = null;
		}
	}

	async function openItem(item: EducationVideo) {
		activeItem = item;
		if (item.itemType === 'pdf') {
			initPdfFrame(item.id);
		}
		await tick();

		try {
			await fullscreenContainer?.requestFullscreen?.();
		} catch {
			// Fullscreen is best effort only; keep the overlay open if the browser blocks it.
		}
	}

	async function closeActiveItem() {
		if (document.fullscreenElement === fullscreenContainer) {
			try {
				await document.exitFullscreen();
				// fullscreenchange listener will set activeItem = null
				return;
			} catch {
				// Ignore exit failures and close the overlay anyway.
			}
		}

		if (activeItem?.itemType === 'pdf') {
			revokePdfFrameUrl(activeItem.id);
		}
		activeItem = null;
	}

	function openAdjacentItem(direction: -1 | 1) {
		if (activeItemIndex < 0) return;

		const nextItem = filteredItems[activeItemIndex + direction];
		if (!nextItem) return;

		activeItem = nextItem;
		if (nextItem.itemType === 'pdf') {
			initPdfFrame(nextItem.id);
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (!activeItem) return;

		if (event.key === 'Escape') {
			void closeActiveItem();
			return;
		}

		if (event.key === 'ArrowLeft') {
			openAdjacentItem(-1);
			return;
		}

		if (event.key === 'ArrowRight') {
			openAdjacentItem(1);
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="mb-6 pt-2">
	<SecurePageHeader
		title="Education Module"
		description="Internal learning library for training videos, walkthroughs, and PDF guides."
	/>
</div>

<div class="flex flex-1 flex-col gap-5 px-6 pb-6">
	<div class="rounded-2xl border border-[#E7ECEA] bg-white p-5 shadow-sm">
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div class="flex flex-col gap-1">
					<p class="text-sm font-medium text-foreground">
						{filteredItems.length} / {allItems.length}
						{formatCountLabel()}
					</p>
					<p class="text-xs text-muted-foreground">
						Search across title, tags, and subject metadata.
					</p>
				</div>

				{#if canManage}
					<div class="flex flex-wrap items-center gap-2">
						<Button.Root
							variant="outline"
							class="gap-2 border-[#D9E1DE] bg-white"
							onclick={openCreatePdfSheet}
						>
							<PlusIcon class="size-4" />
							Add PDF
						</Button.Root>
						<Button.Root class="gap-2" onclick={openCreateVideoSheet}>
							<PlusIcon class="size-4" />
							Add Video
						</Button.Root>
					</div>
				{/if}
			</div>

			<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
				<div class="relative flex-1">
					<SearchIcon
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
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

				<div
					class="inline-flex h-11 w-full items-center rounded-xl border border-[#E7ECEA] bg-[#F8FAF9] p-1 xl:w-auto"
				>
					{#each [{ value: 'all', label: 'All' }, { value: 'video', label: 'Videos' }, { value: 'pdf', label: 'PDF' }] as option (option.value)}
						<button
							type="button"
							class={`inline-flex h-9 min-w-20.5 items-center justify-center rounded-lg px-4 text-sm font-medium transition ${
								mediaFilter === option.value
									? 'bg-white text-foreground shadow-xs'
									: 'text-muted-foreground hover:text-foreground'
							}`}
							onclick={() => {
								mediaFilter = option.value as EducationFilter;
							}}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>

	{#if filteredItems.length === 0}
		<div class="rounded-2xl border border-dashed border-[#D8DFDD] bg-white px-6 py-12">
			<Empty.Root class="mx-auto max-w-xl text-center">
				<Empty.Header>
					<Empty.Media
						class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#FFF2E6] text-[#F04C06]"
					>
						<GraduationCapIcon class="size-7" />
					</Empty.Media>
					<Empty.Title class="mt-4 text-xl font-semibold text-foreground">
						{getEmptyTitle()}
					</Empty.Title>
					<Empty.Description class="mt-2 text-sm text-muted-foreground">
						{getEmptyDescription()}
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each filteredItems as item (item.id)}
				<Card.Root
					class="gap-0 overflow-hidden border-[#E7ECEA] py-0 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
				>
					<div class="border-b border-[#ECE7E1]">
						{#if item.itemType === 'video'}
							<button
								type="button"
								class="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black/15 text-white transition hover:bg-black/25"
								onclick={() => openItem(item)}
								aria-label={`Play ${item.title}`}
							>
								{#if getVideoThumbnailUrl(item)}
									<img
										src={getVideoThumbnailUrl(item) ?? undefined}
										alt={`${item.title} thumbnail`}
										class="absolute inset-0 h-full w-full object-cover"
										loading="lazy"
										onerror={() => markThumbnailFailed(item.id)}
									/>
									<div
										class="absolute inset-0 bg-linear-to-t from-black/55 via-black/20 to-black/15"
									></div>
								{/if}

								<div class="absolute top-3 left-3">
									<Badge class="rounded-full bg-white/14 px-2.5 py-1 text-white backdrop-blur-sm">
										Video
									</Badge>
								</div>

								<div class="flex flex-col items-center gap-2">
									<CirclePlayIcon class="size-12 transition group-hover:scale-105" />
									<span
										class="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] uppercase"
									>
										Play Video
									</span>
								</div>
							</button>
						{:else}
							<button
								type="button"
								class="group relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden bg-[#F4F6F5] px-5 text-center text-[#1F2B49]"
								onclick={() => openItem(item)}
								aria-label={`Open ${item.title}`}
							>
								<div class="absolute top-3 left-3">
									<Badge class="rounded-full bg-white px-2.5 py-1 text-[#1E2A4A]">PDF</Badge>
								</div>
								<div
									class="flex size-16 items-center justify-center rounded-2xl border border-[#E0E6E4] bg-white shadow-sm transition group-hover:scale-105"
								>
									<FileTextIcon class="size-8 text-[#F04C06]" />
								</div>
								<div class="mt-4 max-w-full space-y-1">
									<p class="line-clamp-2 text-sm font-semibold text-[#1F2B49]">{item.title}</p>
									{#if getPdfMetaLabel(item)}
										<p class="truncate text-xs text-[#687976]">{getPdfMetaLabel(item)}</p>
									{:else}
										<p class="text-xs text-[#687976]">PDF document</p>
									{/if}
								</div>
								<div
									class="absolute right-3 bottom-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
								>
									<FileTextIcon class="size-4" />
									Open PDF
								</div>
							</button>
						{/if}
					</div>

					<Card.Content class="space-y-2 px-4 pt-2 pb-3">
						<div class="flex items-start justify-between gap-2.5">
							<div class="min-w-0">
								<h2 class="truncate text-base font-semibold text-foreground">{item.title}</h2>
								<p class="mt-0 line-clamp-2 text-sm text-muted-foreground">
									{item.subject?.trim() || 'No subject added'}
								</p>
							</div>

							{#if canManage}
								<div class="flex shrink-0 items-center gap-1">
									<Button.Root
										type="button"
										variant="ghost"
										size="icon"
										class="size-8 text-[#F04C06] hover:bg-[#FFF1E6] hover:text-[#F04C06]"
										onclick={() =>
											item.itemType === 'video' ? openEditVideoSheet(item) : openEditPdfSheet(item)}
										aria-label={`Edit ${item.title}`}
									>
										<PencilIcon class="size-4" />
									</Button.Root>
									<Button.Root
										type="button"
										variant="ghost"
										size="icon"
										class="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
										disabled={archivingId === item.id}
										onclick={() => handleArchive(item)}
										aria-label={`Archive ${item.title}`}
									>
										{#if archivingId === item.id}
											<LoaderCircleIcon class="size-4 animate-spin" />
										{:else}
											<ArchiveIcon class="size-4" />
										{/if}
									</Button.Root>
								</div>
							{/if}
						</div>

						<div class="flex flex-wrap gap-1">
							{#if item.tags.length > 0}
								{#each item.tags as tag (tag)}
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
					Paste an open Google Drive file link. The app will convert it into an embeddable player
					URL.
				</Sheet.Description>
			</Sheet.Header>

			<form class="flex flex-1 flex-col" onsubmit={handleVideoSubmit}>
				<div class="flex-1 space-y-6 px-6 py-5">
					<Field.Field>
						<Field.Label for="education-video-title">Video title</Field.Label>
						<Input
							id="education-video-title"
							bind:value={videoTitle}
							placeholder="e.g. Weekly sales process walkthrough"
						/>
						{#if videoTitleError}
							<Field.Error>{videoTitleError}</Field.Error>
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
							Only Google Drive file links are supported for videos. Open/public links remain
							shareable outside the app.
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
							<Button.Root
								type="button"
								variant="outline"
								size="sm"
								class="gap-2"
								onclick={addVideoTagField}
							>
								<PlusIcon class="size-4" />
								Add tag
							</Button.Root>
						</div>
						<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{#each videoTagInputs, index (index)}
								<div
									class="flex items-center gap-2 rounded-xl border border-[#E7ECEA] bg-[#F9FBFA] p-2"
								>
									<Input
										bind:value={videoTagInputs[index]}
										placeholder={`Tag ${index + 1}`}
										class="border-0 bg-transparent shadow-none focus-visible:ring-0"
										oninput={(event) => {
											const value = (event.currentTarget as HTMLInputElement).value;
											videoTagInputs[index] = value;
											videoTagInputs = [...videoTagInputs];
										}}
									/>
									{#if index >= 3}
										<Button.Root
											type="button"
											variant="ghost"
											size="icon"
											class="shrink-0"
											onclick={() => removeVideoTagField(index)}
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
						<Field.Label for="education-video-subject">Subject</Field.Label>
						<Textarea
							id="education-video-subject"
							bind:value={videoSubject}
							rows={7}
							placeholder="Add context, talking points, or a longer description for search."
						/>
					</Field.Field>

					{#if videoSubmitError}
						<div
							class="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
						>
							{videoSubmitError}
						</div>
					{/if}
				</div>

				<Sheet.Footer class="border-t border-border px-6 py-4 sm:justify-between">
					<p class="text-xs leading-5 text-muted-foreground">
						The Education Module hides share/download actions in-app, but open Drive links cannot be
						fully secured.
					</p>
					<div class="flex items-center gap-3">
						<Button.Root
							type="button"
							variant="outline"
							onclick={() => {
								addVideoOpen = false;
								resetVideoForm();
							}}
						>
							Cancel
						</Button.Root>
						<Button.Root type="submit" disabled={savingVideo}>
							{savingVideo ? 'Saving...' : editingVideoId ? 'Update Video' : 'Save Video'}
						</Button.Root>
					</div>
				</Sheet.Footer>
			</form>
		</div>
	</Sheet.Content>
</Sheet.Root>

<Sheet.Root bind:open={addPdfOpen}>
	<Sheet.Content side="right" class="w-full overflow-y-auto p-0 sm:max-w-2xl">
		<div class="flex h-full flex-col">
			<Sheet.Header class="border-b border-border px-6 py-5 text-left">
				<Sheet.Title class="text-2xl font-semibold">
					{editingPdfId ? 'Edit PDF' : 'Add PDF'}
				</Sheet.Title>
				<Sheet.Description>
					Upload a PDF up to 50 MB. The file stays inside the Education Module and opens inline for
					reading.
				</Sheet.Description>
			</Sheet.Header>

			<form class="flex flex-1 flex-col" onsubmit={handlePdfSubmit}>
				<div class="flex-1 space-y-6 px-6 py-5">
					<Field.Field>
						<Field.Label for="education-pdf-title">PDF title</Field.Label>
						<Input
							id="education-pdf-title"
							bind:value={pdfTitle}
							placeholder="e.g. Sales onboarding handbook"
						/>
						{#if pdfTitleError}
							<Field.Error>{pdfTitleError}</Field.Error>
						{/if}
					</Field.Field>

					<Field.Field>
						<Field.Label for="education-pdf-file">Upload PDF</Field.Label>
						{#key pdfFileInputKey}
							<Input
								id="education-pdf-file"
								type="file"
								accept="application/pdf,.pdf"
								onchange={handlePdfFileChange}
							/>
						{/key}
						<Field.Description>
							PDF only, up to 50 MB. Browser-level share/download controls are hidden where
							supported.
						</Field.Description>
						{#if currentPdfFileName}
							<p class="text-xs text-muted-foreground">
								Current file: {currentPdfFileName}
							</p>
						{/if}
						{#if pdfFileError}
							<Field.Error>{pdfFileError}</Field.Error>
						{/if}
					</Field.Field>

					<Field.Field>
						<div class="flex items-center justify-between">
							<Field.Label>Tags</Field.Label>
							<Button.Root
								type="button"
								variant="outline"
								size="sm"
								class="gap-2"
								onclick={addPdfTagField}
							>
								<PlusIcon class="size-4" />
								Add tag
							</Button.Root>
						</div>
						<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{#each pdfTagInputs, index (index)}
								<div
									class="flex items-center gap-2 rounded-xl border border-[#E7ECEA] bg-[#F9FBFA] p-2"
								>
									<Input
										bind:value={pdfTagInputs[index]}
										placeholder={`Tag ${index + 1}`}
										class="border-0 bg-transparent shadow-none focus-visible:ring-0"
										oninput={(event) => {
											const value = (event.currentTarget as HTMLInputElement).value;
											pdfTagInputs[index] = value;
											pdfTagInputs = [...pdfTagInputs];
										}}
									/>
									{#if index >= 3}
										<Button.Root
											type="button"
											variant="ghost"
											size="icon"
											class="shrink-0"
											onclick={() => removePdfTagField(index)}
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
						<Field.Label for="education-pdf-subject">Subject</Field.Label>
						<Textarea
							id="education-pdf-subject"
							bind:value={pdfSubject}
							rows={7}
							placeholder="Add context, key points, or a longer description for search."
						/>
					</Field.Field>

					{#if pdfSubmitError}
						<div
							class="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
						>
							{pdfSubmitError}
						</div>
					{/if}
				</div>

				<Sheet.Footer class="border-t border-border px-6 py-4 sm:justify-between">
					<p class="text-xs leading-5 text-muted-foreground">
						PDF reading stays inside the app viewer, but browser support for fully hiding built-in
						actions can vary.
					</p>
					<div class="flex items-center gap-3">
						<Button.Root
							type="button"
							variant="outline"
							onclick={() => {
								addPdfOpen = false;
								resetPdfForm();
							}}
						>
							Cancel
						</Button.Root>
						<Button.Root type="submit" disabled={savingPdf}>
							{savingPdf ? 'Saving...' : editingPdfId ? 'Update PDF' : 'Save PDF'}
						</Button.Root>
					</div>
				</Sheet.Footer>
			</form>
		</div>
	</Sheet.Content>
</Sheet.Root>

{#if activeItem}
	<div
		bind:this={fullscreenContainer}
		class="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/90 p-4"
	>
		<div class="flex h-full w-full max-w-7xl flex-col gap-4">
			<div class="flex items-start justify-between gap-4 text-white">
				<div>
					<p class="text-xs font-medium tracking-[0.24em] text-white/70 uppercase">
						Education Module
					</p>
					<h2 class="mt-1 text-2xl font-semibold">{activeItem.title}</h2>
				</div>
				<div class="flex items-center gap-3">
					<Button.Root
						type="button"
						variant="outline"
						class="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
						disabled={!canGoToPreviousItem}
						onclick={() => openAdjacentItem(-1)}
					>
						<ChevronLeftIcon class="mr-2 size-4" />
						Previous
					</Button.Root>
					<Button.Root
						type="button"
						variant="outline"
						class="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
						disabled={!canGoToNextItem}
						onclick={() => openAdjacentItem(1)}
					>
						Next
						<ChevronRightIcon class="ml-2 size-4" />
					</Button.Root>
					<Button.Root
						type="button"
						variant="outline"
						class="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
						onclick={closeActiveItem}
					>
						<XIcon class="mr-2 size-4" />
						Close
					</Button.Root>
				</div>
			</div>

			<div
				class="min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl"
			>
				{#if activeItem.itemType === 'video'}
					<iframe
						src={activeItem.embedUrl}
						title={activeItem.title}
						class="h-full min-h-[70vh] w-full"
						allow="autoplay; fullscreen"
						allowfullscreen
						referrerpolicy="strict-origin-when-cross-origin"
						sandbox="allow-same-origin allow-scripts allow-presentation"
					></iframe>
				{:else}
					<div class="relative h-full min-h-[70vh] w-full bg-white">
						{#if isPdfFrameReady(activeItem.id) && !isPdfFrameError(activeItem.id)}
							<iframe
								src={getPdfFrameUrl(activeItem.id)}
								title={activeItem.title}
								class="h-full min-h-[70vh] w-full bg-white"
								onload={() => {
									if (activeItem) {
										setPdfFrameLoading(activeItem.id, false);
									}
								}}
								onerror={() => {
									if (activeItem) {
										setPdfFrameError(activeItem.id);
									}
								}}
							></iframe>
						{/if}
						{#if isPdfFrameLoading(activeItem.id)}
							<div class="absolute inset-0 flex items-center justify-center bg-white">
								<div class="flex flex-col items-center gap-4 text-[#1F2B49]">
									<div
										class="relative flex size-16 items-center justify-center rounded-full border border-[#E4E9F0] bg-[#F8FAFD] shadow-sm"
									>
										<LoaderCircleIcon class="size-7 animate-spin" />
									</div>
									<div class="space-y-1 text-center">
										<p class="text-base font-semibold">Loading PDF</p>
										<p class="text-sm text-muted-foreground">
											Please wait while the document opens.
										</p>
									</div>
								</div>
							</div>
						{:else if isPdfFrameError(activeItem.id)}
							<div class="absolute inset-0 flex items-center justify-center bg-white">
								<div class="flex flex-col items-center gap-4 text-[#1F2B49]">
									<FileTextIcon class="size-14 opacity-30" />
									<div class="space-y-1 text-center">
										<p class="text-base font-semibold">Unable to load PDF</p>
										<p class="text-sm text-muted-foreground">
											The document could not be displayed. Try again later.
										</p>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
