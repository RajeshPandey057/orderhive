<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		createSvelteTable,
		FlexRender,
		renderSnippet
	} from '$lib/components/ui/data-table/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { isDateWithinThisMonth } from '$lib/date-period';
	import { SALE_DEVELOPER_OPTIONS } from '$lib/listing-options';
	import { getSaleRevenue, getSaleRevenuePostPassback } from '$lib/sales';
	import {
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type SortingState,
		type Updater,
		type VisibilityState,
		getCoreRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import { createRawSnippet } from 'svelte';
	import Calendar from '~icons/lucide/calendar';
	import ChevronDown from '~icons/lucide/chevron-down';
	import Search from '~icons/lucide/search';
	import SaleDetailSheet from './sale-detail-sheet.svelte';

	interface Props {
		data: Sale[];
		role?: Role['accessType'];
		/**
		 * 'compliance' swaps the revenue/passback columns for the compliance
		 * document-status columns (passport, gov ID, AML, booking form, Go AML).
		 */
		columnPreset?: 'default' | 'compliance';
	}

	const wholeNumberFormatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	const DEFAULT_STATUS_BADGE = 'text-blue-700 bg-blue-100';

	function getDealStatusBadgeColor(status: string) {
		const lower = status.toLowerCase();
		if (lower.includes('review')) return DEFAULT_STATUS_BADGE;
		if (lower.includes('verified')) return 'text-green-700 bg-green-100';
		if (lower.includes('update')) return 'text-red-700 bg-red-100';
		return DEFAULT_STATUS_BADGE;
	}

	function getDealStatusLabel(status: string) {
		if (status.includes('Review')) return 'Review';
		if (status.includes('Verified')) return 'Verified';
		if (status.includes('Update')) return 'Update';
		return status;
	}

	function getInvoiceStatusBadgeColor(status: string) {
		const lower = status.toLowerCase();
		if (lower.includes('approved')) return 'text-green-700 bg-green-100';
		if (lower.includes('next month')) return 'text-orange-700 bg-orange-100';
		if (lower.includes('review')) return DEFAULT_STATUS_BADGE;
		return DEFAULT_STATUS_BADGE;
	}

	let { data = [], role, columnPreset = 'default' }: Props = $props();

	type StatusBadge = { label: string; className: string };

	function getDocumentBadge(file: SaleDocumentFile | null | undefined): StatusBadge {
		if (!file) return { label: 'Not Uploaded', className: 'bg-gray-100 text-gray-600' };

		const status = String(file.complianceStatus ?? 'pending');
		if (status === 'approved') return { label: 'Approved', className: 'bg-green-100 text-green-700' };
		if (status === 'rejected') return { label: 'Rejected', className: 'bg-red-100 text-red-700' };
		return { label: 'In Review', className: 'bg-amber-100 text-amber-700' };
	}

	function getAmlBadge(sale: Sale): StatusBadge {
		const done = String(sale.clientDetails.amlFormFile?.complianceStatus ?? '') === 'approved';
		return done
			? { label: 'AML Done', className: 'bg-green-100 text-green-700' }
			: { label: 'AML Pending', className: 'bg-red-100 text-red-700' };
	}

	function getGoAmlBadge(sale: Sale): StatusBadge {
		if (sale.goAmlStatus === 'red-flag')
			return { label: 'Red Flag', className: 'bg-red-100 text-red-700' };
		if (sale.goAmlStatus === 'green-flag')
			return { label: 'Green Flag', className: 'bg-green-100 text-green-700' };
		return { label: 'Pending', className: 'bg-amber-100 text-amber-700' };
	}

	function renderStatusBadge(badge: StatusBadge) {
		const cellSnippet = createRawSnippet<[StatusBadge]>((getData) => {
			const { label, className } = getData();
			return {
				render: () =>
					`<div class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}">${label}</div>`
			};
		});
		return renderSnippet(cellSnippet, badge);
	}

	// State for detail sheet
	let detailSheetOpen = $state(false);
	let selectedSale = $state<Sale | null>(null);

	// Scroll sync between table and external scrollbar
	let tableScrollEl = $state<HTMLDivElement | null>(null);
	let externalScrollbarEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const tbl = tableScrollEl;
		const bar = externalScrollbarEl;
		if (!tbl || !bar) return;

		let syncing = false;
		const syncFromBar = () => {
			if (syncing) return;
			syncing = true;
			tbl.scrollLeft = bar.scrollLeft;
			syncing = false;
		};
		const syncFromTable = () => {
			if (syncing) return;
			syncing = true;
			bar.scrollLeft = tbl.scrollLeft;
			syncing = false;
		};

		bar.addEventListener('scroll', syncFromBar, { passive: true });
		tbl.addEventListener('scroll', syncFromTable, { passive: true });
		return () => {
			bar.removeEventListener('scroll', syncFromBar);
			tbl.removeEventListener('scroll', syncFromTable);
		};
	});

	function formatSaleDate(dateStr: string | undefined): string {
		if (!dateStr) return '—';
		const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
		const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		return `${String(day).padStart(2, '0')}-${months[month - 1]}-${year}`;
	}

	function emailToName(email: string): string {
		const local = email.split('@')[0];
		return local
			.split(/[._-]/)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	function normaliseDisplayName(value: string): string {
		if (!value || value === '—') return value;
		return value.includes('@') ? emailToName(value) : value;
	}

	function truncate(str: string, max = 20): string {
		return str.length > max ? str.slice(0, max) + '…' : str;
	}

	function getCallerName(sale: Sale): string {
		const split = sale.splits?.find((s) => s.ownerRole === 'caller');
		if (split?.agentName) return normaliseDisplayName(split.agentName);
		const owner = sale.dealOwners?.find((o) => o.ownerRole === 'caller');
		return owner?.name ? normaliseDisplayName(owner.name) : '—';
	}

	function getCallerPercentage(sale: Sale): string {
		const split = sale.splits?.find((s) => s.ownerRole === 'caller');
		if (split?.percentage != null) return `${split.percentage}%`;
		const owner = sale.dealOwners?.find((o) => o.ownerRole === 'caller');
		if (owner?.split != null) return `${owner.split}%`;
		return '—';
	}

	function getCallerSeniorManager(sale: Sale): string {
		const split = sale.splits?.find((s) => s.ownerRole === 'caller');
		if (split?.seniorManagerEmail) return normaliseDisplayName(split.seniorManagerEmail);
		return sale.callerSeniorManagerEmail
			? normaliseDisplayName(sale.callerSeniorManagerEmail)
			: '—';
	}

	function getDealStageLabel(stage: Sale['dealStage']): string {
		if (stage === 'eoi') return 'EOI';
		if (stage === 'booking') return 'Confirmed';
		if (stage === 'cancelled') return 'Cancelled';
		return stage;
	}

	function getDealStageBadgeColor(stage: Sale['dealStage']): string {
		if (stage === 'eoi') return 'text-blue-700 bg-blue-100';
		if (stage === 'booking') return 'text-green-700 bg-green-100';
		if (stage === 'cancelled') return 'text-red-700 bg-red-100';
		return DEFAULT_STATUS_BADGE;
	}

	// Define columns — sequence per spec
	const columns: ColumnDef<Sale>[] = [
		{
			id: 'saleDate',
			accessorKey: 'saleDate',
			header: 'Sales Date',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ date: string }]>((getData) => {
					const { date } = getData();
					return { render: () => `<div class="whitespace-nowrap font-medium">${date}</div>` };
				});
				return renderSnippet(cellSnippet, { date: formatSaleDate(row.original.saleDate) });
			},
			enableSorting: true
		},
		{
			accessorKey: 'id',
			header: () => {
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<button class="flex items-center gap-1 font-medium hover:text-foreground">
							Sale ID
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
						</button>
					`
				}));
				return renderSnippet(headerSnippet);
			},
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ saleId: string }]>((getSaleId) => {
					const { saleId } = getSaleId();
					return {
						render: () =>
							`<div class="font-mono text-sm font-semibold text-primary whitespace-nowrap">${saleId}</div>`
					};
				});
				return renderSnippet(cellSnippet, { saleId: row.original.id });
			},
			enableSorting: true
		},
		{
			id: 'seniorManagerOfCaller',
			header: 'Sr. Manager (Caller)',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ full: string; display: string }]>((getData) => {
					const { full, display } = getData();
					return {
						render: () =>
							`<div class="text-sm whitespace-nowrap" title="${full}">${display}</div>`
					};
				});
				const full = getCallerSeniorManager(row.original);
				return renderSnippet(cellSnippet, { full, display: truncate(full) });
			}
		},
		{
			id: 'caller',
			header: 'Caller',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ full: string; display: string }]>((getData) => {
					const { full, display } = getData();
					return {
						render: () =>
							`<div class="font-medium whitespace-nowrap" title="${full}">${display}</div>`
					};
				});
				const full = getCallerName(row.original);
				return renderSnippet(cellSnippet, { full, display: truncate(full) });
			}
		},
		{
			id: 'callerPercentage',
			header: 'Caller %',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ value: string }]>((getData) => {
					const { value } = getData();
					return { render: () => `<div class="text-center font-medium">${value}</div>` };
				});
				return renderSnippet(cellSnippet, { value: getCallerPercentage(row.original) });
			}
		},
		{
			accessorKey: 'client',
			header: () => {
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<button class="flex items-center gap-1 font-medium hover:text-foreground">
							Client
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
						</button>
					`
				}));
				return renderSnippet(headerSnippet);
			},
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ full: string; display: string }]>((getData) => {
					const { full, display } = getData();
					return {
						render: () =>
							`<div class="font-medium whitespace-nowrap" title="${full}">${display}</div>`
					};
				});
				const full = `${row.original.clientDetails.firstName} ${row.original.clientDetails.lastName}`;
				return renderSnippet(cellSnippet, { full, display: truncate(full) });
			}
		},
		{
			accessorKey: 'property',
			header: () => {
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<div class="flex items-start gap-1">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g></svg>
							<span>Developer &amp; Property</span>
						</div>
					`
				}));
				return renderSnippet(headerSnippet);
			},
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ property: string; location: string }]>(
					(getData) => {
						const { property, location } = getData();
						return {
							render: () => `
							<div>
								<div class="font-medium whitespace-nowrap">${property}</div>
								<div class="text-sm text-muted-foreground whitespace-nowrap">${location}</div>
							</div>
						`
						};
					}
				);
				return renderSnippet(cellSnippet, {
					property: row.original.project,
					location: row.original.developer
				});
			}
		},
		{
			accessorKey: 'unitValue',
			header: () => {
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<button class="flex items-center gap-1 font-medium hover:text-foreground">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></g></svg>
							<span>Unit Value</span>
						</button>
					`
				}));
				return renderSnippet(headerSnippet);
			},
			enableSorting: true,
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ value: number }]>((getValue) => {
					const { value } = getValue();
					const formatted = wholeNumberFormatter.format(value);
					return { render: () => `<div class="font-medium text-right">${formatted}</div>` };
				});
				return renderSnippet(cellSnippet, {
					value: Number(String(row.original.unitValue ?? '').replace(/,/g, ''))
				});
			}
		},
		{
			id: 'commissionPercentage',
			header: 'Commission %',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ value: string }]>((getData) => {
					const { value } = getData();
					return { render: () => `<div class="text-center font-medium">${value}</div>` };
				});
				const pct = row.original.commissionPercentage;
				return renderSnippet(cellSnippet, { value: pct != null ? `${pct}%` : '—' });
			}
		},
		{
			id: 'commission',
			accessorFn: (row) => getSaleRevenue(row),
			header: () => {
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<button class="flex items-center justify-end gap-1 font-medium hover:text-foreground w-full">
							<span>Revenue</span>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
						</button>
					`
				}));
				return renderSnippet(headerSnippet);
			},
			enableSorting: true,
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ value: number }]>((getValue) => {
					const { value } = getValue();
					const formatted = wholeNumberFormatter.format(value);
					return { render: () => `<div class="text-right font-medium">${formatted}</div>` };
				});
				return renderSnippet(cellSnippet, { value: getSaleRevenue(row.original) });
			}
		},
		{
			id: 'passback',
			header: 'Passback',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ value: string }]>((getData) => {
					const { value } = getData();
					return { render: () => `<div class="text-right font-medium">${value}</div>` };
				});
				const amt = row.original.passbackAmount;
				return renderSnippet(cellSnippet, {
					value: amt != null ? wholeNumberFormatter.format(amt) : '—'
				});
			}
		},
		{
			id: 'revenuePostPassback',
			header: 'Revenue Post Passback',
			cell: ({ row }) => {
				const cellSnippet = createRawSnippet<[{ value: string }]>((getData) => {
					const { value } = getData();
					return { render: () => `<div class="text-right font-medium">${value}</div>` };
				});
				// Derived live (revenue − passback) so the row stays internally
				// consistent even when the stored revenueAfterPassback is stale.
				const amt = getSaleRevenuePostPassback(row.original);
				return renderSnippet(cellSnippet, {
					value: wholeNumberFormatter.format(amt)
				});
			}
		},
		{
			accessorKey: 'dealStatus',
			header: 'Deal Status',
			cell: ({ row }) => {
				const status =
					row.original.dealStage === 'cancelled' ? 'Cancelled Deal' : row.original.dealStage;
				const payment = row.original.paymentValue;

				const cellSnippet = createRawSnippet<[{ status: string; payment: number }]>((getData) => {
					const { status, payment } = getData();
					const badgeColor = getDealStatusBadgeColor(status);
					const badgeLabel = getDealStatusLabel(status);
					return {
						render: () => `
							<div>
								<div class="font-medium whitespace-nowrap">${status}</div>
								<div class="text-sm text-muted-foreground">${payment}% Paid</div>
								<div class="mt-1.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badgeColor}">
									${badgeLabel}
								</div>
							</div>
						`
					};
				});
				return renderSnippet(cellSnippet, { status, payment });
			}
		},
		{
			id: 'dealStage',
			header: 'Deal Stage',
			cell: ({ row }) => {
				const stage = row.original.dealStage;
				const cellSnippet = createRawSnippet<[{ label: string; color: string }]>((getData) => {
					const { label, color } = getData();
					return {
						render: () => `
							<div class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${color}">
								${label}
							</div>
						`
					};
				});
				return renderSnippet(cellSnippet, {
					label: getDealStageLabel(stage),
					color: getDealStageBadgeColor(stage)
				});
			}
		}
	];

	// Compliance document-status columns — shown (after Deal Stage) only when
	// columnPreset === 'compliance', replacing the revenue/passback columns.
	const complianceColumns: ColumnDef<Sale>[] = [
		{
			id: 'passportStatus',
			header: 'Passport Status',
			cell: ({ row }) => renderStatusBadge(getDocumentBadge(row.original.clientDetails.passportFile))
		},
		{
			id: 'govIdStatus',
			header: 'Gov ID Status',
			cell: ({ row }) =>
				renderStatusBadge(getDocumentBadge(row.original.clientDetails.nationalIdFile))
		},
		{
			id: 'amlStatus',
			header: 'AML Status',
			cell: ({ row }) => renderStatusBadge(getAmlBadge(row.original))
		},
		{
			id: 'bookingForm',
			header: 'Booking Form',
			cell: ({ row }) => renderStatusBadge(getDocumentBadge(row.original.bookingFormFile))
		},
		{
			id: 'goAmlStatus',
			header: 'Go AML Status',
			cell: ({ row }) => renderStatusBadge(getGoAmlBadge(row.original))
		}
	];

	const REVENUE_COLUMN_IDS = ['commission', 'passback', 'revenuePostPassback'];
	const activeColumns: ColumnDef<Sale>[] = $derived(
		columnPreset === 'compliance'
			? [
					...columns.filter((column) => !REVENUE_COLUMN_IDS.includes(column.id ?? '')),
					...complianceColumns
				]
			: columns
	);

	const tableMinWidth = $derived(columnPreset === 'compliance' ? '2200px' : '1900px');

	// Table state
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([{ id: 'id', desc: true }]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});
	let globalFilter = $state('');

	// Date filter
	let dateFilter = $state<'all' | 'this-month'>('all');
	let developerFilter = $state('');
	let saleDateFrom = $state('');
	let saleDateTo = $state('');
	let seniorManagerFilter = $state('');
	let orderSort = $state<'default' | 'most-recent'>('default');
	const developerLabelMap = new Map(
		SALE_DEVELOPER_OPTIONS.map((option) => [option.value, option.label])
	);
	const developerOptions = $derived.by(() => {
		const developers = new Set(data.map((sale) => sale.developer).filter(Boolean));
		return [...developers]
			.map((value) => ({ value, label: developerLabelMap.get(value) ?? value }))
			.sort((a, b) => a.label.localeCompare(b.label));
	});
	const seniorManagerOptions = $derived.by(() => {
		const seniorManagers = new Set<string>();
		for (const sale of data) {
			for (const seniorManager of getSeniorManagerEmails(sale)) {
				seniorManagers.add(seniorManager);
			}
		}
		return [...seniorManagers].sort((a, b) => a.localeCompare(b));
	});
	const selectedDeveloperLabel = $derived(
		developerOptions.find((option) => option.value === developerFilter)?.label ?? 'Developer'
	);
	const selectedSeniorManagerLabel = $derived(seniorManagerFilter || 'Senior Manager');
	const hasActiveFilters = $derived(
		columnFilters.length > 0 ||
			!!globalFilter ||
			dateFilter !== 'all' ||
			!!developerFilter ||
			!!saleDateFrom ||
			!!saleDateTo ||
			!!seniorManagerFilter ||
			orderSort !== 'default'
	);

	function getSaleDateValue(sale: Sale): string {
		return sale.saleDate?.slice(0, 10) ?? '';
	}

	function getClientSearchValue(sale: Sale): string {
		return `${sale.clientDetails.firstName} ${sale.clientDetails.lastName}`.trim();
	}

	function getPropertySearchValue(sale: Sale): string {
		return [sale.project, sale.developer, sale.unitNo, sale.community].filter(Boolean).join(' ');
	}

	function getSeniorManagerEmails(sale: Sale): string[] {
		const seniorManagers: string[] = [];

		function addSeniorManager(value: string | undefined): void {
			const seniorManager = value?.trim();
			if (!seniorManager || seniorManagers.includes(seniorManager)) return;
			seniorManagers.push(seniorManager);
		}

		for (const split of sale.splits ?? []) {
			addSeniorManager(split.seniorManagerEmail);
		}

		for (const owner of sale.dealOwners ?? []) {
			addSeniorManager(
				(owner as Sale['dealOwners'][number] & { seniorManagerEmail?: string })
					.seniorManagerEmail
			);
		}

		addSeniorManager(sale.callerSeniorManagerEmail);
		addSeniorManager(sale.closerSeniorManagerEmail);

		return seniorManagers;
	}

	function resetFilters() {
		table.resetColumnFilters();
		globalFilter = '';
		dateFilter = 'all';
		developerFilter = '';
		saleDateFrom = '';
		saleDateTo = '';
		seniorManagerFilter = '';
		orderSort = 'default';
		sorting = [{ id: 'id', desc: true }];
		pagination = { ...pagination, pageIndex: 0 };
	}

	function setMostRecentSort() {
		orderSort = orderSort === 'most-recent' ? 'default' : 'most-recent';
		sorting = orderSort === 'most-recent' ? [] : [{ id: 'id', desc: true }];
		pagination = { ...pagination, pageIndex: 0 };
	}

	const filteredData = $derived.by(() => {
		let result = data;

		if (dateFilter === 'this-month') {
			result = result.filter((sale) => {
				if (!sale.createdAt) return false;
				// Firestore FieldValue is Timestamp at runtime — has .toDate()
				const ts = sale.createdAt as unknown as { toDate(): Date };
				const date =
					typeof ts.toDate === 'function'
						? ts.toDate()
						: new Date(sale.createdAt as unknown as string);
				return isDateWithinThisMonth(date);
			});
		}

		if (developerFilter) {
			result = result.filter((sale) => sale.developer === developerFilter);
		}

		const search = globalFilter.trim().toLowerCase();
		if (search) {
			result = result.filter((sale) => {
				const saleId = sale.id.toLowerCase();
				const clientName = getClientSearchValue(sale).toLowerCase();
				const property = getPropertySearchValue(sale).toLowerCase();
				return saleId.includes(search) || clientName.includes(search) || property.includes(search);
			});
		}

		if (saleDateFrom) {
			result = result.filter((sale) => getSaleDateValue(sale) >= saleDateFrom);
		}

		if (saleDateTo) {
			result = result.filter((sale) => getSaleDateValue(sale) <= saleDateTo);
		}

		if (seniorManagerFilter) {
			result = result.filter((sale) => getSeniorManagerEmails(sale).includes(seniorManagerFilter));
		}

		if (orderSort === 'most-recent') {
			result = [...result].sort((a, b) => {
				const dateCompare = getSaleDateValue(b).localeCompare(getSaleDateValue(a));
				if (dateCompare !== 0) return dateCompare;
				return b.id.localeCompare(a.id);
			});
		}

		return result;
	});

	const table = createSvelteTable({
		get data() {
			return filteredData;
		},
		get columns() {
			return activeColumns;
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onPaginationChange: (updater: Updater<PaginationState>) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onSortingChange: (updater: Updater<SortingState>) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onColumnVisibilityChange: (updater: Updater<VisibilityState>) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			},
			get columnVisibility() {
				return columnVisibility;
			}
		}
	});
</script>

<div class="w-full space-y-4">
	<!-- Filters — compact single row -->
	<div class="rounded-lg border bg-card/60 px-3 py-2 shadow-sm">
		<div class="flex flex-wrap items-center gap-2">

			<!-- Search — left -->
			<div class="relative shrink-0">
				<Search class="absolute top-2 left-2 h-3.5 w-3.5 text-muted-foreground" />
				<Input
					placeholder="Search sale ID, client, property..."
					value={globalFilter}
					oninput={(e) => { globalFilter = e.currentTarget.value; pagination = { ...pagination, pageIndex: 0 }; }}
					onchange={(e) => { globalFilter = e.currentTarget.value; pagination = { ...pagination, pageIndex: 0 }; }}
					class="h-8 w-[220px] pl-7 text-xs"
				/>
			</div>

			<!-- Divider -->
			<div class="h-5 w-px bg-border shrink-0"></div>

			<!-- Date range -->
			<div class="flex items-center gap-1 shrink-0">
				<Calendar class="h-3.5 w-3.5 text-primary shrink-0" />
				<Input
					type="date"
					aria-label="Sale date from"
					value={saleDateFrom}
					max={saleDateTo || undefined}
					oninput={(e) => { saleDateFrom = e.currentTarget.value; pagination = { ...pagination, pageIndex: 0 }; }}
					onchange={(e) => { saleDateFrom = e.currentTarget.value; pagination = { ...pagination, pageIndex: 0 }; }}
					class="date-input h-8 w-[148px] text-xs"
				/>
				<span class="text-xs text-muted-foreground">–</span>
				<Input
					type="date"
					aria-label="Sale date to"
					value={saleDateTo}
					min={saleDateFrom || undefined}
					oninput={(e) => { saleDateTo = e.currentTarget.value; pagination = { ...pagination, pageIndex: 0 }; }}
					onchange={(e) => { saleDateTo = e.currentTarget.value; pagination = { ...pagination, pageIndex: 0 }; }}
					class="date-input h-8 w-[148px] text-xs"
				/>
			</div>

			<!-- Divider -->
			<div class="h-5 w-px bg-border shrink-0"></div>

			<!-- Tab pills: All | This Month | Most Recent -->
			<div class="flex items-center rounded-md border bg-muted/50 p-0.5 gap-0.5 shrink-0 text-sm">
				<button
					class="rounded px-2.5 py-1 transition-colors {dateFilter === 'all' && orderSort === 'default' ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
					onclick={() => { dateFilter = 'all'; orderSort = 'default'; sorting = [{ id: 'id', desc: true }]; pagination = { ...pagination, pageIndex: 0 }; }}
				>
					All <span class="ml-1 text-xs font-normal tabular-nums">{table.getFilteredRowModel().rows.length}</span>
				</button>
				<button
					class="rounded px-2.5 py-1 transition-colors {dateFilter === 'this-month' ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
					onclick={() => { dateFilter = dateFilter === 'this-month' ? 'all' : 'this-month'; pagination = { ...pagination, pageIndex: 0 }; }}
				>
					This Month
				</button>
				<button
					class="rounded px-2.5 py-1 transition-colors {orderSort === 'most-recent' ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
					onclick={setMostRecentSort}
				>
					Most Recent
				</button>
			</div>

			<!-- Divider -->
			<div class="h-5 w-px bg-border shrink-0"></div>

			<!-- Dropdown filters -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-8 shrink-0 gap-1 text-xs">
							<span class="truncate max-w-[110px]">{selectedDeveloperLabel}</span>
							{#if developerFilter}<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>{/if}
							<ChevronDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="max-h-80 w-64 overflow-y-auto">
					<DropdownMenu.Item onclick={() => { developerFilter = ''; pagination = { ...pagination, pageIndex: 0 }; }}>
						All Developers
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					{#each developerOptions as developer (developer.value)}
						<DropdownMenu.Item onclick={() => { developerFilter = developer.value; pagination = { ...pagination, pageIndex: 0 }; }}>
							{developer.label}
						</DropdownMenu.Item>
					{:else}
						<DropdownMenu.Item disabled>No developers found</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-8 shrink-0 gap-1 text-xs">
							<span class="truncate max-w-[130px]">{selectedSeniorManagerLabel}</span>
							{#if seniorManagerFilter}<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>{/if}
							<ChevronDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="max-h-80 w-72 overflow-y-auto">
					<DropdownMenu.Item onclick={() => { seniorManagerFilter = ''; pagination = { ...pagination, pageIndex: 0 }; }}>
						All Senior Managers
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					{#each seniorManagerOptions as seniorManager (seniorManager)}
						<DropdownMenu.Item onclick={() => { seniorManagerFilter = seniorManager; pagination = { ...pagination, pageIndex: 0 }; }}>
							{seniorManager}
						</DropdownMenu.Item>
					{:else}
						<DropdownMenu.Item disabled>No senior managers found</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-8 shrink-0 gap-1 text-xs">
							Deal Status
							{#if table.getColumn('dealStatus')?.getFilterValue()}<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>{/if}
							<ChevronDown class="h-3.5 w-3.5 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start">
					<DropdownMenu.Item onclick={() => { table.getColumn('dealStatus')?.setFilterValue(undefined); pagination = { ...pagination, pageIndex: 0 }; }}>All</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => { table.getColumn('dealStatus')?.setFilterValue('EOI'); pagination = { ...pagination, pageIndex: 0 }; }}>EOI</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => { table.getColumn('dealStatus')?.setFilterValue('Booking'); pagination = { ...pagination, pageIndex: 0 }; }}>Booking</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-8 shrink-0 gap-1 text-xs">
							Columns
							<ChevronDown class="h-3.5 w-3.5 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-40">
					{#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column.id)}
						<DropdownMenu.CheckboxItem
							class="capitalize"
							bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}
						>
							{column.id}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Spacer -->
			<div class="flex-1 min-w-0"></div>

			{#if hasActiveFilters}
				<Button variant="outline" size="sm" class="h-8 text-xs shrink-0" onclick={resetFilters}>
					Clear Filters
				</Button>
			{/if}

		</div>
	</div>

	<!-- Data Table -->
	<div
		bind:this={tableScrollEl}
		class="rounded-md border bg-card overflow-x-scroll table-scroll-hidden"
	>
		<Table.Root class="min-w-(--sales-table-min-w)" style="--sales-table-min-w: {tableMinWidth}">
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row class="border-b bg-gray-200/40">
						{#each headerGroup.headers as header (header.id)}
							<Table.Head class="border-r last:border-r-0">
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#if table.getRowModel().rows?.length}
					{#each table.getRowModel().rows as row (row.id)}
						<Table.Row
							class="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
							onclick={() => {
								selectedSale = row.original;
								detailSheetOpen = true;
							}}
						>
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="border-r last:border-r-0">
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={activeColumns.length} class="py-12">
							<Empty.Root>
								<Empty.Header>
									<Empty.Media variant="icon">
										<Search class="h-8 w-8" />
									</Empty.Media>
									<Empty.Title>No Sales Found</Empty.Title>
									<Empty.Description>
										{#if hasActiveFilters}
											No sales match your current filters. Try adjusting your search criteria.
										{:else}
											No sales data available yet. Start by adding your first sale.
										{/if}
									</Empty.Description>
								</Empty.Header>
								{#if hasActiveFilters}
									<Empty.Content>
										<Button variant="outline" size="sm" onclick={resetFilters}>
											Clear Filters
										</Button>
									</Empty.Content>
								{/if}
							</Empty.Root>
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- External horizontal scrollbar -->
	<div
		bind:this={externalScrollbarEl}
		class="overflow-x-scroll external-scrollbar"
	>
		<div class="min-w-(--sales-table-min-w)" style="--sales-table-min-w: {tableMinWidth}; height: 1px;"></div>
	</div>

	<!-- Pagination -->

	<Pagination.Root
		count={table.getFilteredRowModel().rows.length}
		perPage={table.getState().pagination.pageSize}
		page={table.getState().pagination.pageIndex + 1}
		onPageChange={(page) => table.setPageIndex(page - 1)}
	>
		{#snippet children({ pages, currentPage })}
			<Pagination.Content>
				<Pagination.Item>
					<Pagination.Previous />
				</Pagination.Item>
				{#each pages as page (page.key)}
					{#if page.type === 'ellipsis'}
						<Pagination.Item>
							<Pagination.Ellipsis />
						</Pagination.Item>
					{:else}
						<Pagination.Item>
							<Pagination.Link {page} isActive={currentPage === page.value}>
								{page.value}
							</Pagination.Link>
						</Pagination.Item>
					{/if}
				{/each}
				<Pagination.Item>
					<Pagination.Next />
				</Pagination.Item>
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>
</div>

<!-- Detail Sheet -->
<SaleDetailSheet bind:open={detailSheetOpen} bind:sale={selectedSale} {role} />

<style>
	:global(.table-scroll-hidden) {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	:global(.table-scroll-hidden::-webkit-scrollbar) {
		display: none;
	}

	:global(.external-scrollbar) {
		scrollbar-width: thin;
		scrollbar-color: #94a3b8 #e2e8f0;
		height: 12px;
	}
	:global(.external-scrollbar::-webkit-scrollbar) {
		height: 8px;
	}
	:global(.external-scrollbar::-webkit-scrollbar-track) {
		background: #e2e8f0;
		border-radius: 4px;
	}
	:global(.external-scrollbar::-webkit-scrollbar-thumb) {
		background: #94a3b8;
		border-radius: 4px;
	}
	:global(.external-scrollbar::-webkit-scrollbar-thumb:hover) {
		background: #64748b;
	}

	/* Tint the native date picker calendar icon to match --primary (#142336) */
	:global(.date-input::-webkit-calendar-picker-indicator) {
		cursor: pointer;
		filter: brightness(0) saturate(100%) invert(10%) sepia(39%) saturate(858%) hue-rotate(178deg) brightness(97%) contrast(100%);
	}
</style>
