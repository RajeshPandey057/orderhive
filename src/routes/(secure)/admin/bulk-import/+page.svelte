<script lang="ts">
	import { asset } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import type { ImportedSale, ImportError } from '$lib/server/bulk-import-helpers';
	import { toast } from 'svelte-sonner';
	import { SvelteSet } from 'svelte/reactivity';
	import AlertCircle from '~icons/lucide/alert-circle';
	import CheckCircle from '~icons/lucide/check-circle-2';
	import Upload from '~icons/lucide/cloud-upload';
	import Download from '~icons/lucide/download';
	import FileText from '~icons/lucide/file-text';
	import Loader2 from '~icons/lucide/loader-2';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import X from '~icons/lucide/x';

	type ActivityKind = 'chunk' | 'imported' | 'updated' | 'error';
	type ActivityEntry = { kind: ActivityKind; label: string; ts: number };

	const columnReference = [
		{
			column: 'order_id',
			required: 'Yes',
			notes:
				'Becomes the Sale ID in the system. Must follow the INDN001 format — "IND" prefix followed by a letter and digits.'
		},
		{
			column: 'is_joint_buyer',
			required: 'Yes',
			notes: '"false" for the primary buyer row, "true" for joint buyer rows.'
		},
		{ column: 'first_name', required: 'Yes', notes: '' },
		{ column: 'last_name', required: 'Yes', notes: '' },
		{ column: 'email', required: 'Yes', notes: 'Valid email address.' },
		{ column: 'phone', required: 'Yes', notes: 'Include country code, e.g. +971501234567.' },
		{ column: 'passport_url', required: 'Yes', notes: 'Google Drive link — stored as-is.' },
		{ column: 'national_id_url', required: 'Yes', notes: 'Google Drive link — stored as-is.' },
		{ column: 'aml_form_url', required: 'No', notes: 'Google Drive link — optional.' },
		{
			column: 'sale_date',
			required: 'Yes (primary)',
			notes: 'Format: 26-Apr-2026 (DD-Mmm-YYYY).'
		},
		{ column: 'nationality', required: 'No', notes: 'e.g. "Indian", "Emirati".' },
		{
			column: 'resident_status',
			required: 'No',
			notes: '"resident" or "non-resident".'
		},
		{
			column: 'caller_email',
			required: 'Yes (primary)',
			notes: 'Must match a user in the system.'
		},
		{
			column: 'caller_manager_email',
			required: 'Yes (primary)',
			notes: 'Valid email. Required for caller in strict mode.'
		},
		{
			column: 'caller_senior_manager_email',
			required: 'Yes (primary)',
			notes: "Email of the caller's senior manager. Required for caller in strict mode."
		},
		{
			column: 'caller_split',
			required: 'No',
			notes:
				'Number 0-100. All provided splits must sum to 100. Defaults to 100 if no closer is set.'
		},
		{
			column: 'closer_email',
			required: 'No',
			notes: 'Must match a user in the system if provided.'
		},
		{
			column: 'closer_manager_email',
			required: 'Yes (when closer_email set)',
			notes: 'Valid email. Required when closer_email is provided in strict mode.'
		},
		{
			column: 'closer_senior_manager_email',
			required: 'Yes (when closer_email set)',
			notes:
				"Email of the closer's senior manager. Required when closer_email is provided in strict mode."
		},
		{
			column: 'closer_split',
			required: 'No',
			notes: 'Number 0-100. Required when closer_email is set.'
		},
		{
			column: 'closer2_email',
			required: 'No',
			notes: 'Second closer (Closer 2). Must match a user in the system if provided.'
		},
		{
			column: 'closer2_manager_email',
			required: 'Yes (when closer2_email set)',
			notes: 'Required when closer2_email is provided in strict mode.'
		},
		{
			column: 'closer2_senior_manager_email',
			required: 'Yes (when closer2_email set)',
			notes: 'Required when closer2_email is provided in strict mode.'
		},
		{
			column: 'closer2_split',
			required: 'No',
			notes: 'Number 0-100. Required when closer2_email is set.'
		},
		{
			column: 'closer3_email',
			required: 'No',
			notes: 'Third closer (Closer 3). Must match a user in the system if provided.'
		},
		{
			column: 'closer3_manager_email',
			required: 'Yes (when closer3_email set)',
			notes: 'Required when closer3_email is provided in strict mode.'
		},
		{
			column: 'closer3_senior_manager_email',
			required: 'Yes (when closer3_email set)',
			notes: 'Required when closer3_email is provided in strict mode.'
		},
		{
			column: 'closer3_split',
			required: 'No',
			notes: 'Number 0-100. Required when closer3_email is set.'
		},
		{ column: 'deal_stage', required: 'Yes (primary)', notes: '"eoi" or "booking".' },
		{
			column: 'payment_value',
			required: 'Yes (primary)',
			notes: 'Actual payment amount (e.g. 500000 for AED 500k).'
		},
		{ column: 'booking_form_url', required: 'Yes (primary)', notes: 'Google Drive link.' },
		{ column: 'payment_receipt_url', required: 'Yes (primary)', notes: 'Google Drive link.' },
		{ column: 'referral_agreement_url', required: 'No', notes: 'Google Drive link — optional.' },
		{ column: 'sale_type', required: 'Yes (primary)', notes: '"off-plan" or "secondary".' },
		{
			column: 'developer',
			required: 'Yes (primary)',
			notes: 'Developer slug, e.g. "emaar", "damac".'
		},
		{ column: 'project', required: 'Yes (primary)', notes: 'Project name.' },
		{ column: 'community', required: 'No', notes: 'Community name, e.g. "Dubai Marina".' },
		{
			column: 'property_type',
			required: 'Yes (primary)',
			notes: '"apartment", "townhouse", "villa", "commercial", or "plot".'
		},
		{
			column: 'bedroom_type',
			required: 'Conditional',
			notes: 'Required for apartment, townhouse, villa. E.g. "2bed", "3bed+maid", "studio".'
		},
		{
			column: 'commercial_sub_type',
			required: 'Conditional',
			notes: 'Required for commercial. "office" or "warehouse".'
		},
		{
			column: 'property_size',
			required: 'Conditional',
			notes: 'Required for apartment, commercial, plot (sqft).'
		},
		{ column: 'plot_area', required: 'Conditional', notes: 'Required for townhouse/villa (sqft).' },
		{
			column: 'built_up_area',
			required: 'Conditional',
			notes: 'Required for townhouse/villa (sqft).'
		},
		{
			column: 'gross_floor_area',
			required: 'Conditional',
			notes: 'Required for warehouse (sqft).'
		},
		{ column: 'unit_no', required: 'Yes (primary)', notes: 'Unit number, e.g. "A-1204".' },
		{
			column: 'unit_value',
			required: 'Yes (primary)',
			notes: 'Unit value as string, e.g. "2500000".'
		},
		{
			column: 'invoice_stage',
			required: 'Yes (primary)',
			notes: '"first-half", "second-half", "full", or "not-yet-eligible".'
		},
		{ column: 'tentative_eligibility_date', required: 'No', notes: 'DD/MM/YYYY format.' },
		{
			column: 'commission_percentage',
			required: 'No',
			notes:
				'Commission % for the deal (0–100). Used to calculate revenueAchieved = unitValue × commission_percentage / 100.'
		},
		{
			column: 'passback_amount',
			required: 'No',
			notes:
				'Lump-sum passback deducted from revenueAchieved. revenueAfterPassback = revenueAchieved − passback_amount.'
		}
	];

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------
	type Step = 'idle' | 'uploading' | 'validated' | 'processing' | 'completed' | 'error';

	let step = $state<Step>('idle');
	let lenientMode = $state(false);
	let csvFile = $state<File | null>(null);

	// After Phase 1 (validate + queue)
	let jobId = $state<string | null>(null);
	let totalGroups = $state(0);
	let validationErrors = $state<ImportError[]>([]);

	// Accumulated via polling (Phase 2)
	let processedCount = $state(0);
	let importedSales = $state<ImportedSale[]>([]);
	let updatedSales = $state<ImportedSale[]>([]);
	let importErrors = $state<ImportError[]>([]);

	const POLL_INTERVAL = 2500; // ms between status polls

	const progressPercent = $derived(
		totalGroups > 0 ? Math.round((processedCount / totalGroups) * 100) : 0
	);

	// Live activity log
	let activityLog = $state<ActivityEntry[]>([]);
	let currentActivity = $state('');
	let startedAt = $state<number>(0);
	let elapsedSeconds = $state(0);
	let elapsedTimer: ReturnType<typeof setInterval> | null = null;
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	// Track which sale IDs we've already logged to avoid duplicates across polls
	let seenImportedIds = new SvelteSet<string>();
	let seenUpdatedIds = new SvelteSet<string>();
	let seenErrorIds = new SvelteSet<string>();

	const elapsedLabel = $derived(() => {
		const m = Math.floor(elapsedSeconds / 60);
		const s = elapsedSeconds % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	});

	function startTimer() {
		startedAt = Date.now();
		elapsedSeconds = 0;
		elapsedTimer = setInterval(() => {
			elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
		}, 1000);
	}

	function stopTimer() {
		if (elapsedTimer) {
			clearInterval(elapsedTimer);
			elapsedTimer = null;
		}
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	function pushLog(entry: ActivityEntry) {
		activityLog = [entry, ...activityLog].slice(0, 80);
	}

	// ---------------------------------------------------------------------------
	// $effect: on mount check localStorage for an active job and resume polling
	// ---------------------------------------------------------------------------
	$effect(() => {
		const savedJobId = localStorage.getItem('bulk_import_job_id');
		if (savedJobId && step === 'idle') {
			// Resume: load job state without requiring re-upload
			fetch(`/api/bulk-import/${savedJobId}`)
				.then((r) => r.json())
				.then((job) => {
					if (!job || job.error) {
						localStorage.removeItem('bulk_import_job_id');
						return;
					}
					// Only resume if still in progress
					if (job.status === 'processing' || job.status === 'queued') {
						jobId = savedJobId;
						totalGroups = job.totalGroups ?? 0;
						validationErrors = job.validationErrors ?? [];
						processedCount = job.processedCount ?? 0;
						importedSales = job.imported ?? [];
						updatedSales = job.updated ?? [];
						importErrors = job.errors ?? [];
						// Seed seen sets so we don't re-log what's already done
						for (const s of importedSales) seenImportedIds.add(s.id);
						for (const s of updatedSales) seenUpdatedIds.add(s.id);
						for (const e of importErrors) seenErrorIds.add(`${e.order_id}:${e.row}`);
						step = 'processing';
						currentActivity = `Resumed — ${processedCount}/${totalGroups} processed so far…`;
						startTimer();
						startPolling();
					} else if (job.status === 'completed' || job.status === 'failed') {
						// Already done — show results quietly without re-triggering
						localStorage.removeItem('bulk_import_job_id');
					}
				})
				.catch(() => {
					localStorage.removeItem('bulk_import_job_id');
				});
		}

		return () => {
			stopPolling();
			stopTimer();
		};
	});

	// ---------------------------------------------------------------------------
	// File handling
	// ---------------------------------------------------------------------------
	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		csvFile = input.files?.[0] ?? null;
		reset();
	}

	function removeFile() {
		csvFile = null;
		const input = document.getElementById('csv-input') as HTMLInputElement;
		if (input) input.value = '';
		reset();
	}

	function reset() {
		stopPolling();
		stopTimer();
		localStorage.removeItem('bulk_import_job_id');
		step = 'idle';
		jobId = null;
		totalGroups = 0;
		validationErrors = [];
		processedCount = 0;
		importedSales = [];
		updatedSales = [];
		importErrors = [];
		activityLog = [];
		currentActivity = '';
		elapsedSeconds = 0;
		seenImportedIds = new SvelteSet();
		seenUpdatedIds = new SvelteSet();
		seenErrorIds = new SvelteSet();
	}

	// ---------------------------------------------------------------------------
	// Phase 1: upload CSV → validate + queue job
	// ---------------------------------------------------------------------------
	async function handleUpload() {
		if (!csvFile) return;

		step = 'uploading';
		validationErrors = [];

		const fd = new FormData();
		fd.append('csv', csvFile);
		fd.append('lenient', lenientMode ? 'true' : 'false');

		try {
			const res = await fetch('/api/bulk-import', { method: 'POST', body: fd });
			const data = await res.json();

			if (!res.ok) {
				toast.error(data.error ?? 'Upload failed');
				step = 'error';
				return;
			}

			jobId = data.jobId;
			totalGroups = data.totalGroups ?? 0;
			validationErrors = data.validationErrors ?? [];

			if (totalGroups === 0 && validationErrors.length === 0) {
				toast.info('No valid rows found in the CSV file.');
				step = 'idle';
				return;
			}

			step = 'validated';

			if (validationErrors.length > 0) {
				toast.warning(
					`${validationErrors.length} validation error${validationErrors.length !== 1 ? 's' : ''} found — review below before importing`
				);
			}
		} catch {
			toast.error('An unexpected error occurred during upload');
			step = 'error';
		}
	}

	// ---------------------------------------------------------------------------
	// Phase 2: trigger server-side background processing, then poll for updates
	// ---------------------------------------------------------------------------
	async function startImport() {
		if (!jobId || totalGroups === 0) return;

		step = 'processing';
		activityLog = [];
		seenImportedIds = new SvelteSet();
		seenUpdatedIds = new SvelteSet();
		seenErrorIds = new SvelteSet();
		startTimer();

		try {
			const res = await fetch(`/api/bulk-import/${jobId}/start`, { method: 'POST' });
			const data = await res.json();

			if (!res.ok) {
				toast.error(data.error ?? 'Failed to start import');
				step = 'error';
				stopTimer();
				return;
			}
		} catch {
			toast.error('Network error starting import');
			step = 'error';
			stopTimer();
			return;
		}

		// Persist jobId so the user can navigate away and come back
		localStorage.setItem('bulk_import_job_id', jobId);

		currentActivity = `Import started — server is processing ${totalGroups} deal${totalGroups !== 1 ? 's' : ''}…`;
		pushLog({ kind: 'chunk', label: `Started processing ${totalGroups} groups`, ts: Date.now() });

		startPolling();
	}

	function startPolling() {
		if (pollTimer) return; // already polling
		pollTimer = setInterval(pollJob, POLL_INTERVAL);
	}

	async function pollJob() {
		if (!jobId) return;

		try {
			const res = await fetch(`/api/bulk-import/${jobId}`);
			if (!res.ok) return; // transient error — keep polling

			const job = await res.json();

			// Diff new imported sales
			const newImported: ImportedSale[] = (job.imported ?? []).filter(
				(s: ImportedSale) => !seenImportedIds.has(s.id)
			);
			const newUpdated: ImportedSale[] = (job.updated ?? []).filter(
				(s: ImportedSale) => !seenUpdatedIds.has(s.id)
			);
			const newErrors: ImportError[] = (job.errors ?? []).filter((e: ImportError) => {
				const key = `${e.order_id}:${e.row}`;
				return !seenErrorIds.has(key);
			});

			for (const s of newImported) {
				seenImportedIds.add(s.id);
				pushLog({ kind: 'imported', label: `${s.id}  ${s.client}`, ts: Date.now() });
			}
			for (const s of newUpdated) {
				seenUpdatedIds.add(s.id);
				pushLog({ kind: 'updated', label: `${s.id}  ${s.client}`, ts: Date.now() });
			}
			for (const e of newErrors) {
				seenErrorIds.add(`${e.order_id}:${e.row}`);
				pushLog({ kind: 'error', label: `${e.order_id || '?'} — ${e.message}`, ts: Date.now() });
			}

			// Update reactive state
			processedCount = job.processedCount ?? processedCount;
			importedSales = job.imported ?? importedSales;
			updatedSales = job.updated ?? updatedSales;
			importErrors = job.errors ?? importErrors;

			const lastItem = newImported.at(-1) ?? newUpdated.at(-1);
			if (lastItem) {
				currentActivity = `Last: ${lastItem.id} (${lastItem.client}) · ${processedCount}/${totalGroups} done · ${importErrors.length} error${importErrors.length !== 1 ? 's' : ''}`;
			} else if (processedCount > 0) {
				currentActivity = `${processedCount}/${totalGroups} processed · ${importErrors.length} error${importErrors.length !== 1 ? 's' : ''}`;
			}

			if (job.status === 'completed' || job.status === 'failed') {
				stopPolling();
				stopTimer();
				localStorage.removeItem('bulk_import_job_id');
				step = job.status === 'completed' ? 'completed' : 'error';
				currentActivity = `Done — ${importedSales.length} imported, ${updatedSales.length} updated, ${importErrors.length} error${importErrors.length !== 1 ? 's' : ''}`;

				if (job.status === 'completed') {
					if (importedSales.length > 0)
						toast.success(
							`Imported ${importedSales.length} sale${importedSales.length !== 1 ? 's' : ''}`
						);
					if (updatedSales.length > 0)
						toast.success(
							`Updated ${updatedSales.length} sale${updatedSales.length !== 1 ? 's' : ''}`
						);
					if (importErrors.length > 0)
						toast.warning(
							`${importErrors.length} row${importErrors.length !== 1 ? 's' : ''} had errors`
						);
					if (importedSales.length === 0 && updatedSales.length === 0 && importErrors.length === 0)
						toast.info('No sales were created or updated.');
				} else {
					toast.error(job.failureReason ?? 'Import failed on the server');
				}
			}
		} catch {
			// Ignore network blips — keep polling
		}
	}
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center gap-2 px-4">
		<Sidebar.Trigger class="-ms-1" />
		<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
		<h1 class="text-2xl font-medium">Bulk Import</h1>
	</div>
</header>

<div class="flex flex-1 flex-col gap-6 p-6 pt-0">
	<!-- Upload + queue card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Import Sales from CSV</Card.Title>
			<Card.Description>
				Upload a CSV file to bulk-create or update sales. The file is validated instantly and then
				processed in background chunks — no more timeouts on large files.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Sample download -->
			<div class="flex items-center justify-between rounded-lg border border-dashed p-4">
				<div class="flex items-center gap-3">
					<FileText class="h-8 w-8 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">Need a template?</p>
						<p class="text-xs text-muted-foreground">
							Download the sample CSV to see the required column format.
						</p>
					</div>
				</div>
				<a
					href={asset('/sample-bulk-upload.csv')}
					download
					class={buttonVariants({ variant: 'outline', size: 'sm' })}
				>
					<Download class="mr-2 h-4 w-4" />
					Download Sample
				</a>
			</div>

			<!-- File input -->
			<input
				id="csv-input"
				type="file"
				accept=".csv"
				class="hidden"
				onchange={handleFileChange}
				disabled={step === 'uploading' || step === 'processing'}
			/>
			{#if csvFile}
				<div class="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
					<div class="flex items-center gap-3">
						<FileText class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">{csvFile.name}</p>
							<p class="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(1)} KB</p>
						</div>
					</div>
					{#if step === 'idle' || step === 'error'}
						<button
							type="button"
							onclick={removeFile}
							class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
						>
							<X class="h-4 w-4" />
						</button>
					{/if}
				</div>
			{:else}
				<label
					for="csv-input"
					class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors hover:bg-muted/50"
				>
					<Upload class="h-8 w-8 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">Click to upload CSV file</p>
						<p class="text-xs text-muted-foreground">Only .csv files are supported</p>
					</div>
				</label>
			{/if}
		</Card.Content>

		<!-- Lenient mode toggle -->
		<Card.Content class="border-t pt-4">
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div>
					<p class="text-sm font-medium">Non-Mandatory Mode</p>
					<p class="text-xs text-muted-foreground">
						When enabled, all field validations are relaxed — only order_id is required. Useful for
						importing partial data.
					</p>
				</div>
				<Switch.Root
					bind:checked={lenientMode}
					disabled={step !== 'idle' && step !== 'error'}
					class="data-[state=checked]:bg-orange-500"
				/>
			</div>
		</Card.Content>

		<!-- Action footer -->
		<Card.Footer class="mt-4 flex items-center justify-end gap-3">
			{#if step === 'validated'}
				<p class="mr-auto text-sm text-muted-foreground">
					{totalGroups} group{totalGroups !== 1 ? 's' : ''} ready to import
					{#if validationErrors.length > 0}
						· <span class="text-amber-600"
							>{validationErrors.length} validation error{validationErrors.length !== 1
								? 's'
								: ''}</span
						>
					{/if}
				</p>
				<button type="button" onclick={removeFile} class={buttonVariants({ variant: 'outline' })}>
					Cancel
				</button>
				<button
					type="button"
					onclick={startImport}
					disabled={totalGroups === 0}
					class={buttonVariants({ variant: 'default' })}
				>
					<Upload class="mr-2 h-4 w-4" />
					Start Import
				</button>
			{:else if step === 'uploading'}
				<button disabled class={buttonVariants({ variant: 'default' })}>
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Validating…
				</button>
			{:else if step === 'processing'}
				<button disabled class={buttonVariants({ variant: 'default' })}>
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Processing…
				</button>
			{:else}
				<button
					type="button"
					onclick={handleUpload}
					disabled={!csvFile || step === 'completed'}
					class={buttonVariants({ variant: 'default' })}
				>
					<Upload class="mr-2 h-4 w-4" />
					Validate & Queue
				</button>
			{/if}
		</Card.Footer>
	</Card.Root>

	<!-- Live progress card -->
	{#if step === 'processing' || step === 'completed'}
		<Card.Root class={step === 'completed' ? 'border-green-300/60' : ''}>
			<Card.Content class="space-y-4 py-5">
				<!-- Header row -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						{#if step === 'processing'}
							<Loader2 class="h-4 w-4 animate-spin text-primary" />
							<span class="text-sm font-semibold">Importing…</span>
						{:else}
							<CheckCircle class="h-4 w-4 text-green-600" />
							<span class="text-sm font-semibold text-green-700">Import complete</span>
						{/if}
					</div>
					<div class="flex items-center gap-4 text-xs text-muted-foreground">
						<span class="tabular-nums">{processedCount} / {totalGroups} groups</span>
						<span class="tabular-nums">{progressPercent}%</span>
						<span class="font-mono tabular-nums">{elapsedLabel()}</span>
					</div>
				</div>

				<!-- Progress bar -->
				<div class="h-2.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full transition-all duration-500 {step === 'completed'
							? 'bg-green-500'
							: 'bg-primary'}"
						style="width: {progressPercent}%"
					></div>
				</div>

				<!-- Live stat pills -->
				<div class="flex flex-wrap gap-2">
					<span
						class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200"
					>
						<CheckCircle class="h-3 w-3" />
						{importedSales.length} imported
					</span>
					<span
						class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
					>
						<RefreshCw class="h-3 w-3" />
						{updatedSales.length} updated
					</span>
					{#if importErrors.length > 0}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200"
						>
							<AlertCircle class="h-3 w-3" />
							{importErrors.length} error{importErrors.length !== 1 ? 's' : ''}
						</span>
					{/if}
				</div>

				<!-- Current activity line -->
				{#if currentActivity}
					<p class="truncate font-mono text-xs text-muted-foreground">{currentActivity}</p>
				{/if}

				<!-- Activity log feed -->
				{#if activityLog.length > 0}
					<div class="max-h-52 overflow-y-auto rounded-md border bg-muted/30">
						<ul class="divide-y divide-border text-xs">
							{#each activityLog as entry (entry.ts + entry.label)}
								<li class="flex items-start gap-2 px-3 py-1.5">
									{#if entry.kind === 'imported'}
										<CheckCircle class="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
										<span class="text-green-800">{entry.label}</span>
									{:else if entry.kind === 'updated'}
										<RefreshCw class="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
										<span class="text-amber-800">{entry.label}</span>
									{:else if entry.kind === 'error'}
										<AlertCircle class="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
										<span class="text-red-700">{entry.label}</span>
									{:else}
										<span class="mt-0.5 h-3.5 w-3.5 shrink-0 text-center text-muted-foreground"
											>·</span
										>
										<span class="text-muted-foreground">{entry.label}</span>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Validation errors (shown after upload, before starting import) -->
	{#if validationErrors.length > 0}
		<Card.Root class="border-amber-300/50">
			<Card.Header>
				<div class="flex items-center gap-2">
					<AlertCircle class="h-5 w-5 text-amber-600" />
					<Card.Title>Validation Errors ({validationErrors.length})</Card.Title>
				</div>
				<Card.Description>
					These rows failed validation and will be skipped. Valid rows can still be imported.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Order ID</Table.Head>
							<Table.Head>CSV Row #</Table.Head>
							<Table.Head>Error</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each validationErrors as err, i (i)}
							<Table.Row>
								<Table.Cell>{err.order_id || '—'}</Table.Cell>
								<Table.Cell>{err.row || '—'}</Table.Cell>
								<Table.Cell class="text-sm text-amber-700">{err.message}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Live results (accumulated as chunks complete) -->
	{#if importedSales.length > 0}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<CheckCircle class="h-5 w-5 text-green-600" />
					<Card.Title>Successfully Imported ({importedSales.length})</Card.Title>
				</div>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Sale ID</Table.Head>
							<Table.Head>Client</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each importedSales as sale (sale.id)}
							<Table.Row>
								<Table.Cell class="font-mono text-sm font-medium">{sale.id}</Table.Cell>
								<Table.Cell>{sale.client}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if updatedSales.length > 0}
		<Card.Root class="border-amber-300/50">
			<Card.Header>
				<div class="flex items-center gap-2">
					<RefreshCw class="h-5 w-5 text-amber-600" />
					<Card.Title>Updated ({updatedSales.length})</Card.Title>
				</div>
				<Card.Description>
					Existing sales were updated with new data. Approval statuses and comments were preserved.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Sale ID</Table.Head>
							<Table.Head>Client</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each updatedSales as sale (sale.id)}
							<Table.Row>
								<Table.Cell class="font-mono text-sm font-medium">{sale.id}</Table.Cell>
								<Table.Cell>{sale.client}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if importErrors.length > 0}
		<Card.Root class="border-destructive/30">
			<Card.Header>
				<div class="flex items-center gap-2">
					<AlertCircle class="h-5 w-5 text-destructive" />
					<Card.Title>Import Errors ({importErrors.length})</Card.Title>
				</div>
				<Card.Description>
					The following rows could not be imported. Fix the issues and re-upload.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Order ID</Table.Head>
							<Table.Head>CSV Row #</Table.Head>
							<Table.Head>Error</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each importErrors as err, i (i)}
							<Table.Row>
								<Table.Cell>{err.order_id || '—'}</Table.Cell>
								<Table.Cell>{err.row || '—'}</Table.Cell>
								<Table.Cell class="text-sm text-destructive">{err.message}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if step === 'completed' && importedSales.length === 0 && updatedSales.length === 0 && importErrors.length === 0}
		<Card.Root>
			<Card.Content class="py-8 text-center text-muted-foreground">
				No sales were created or updated.
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Column reference -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">CSV Column Reference</Card.Title>
			<Card.Description>All columns supported in the CSV file.</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Column</Table.Head>
						<Table.Head>Required</Table.Head>
						<Table.Head>Notes</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each columnReference as col (col.column)}
						<Table.Row>
							<Table.Cell class="font-mono text-xs">{col.column}</Table.Cell>
							<Table.Cell>
								<Badge
									variant={col.required === 'Yes' || col.required === 'Yes (primary)'
										? 'default'
										: col.required === 'Conditional'
											? 'secondary'
											: 'outline'}
								>
									{col.required}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">{col.notes}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
