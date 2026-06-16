<script lang="ts">
	import SecurePageHeader from '$lib/components/secure-page-header.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as Select from '$lib/components/ui/select';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { getEffectiveSaleRevenue, isActiveSale } from '$lib/sales';
	import { firekitCollection } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';
	import AlertCircle from '~icons/lucide/alert-circle';
	import Copy from '~icons/lucide/copy';
	import FileCheck2 from '~icons/lucide/file-check-2';
	import Home from '~icons/lucide/house';
	import Loader from '~icons/svg-spinners/blocks-shuffle-3';
	import Tag from '~icons/lucide/tag';
	import X from '~icons/lucide/x';

	type AmlSummaryRow = {
		key: string;
		seniorManager: string;
		totalDeals: number;
		amlDone: number;
		amlNotDone: number;
		amlDonePercentage: number;
		amlNotDonePercentage: number;
	};

	type MonthOption = {
		label: string;
		value: string;
	};

	const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
	const wholeNumberFormatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	const currentDate = new Date();
	const defaultYear = String(currentDate.getFullYear());
	const defaultMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
	const monthOptions: MonthOption[] = Array.from({ length: 12 }, (_, index) => {
		const month = index + 1;

		return {
			label: monthFormatter.format(new Date(2000, index, 1)),
			value: String(month).padStart(2, '0')
		};
	});

	const salesCollection = firekitCollection<Sale>('sales');
	const activeSales = $derived(salesCollection.data?.filter(isActiveSale) ?? []);
	const confirmedSales = $derived(activeSales.filter((sale) => sale.dealStage === 'booking'));

	let selectedYear = $state(defaultYear);
	let selectedMonth = $state(defaultMonth);
	let showAllDeals = $state(false);
	let dealSheetOpen = $state(false);
	let selectedSeniorManager = $state<string | null>(null);
	let summaryTableScroller: HTMLDivElement | null = $state(null);
	let summaryScrollbar: HTMLDivElement | null = $state(null);
	let dealsTableScroller: HTMLDivElement | null = $state(null);
	let dealsScrollbar: HTMLDivElement | null = $state(null);

	function toMonthKey(date: Date): string {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	}

	function getSaleDate(sale: Sale): Date | null {
		if (!sale.saleDate) return null;

		const parsed = new Date(`${sale.saleDate.slice(0, 10)}T00:00:00`);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	function getSaleMonthKey(sale: Sale): string | null {
		const date = getSaleDate(sale);
		return date ? toMonthKey(date) : null;
	}

	function getDisplayName(value: string): string {
		if (!value) return 'Unassigned';
		const [namePart] = value.split('@');
		return namePart
			.split(/[._-]+/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}

	function getSeniorManagers(sale: Sale): string[] {
		const seniorManagers: string[] = [];

		function addSeniorManager(value: string | undefined): void {
			const seniorManager = value?.trim();
			if (!seniorManager) return;

			const displayName = getDisplayName(seniorManager);
			if (!seniorManagers.includes(displayName)) seniorManagers.push(displayName);
		}

		for (const split of sale.splits ?? []) {
			addSeniorManager(split.seniorManagerEmail);
		}

		for (const owner of sale.dealOwners ?? []) {
			addSeniorManager(
				(owner as Sale['dealOwners'][number] & { seniorManagerEmail?: string })
					.seniorManagerEmail ?? ''
			);
		}

		for (const seniorManager of [sale.callerSeniorManagerEmail, sale.closerSeniorManagerEmail]) {
			addSeniorManager(seniorManager);
		}

		return seniorManagers.length
			? seniorManagers.sort((a, b) => a.localeCompare(b))
			: ['Unassigned'];
	}

	function isAmlDone(sale: Sale): boolean {
		return String(sale.clientDetails.amlFormFile?.complianceStatus ?? '') === 'approved';
	}

	function getAmlStatusLabel(sale: Sale): string {
		return isAmlDone(sale) ? 'AML Done' : 'AML Pending';
	}

	function buildYearOptions(sales: Sale[]): string[] {
		const years = [defaultYear];

		for (const sale of sales) {
			const date = getSaleDate(sale);
			const year = date ? String(date.getFullYear()) : '';
			if (year && !years.includes(year)) years.push(year);
		}

		return years.sort((a, b) => Number(b) - Number(a));
	}

	function makeSummaryRow(seniorManager: string, deals: Sale[]): AmlSummaryRow {
		const totalDeals = deals.length;
		const amlDone = deals.filter(isAmlDone).length;
		const amlNotDone = totalDeals - amlDone;

		return {
			key: seniorManager,
			seniorManager,
			totalDeals,
			amlDone,
			amlNotDone,
			amlDonePercentage: totalDeals ? Math.round((amlDone / totalDeals) * 100) : 0,
			amlNotDonePercentage: totalDeals ? Math.round((amlNotDone / totalDeals) * 100) : 0
		};
	}

	function buildSummaryRows(sales: Sale[]): AmlSummaryRow[] {
		const rowsByManager: { seniorManager: string; deals: Sale[] }[] = [];

		for (const sale of sales) {
			for (const seniorManager of getSeniorManagers(sale)) {
				const managerRow = rowsByManager.find((row) => row.seniorManager === seniorManager);

				if (managerRow) {
					managerRow.deals.push(sale);
				} else {
					rowsByManager.push({ seniorManager, deals: [sale] });
				}
			}
		}

		return rowsByManager
			.map(({ seniorManager, deals }) => makeSummaryRow(seniorManager, deals))
			.sort((a, b) => a.seniorManager.localeCompare(b.seniorManager));
	}

	function openDealsSheet(seniorManager: string): void {
		selectedSeniorManager = seniorManager;
		dealSheetOpen = true;
	}

	function showAllDealsFilter(): void {
		showAllDeals = true;
	}

	function clearAllDealsFilter(): void {
		showAllDeals = false;
	}

	function handleSummaryRowKeydown(event: KeyboardEvent, seniorManager: string): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		openDealsSheet(seniorManager);
	}

	function formatNumber(value: number | string | undefined): string {
		const normalized =
			typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value ?? 0);
		return wholeNumberFormatter.format(Number.isFinite(normalized) ? normalized : 0);
	}

	function getClientName(sale: Sale): string {
		return `${sale.clientDetails.firstName} ${sale.clientDetails.lastName}`.trim() || '-';
	}

	function formatDealStage(stage: Sale['dealStage']): string {
		if (stage === 'eoi') return 'EOI';
		if (stage === 'booking') return 'Booking';
		return 'Cancelled';
	}

	function formatInvoiceStage(stage: Sale['invoiceStage'][number]): string {
		if (stage === 'first-half') return 'First half';
		if (stage === 'second-half') return 'Second half';
		if (stage === 'full') return 'Full';
		return 'Not yet eligible';
	}

	function getInvoiceStageLabel(sale: Sale): string {
		return sale.invoiceStage?.length ? sale.invoiceStage.map(formatInvoiceStage).join(', ') : '-';
	}

	function syncHorizontalScroll(
		source: HTMLDivElement | null,
		target: HTMLDivElement | null
	): void {
		if (!source || !target || target.scrollLeft === source.scrollLeft) return;
		target.scrollLeft = source.scrollLeft;
	}

	async function copySaleId(saleId: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(saleId);
			toast.success(`Copied ${saleId}`);
		} catch {
			toast.error('Unable to copy sale ID');
		}
	}

	const yearOptions = $derived(buildYearOptions(confirmedSales));
	const selectedMonthKey = $derived(`${selectedYear}-${selectedMonth}`);
	const selectedPeriodSales = $derived.by(() => {
		if (showAllDeals) return confirmedSales;
		return confirmedSales.filter((sale) => getSaleMonthKey(sale) === selectedMonthKey);
	});
	const summaryRows = $derived(buildSummaryRows(selectedPeriodSales));
	const selectedMonthLabel = $derived(
		monthOptions.find((month) => month.value === selectedMonth)?.label ?? ''
	);
	const selectedPeriodLabel = $derived(
		showAllDeals ? 'All deals' : `${selectedMonthLabel} ${selectedYear}`
	);
	const selectedManagerDeals = $derived.by(() => {
		const seniorManager = selectedSeniorManager;
		if (!seniorManager) return [];

		return selectedPeriodSales
			.filter((sale) => getSeniorManagers(sale).includes(seniorManager))
			.sort((a, b) => b.id.localeCompare(a.id));
	});
	const amlDoneCount = $derived(selectedPeriodSales.filter(isAmlDone).length);
	const amlPendingCount = $derived(selectedPeriodSales.length - amlDoneCount);
	const amlRemainingPercentage = $derived(
		selectedPeriodSales.length
			? Math.round((amlPendingCount / selectedPeriodSales.length) * 100)
			: 0
	);

	$effect(() => {
		if (yearOptions.length && !yearOptions.includes(selectedYear)) {
			selectedYear = yearOptions[0];
		}
	});
</script>

<SecurePageHeader title="AML Dashboard" />

<div class="flex flex-col gap-6 bg-white p-6 text-[#222626]">
	{#if salesCollection.loading}
		<div
			class="flex min-h-100 items-center justify-center rounded-md border border-[#EBEEEE] bg-white"
		>
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<Loader class="h-8 w-8 animate-spin" />
					</Empty.Media>
					<Empty.Title>Loading AML Dashboard</Empty.Title>
					<Empty.Description
						>Please wait while we fetch confirmed sales information.</Empty.Description
					>
				</Empty.Header>
			</Empty.Root>
		</div>
	{:else if salesCollection.error}
		<div
			class="flex min-h-100 items-center justify-center rounded-md border border-[#EBEEEE] bg-white"
		>
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<AlertCircle class="h-8 w-8 text-destructive" />
					</Empty.Media>
					<Empty.Title>Error Loading AML Dashboard</Empty.Title>
					<Empty.Description>{salesCollection.error.message}</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		</div>
	{:else}
		<div class="rounded-md border border-[#EBEEEE] bg-white p-6">
			<div class="mb-4 flex flex-wrap items-center gap-3">
				<Select.Root type="single" bind:value={selectedMonth}>
					<Select.Trigger
						aria-label="AML month filter"
						class="h-8 w-35 border border-[#D4D9D9] bg-white text-[13px] text-[#222626]"
					>
						{selectedMonthLabel}
					</Select.Trigger>
					<Select.Content>
						{#each monthOptions as month (month.value)}
							<Select.Item value={month.value}>{month.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<Select.Root type="single" bind:value={selectedYear}>
					<Select.Trigger
						aria-label="AML year filter"
						class="h-8 w-28 border border-[#D4D9D9] bg-white text-[13px] text-[#222626]"
					>
						{selectedYear}
					</Select.Trigger>
					<Select.Content>
						{#each yearOptions as year (year)}
							<Select.Item value={year}>{year}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<Button
					type="button"
					variant={showAllDeals ? 'default' : 'outline'}
					class={[
						'h-8 gap-2 rounded-md border border-[#D4D9D9] px-3 text-[13px]',
						showAllDeals
							? 'bg-[#17213D] text-white hover:bg-[#17213D]/90'
							: 'bg-white text-[#222626]'
					]}
					aria-pressed={showAllDeals}
					aria-label={showAllDeals ? 'Clear all deals filter' : 'Show all deals'}
					onclick={showAllDeals ? clearAllDealsFilter : showAllDealsFilter}
				>
					All deals
					{#if showAllDeals}
						<X class="size-3.5" aria-hidden="true" />
					{/if}
				</Button>
			</div>

			<div class="grid grid-cols-2 gap-2 md:grid-cols-5">
				<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
					<p class="text-[13px] text-[#687976]">Senior managers</p>
					<div class="mt-3 text-2xl leading-8 font-medium">{summaryRows.length}</div>
				</div>
				<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
					<p class="text-[13px] text-[#687976]">Total deals</p>
					<div class="mt-3 text-2xl leading-8 font-medium">{selectedPeriodSales.length}</div>
				</div>
				<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
					<p class="text-[13px] text-[#687976]">AML done</p>
					<div class="mt-3 text-2xl leading-8 font-medium">{amlDoneCount}</div>
				</div>
				<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
					<p class="text-[13px] text-[#687976]">AML pending</p>
					<div class="mt-3 text-2xl leading-8 font-medium">{amlPendingCount}</div>
				</div>
				<div class="rounded-md border border-[#EBEEEE] bg-white p-3">
					<p class="text-[13px] text-[#687976]">AML remaining</p>
					<div class="mt-3 text-2xl leading-8 font-bold text-red-600">
						{amlRemainingPercentage}%
					</div>
				</div>
			</div>
		</div>

		<div class="rounded-md border border-[#EBEEEE] bg-white">
			<div
				bind:this={summaryTableScroller}
				class="overflow-x-auto"
				onscroll={() => syncHorizontalScroll(summaryTableScroller, summaryScrollbar)}
			>
				<Table.Root class="min-w-[760px]">
					<Table.Header>
						<Table.Row class="bg-[#FBF9F8]">
							<Table.Head class="h-9 min-w-44 border-r text-[13px] font-normal text-[#687976]">
								Senior Manager
							</Table.Head>
							<Table.Head class="h-9 border-r text-right text-[13px] font-normal text-[#687976]">
								Total Number of Deal
							</Table.Head>
							<Table.Head class="h-9 border-r text-right text-[13px] font-normal text-[#687976]">
								AML Done
							</Table.Head>
							<Table.Head class="h-9 border-r text-right text-[13px] font-normal text-[#687976]">
								AML NOT DONE
							</Table.Head>
							<Table.Head class="h-9 border-r text-right text-[13px] font-normal text-[#687976]">
								AML Done %age
							</Table.Head>
							<Table.Head class="h-9 text-right text-[13px] font-normal text-[#687976]">
								AML Not Done %age
							</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if summaryRows.length}
							{#each summaryRows as row (row.key)}
								<Table.Row
									class="h-13 cursor-pointer hover:bg-[#FBF9F8]"
									role="button"
									tabindex={0}
									aria-label={`View deals for ${row.seniorManager}`}
									onclick={() => openDealsSheet(row.seniorManager)}
									onkeydown={(event) => handleSummaryRowKeydown(event, row.seniorManager)}
								>
									<Table.Cell class="border-r text-[13px] font-medium"
										>{row.seniorManager}</Table.Cell
									>
									<Table.Cell class="border-r text-right text-[13px] tabular-nums">
										{row.totalDeals}
									</Table.Cell>
									<Table.Cell class="border-r text-right text-[13px] tabular-nums">
										{row.amlDone}
									</Table.Cell>
									<Table.Cell class="border-r text-right text-[13px] tabular-nums">
										{row.amlNotDone}
									</Table.Cell>
									<Table.Cell class="border-r text-right text-[13px] tabular-nums">
										{row.amlDonePercentage}%
									</Table.Cell>
									<Table.Cell class="text-right text-[13px] tabular-nums"
										>{row.amlNotDonePercentage}%</Table.Cell
									>
								</Table.Row>
							{/each}
						{:else}
							<Table.Row>
								<Table.Cell colspan={6} class="py-10">
									<Empty.Root>
										<Empty.Header>
											<Empty.Media variant="icon">
												<FileCheck2 class="h-8 w-8 text-[#687976]" />
											</Empty.Media>
											<Empty.Title>No Confirmed Deals</Empty.Title>
											<Empty.Description>
												There are no confirmed deals for {selectedPeriodLabel}.
											</Empty.Description>
										</Empty.Header>
									</Empty.Root>
								</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
			<div
				bind:this={summaryScrollbar}
				class="overflow-x-scroll border-t border-[#EBEEEE] md:hidden"
				onscroll={() => syncHorizontalScroll(summaryScrollbar, summaryTableScroller)}
			>
				<div class="h-4 min-w-[760px]"></div>
			</div>
		</div>
	{/if}
</div>

<Sheet.Root bind:open={dealSheetOpen}>
	<Sheet.Content side="right" class="w-[88vw] max-w-[88vw] overflow-y-auto p-0 sm:max-w-[88vw]">
		<div class="flex h-full flex-col bg-white text-[#222626]">
			<Sheet.Header class="border-b border-[#EBEEEE] px-6 py-5">
				<Sheet.Title class="text-xl font-semibold text-[#17213D]">Deals</Sheet.Title>
				<Sheet.Description class="text-[13px] text-[#687976]">
					{selectedSeniorManager ?? 'Senior manager'} · {selectedPeriodLabel} ·
					{selectedManagerDeals.length} deal{selectedManagerDeals.length === 1 ? '' : 's'}
				</Sheet.Description>
			</Sheet.Header>

			<div class="flex-1 overflow-x-auto p-6">
				<div class="rounded-md border border-[#EBDCCB] bg-white">
					<div
						bind:this={dealsTableScroller}
						class="overflow-x-auto"
						onscroll={() => syncHorizontalScroll(dealsTableScroller, dealsScrollbar)}
					>
						<Table.Root class="min-w-[1180px]">
							<Table.Header>
								<Table.Row class="bg-[#FBF9F8]">
									<Table.Head class="h-11 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
										Sale ID
									</Table.Head>
									<Table.Head class="h-11 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
										Client
									</Table.Head>
									<Table.Head class="h-11 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
										<div class="flex items-center gap-1.5">
											<Home class="size-4" />
											Property
										</div>
									</Table.Head>
									<Table.Head class="h-11 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
										<div class="flex items-center gap-1.5">
											<Tag class="size-4" />
											Unit Value
										</div>
									</Table.Head>
									<Table.Head class="h-11 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
										Deal Status
									</Table.Head>
									<Table.Head class="h-11 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
										Invoicing Stage
									</Table.Head>
									<Table.Head class="h-11 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
										AML Status
									</Table.Head>
									<Table.Head class="h-11 text-right text-[13px] text-[#17213D]">Revenue</Table.Head
									>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#if selectedManagerDeals.length}
									{#each selectedManagerDeals as sale (sale.id)}
										<Table.Row class="h-24 border-[#EBDCCB]">
											<Table.Cell
												class="border-r border-[#EBDCCB] font-mono text-[13px] font-semibold text-[#17213D]"
											>
												<div class="flex items-center gap-2">
													<span>{sale.id}</span>
													<Button
														type="button"
														variant="ghost"
														size="icon-sm"
														class="size-7 text-[#687976] hover:text-[#17213D]"
														aria-label={`Copy ${sale.id}`}
														onclick={() => copySaleId(sale.id)}
													>
														<Copy class="size-3.5" />
													</Button>
												</div>
											</Table.Cell>
											<Table.Cell
												class="border-r border-[#EBDCCB] text-[13px] font-semibold text-[#17213D]"
											>
												{getClientName(sale)}
											</Table.Cell>
											<Table.Cell class="border-r border-[#EBDCCB] text-[13px]">
												<div class="font-semibold text-[#17213D]">{sale.project || '-'}</div>
												<div class="mt-1 text-[#626262]">{sale.developer || '-'}</div>
											</Table.Cell>
											<Table.Cell
												class="border-r border-[#EBDCCB] text-[13px] font-semibold text-[#17213D] tabular-nums"
											>
												{formatNumber(sale.unitValue)}
											</Table.Cell>
											<Table.Cell class="border-r border-[#EBDCCB] text-[13px]">
												<div class="font-semibold text-[#17213D]">
													{formatDealStage(sale.dealStage)}
												</div>
												<div class="mt-1 text-[#626262]">{sale.paymentValue}% Paid</div>
												<div
													class="mt-2 inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
												>
													{formatDealStage(sale.dealStage)}
												</div>
											</Table.Cell>
											<Table.Cell class="border-r border-[#EBDCCB] text-[13px]">
												<div class="font-semibold text-[#17213D]">{getInvoiceStageLabel(sale)}</div>
												<div class="mt-1 text-[#626262]">10% + 4% paid</div>
											</Table.Cell>
											<Table.Cell class="border-r border-[#EBDCCB] text-[13px]">
												<div
													class={[
														'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold',
														isAmlDone(sale)
															? 'bg-green-100 text-green-700'
															: 'bg-red-100 text-red-700'
													]}
												>
													{getAmlStatusLabel(sale)}
												</div>
											</Table.Cell>
											<Table.Cell
												class="text-right text-[13px] font-semibold text-[#17213D] tabular-nums"
											>
												{formatNumber(getEffectiveSaleRevenue(sale))}
											</Table.Cell>
										</Table.Row>
									{/each}
								{:else}
									<Table.Row>
										<Table.Cell colspan={8} class="h-24 text-center text-[13px] text-[#687976]">
											No deals found for this senior manager.
										</Table.Cell>
									</Table.Row>
								{/if}
							</Table.Body>
						</Table.Root>
					</div>
					<div
						bind:this={dealsScrollbar}
						class="overflow-x-scroll border-t border-[#EBDCCB] md:hidden"
						onscroll={() => syncHorizontalScroll(dealsScrollbar, dealsTableScroller)}
					>
						<div class="h-4 min-w-[1180px]"></div>
					</div>
				</div>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
