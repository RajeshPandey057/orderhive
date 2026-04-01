<script lang="ts">
	import { asset } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { toast } from 'svelte-sonner';
	import AlertCircle from '~icons/lucide/alert-circle';
	import CheckCircle from '~icons/lucide/check-circle-2';
	import Upload from '~icons/lucide/cloud-upload';
	import Download from '~icons/lucide/download';
	import FileText from '~icons/lucide/file-text';
	import Loader2 from '~icons/lucide/loader-2';
	import X from '~icons/lucide/x';
	import { importBulkSales, type BulkImportResult } from './bulk-import.remote';

	const columnReference = [
		{
			column: 'order_id',
			required: 'Yes',
			notes:
				'Becomes the Sale ID in the system. Must follow the INDN001 format — "IND" prefix followed by a letter and digits (e.g. INDN001, INDM042).'
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
			column: 'closer_email',
			required: 'No',
			notes: 'Must match a user in the system if provided.'
		},
		{
			column: 'third_agent_email',
			required: 'No',
			notes:
				'If provided, enables 3-agent split mode — requires caller_split, closer_split, third_agent_split.'
		},
		{
			column: 'split_preset',
			required: 'No',
			notes: '"70/30" or "55/45". Used in 2-agent mode. Defaults to 70/30.'
		},
		{
			column: 'caller_split',
			required: 'No',
			notes:
				'Number 0-100. Required when third_agent_email is set. caller_split + closer_split + third_agent_split must equal 100.'
		},
		{
			column: 'closer_split',
			required: 'No',
			notes: 'Number 0-100. Required when third_agent_email is set.'
		},
		{
			column: 'third_agent_split',
			required: 'No',
			notes: 'Number 0-100. Required when third_agent_email is set.'
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
		{ column: 'referral_amount_type', required: 'No', notes: '"percentage" or "amount".' },
		{ column: 'referral_amount', required: 'No', notes: 'Number. Used with referral_amount_type.' },
		{ column: 'caller_manager_email', required: 'No', notes: 'Valid email if provided.' },
		{ column: 'closer_manager_email', required: 'No', notes: 'Valid email if provided.' },
		{
			column: 'senior_manager_email',
			required: 'No',
			notes: 'Email of the senior manager (must be a valid email).'
		},
		{
			column: 'reporting_manager_email',
			required: 'No',
			notes: 'Email of the reporting manager (must be a valid email).'
		}
	];

	let lenientMode = $state(false);
	$effect(() => {
		importBulkSales.fields.lenient?.set(lenientMode ? 'true' : 'false');
	});

	let csvFile = $state<File | null>(null);
	let isImporting = $state(false);
	let result = $state<BulkImportResult | null>(null);

	const canImport = $derived(csvFile !== null && !isImporting);
	const importBulkSalesForm = importBulkSales.enhance(async ({ submit }) => {
		if (!csvFile) return;

		isImporting = true;
		result = null;
		try {
			await submit();
			result = (importBulkSales.result as BulkImportResult | null) ?? {
				imported: [],
				errors: []
			};

			if (result.imported.length > 0) {
				toast.success(
					`Successfully imported ${result.imported.length} sale${result.imported.length !== 1 ? 's' : ''}`
				);
			}
			if (result.errors.length > 0) {
				toast.warning(
					`${result.errors.length} row${result.errors.length !== 1 ? 's' : ''} had errors`
				);
			}
			if (result.imported.length === 0 && result.errors.length === 0) {
				toast.info('No rows found in the CSV file.');
			}
		} catch {
			toast.error('An unexpected error occurred during import');
		} finally {
			isImporting = false;
		}
	});

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		csvFile = input.files?.[0] ?? null;
		if (csvFile) {
			importBulkSales.fields.csv.set(csvFile);
		} else {
			importBulkSales.fields.csv.set(undefined);
		}
		result = null;
	}

	function removeFile() {
		csvFile = null;
		importBulkSales.fields.csv.set(undefined);
		result = null;
		const input = document.getElementById('csv-input') as HTMLInputElement;
		if (input) input.value = '';
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
	<!-- Upload card -->
	<Card.Root>
		<form {...importBulkSalesForm} enctype="multipart/form-data">
			<Card.Header>
				<Card.Title>Import Sales from CSV</Card.Title>
				<Card.Description>
					Upload a CSV file to bulk-create sales. Google Drive links in the CSV are stored as-is —
					no re-upload required.
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

				<!-- File input — always kept in DOM so FormData picks it up on submit -->
				<input
					id="csv-input"
					{...importBulkSales.fields.csv.as('file')}
					accept=".csv"
					class="hidden"
					onchange={handleFileChange}
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
						<button
							type="button"
							onclick={removeFile}
							class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
						>
							<X class="h-4 w-4" />
						</button>
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
							When enabled, all field validations are relaxed — only order_id is required. Useful
							for importing partial data.
						</p>
					</div>
					<Switch.Root bind:checked={lenientMode} class="data-[state=checked]:bg-orange-500" />
				</div>
				<input
					type="hidden"
					{...importBulkSales.fields.lenient?.as('text')}
					value={lenientMode ? 'true' : 'false'}
				/>
			</Card.Content>
			<Card.Footer class="mt-4 justify-end">
				<button type="submit" disabled={!canImport} class={buttonVariants({ variant: 'default' })}>
					{#if isImporting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Importing...
					{:else}
						<Upload class="mr-2 h-4 w-4" />
						Import Sales
					{/if}
				</button>
			</Card.Footer>
		</form>
	</Card.Root>

	<!-- Results -->
	{#if result}
		{#if result.imported.length > 0}
			<Card.Root>
				<Card.Header>
					<div class="flex items-center gap-2">
						<CheckCircle class="h-5 w-5 text-green-600" />
						<Card.Title>Successfully Imported ({result.imported.length})</Card.Title>
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
							{#each result.imported as sale (sale.id)}
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

		{#if result.errors.length > 0}
			<Card.Root class="border-destructive/30">
				<Card.Header>
					<div class="flex items-center gap-2">
						<AlertCircle class="h-5 w-5 text-destructive" />
						<Card.Title>Import Errors ({result.errors.length})</Card.Title>
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
							{#each result.errors as err, i (i)}
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

		{#if result.imported.length === 0 && result.errors.length === 0}
			<Card.Root>
				<Card.Content class="py-8 text-center text-muted-foreground">
					No rows found in the CSV file.
				</Card.Content>
			</Card.Root>
		{/if}
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
