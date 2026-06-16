<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import {
		createSvelteTable,
		FlexRender,
		renderComponent,
		renderSnippet
	} from '$lib/components/ui/data-table/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { isDateWithinThisMonth } from '$lib/date-period';
	import { SALE_DEVELOPER_OPTIONS } from '$lib/listing-options';
	import { getEffectiveSaleRevenue } from '$lib/sales';
	import {
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type RowSelectionState,
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

	let { data = [], role }: Props = $props();

	// State for detail sheet
	let detailSheetOpen = $state(false);
	let selectedSale = $state<Sale | null>(null);

	// Define columns
	const columns: ColumnDef<Sale>[] = [
		{
			id: 'select',
			header: ({ table }) =>
				renderComponent(Checkbox, {
					checked: table.getIsAllPageRowsSelected(),
					indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
					onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
					'aria-label': 'Select all'
				}),
			cell: ({ row }) =>
				renderComponent(Checkbox, {
					checked: row.getIsSelected(),
					onCheckedChange: (value) => row.toggleSelected(!!value),
					'aria-label': 'Select row'
				}),
			enableSorting: false,
			enableHiding: false
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
							`<div class="font-mono text-sm font-semibold text-primary">${saleId}</div>`
					};
				});
				return renderSnippet(cellSnippet, {
					saleId: row.original.id
				});
			},
			enableSorting: true
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
				const cellSnippet = createRawSnippet<[{ client: string }]>((getClient) => {
					const { client } = getClient();
					return {
						render: () => `<div class="font-medium">${client}</div>`
					};
				});
				return renderSnippet(cellSnippet, {
					client: `${row.original.clientDetails.firstName} ${row.original.clientDetails.lastName}`
				});
			}
		},
		{
			accessorKey: 'property',
			header: () => {
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<div class="flex items-start gap-1">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE --><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g></svg>							
							<span>Property</span>
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
								<div class="font-medium">${property}</div>
								<div class="text-sm text-muted-foreground">${location}</div>
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
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE --><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></g></svg>
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
					return {
						render: () => `<div class="font-medium">${formatted}</div>`
					};
				});
				return renderSnippet(cellSnippet, {
					value: Number(String(row.original.unitValue ?? '').replace(/,/g, ''))
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
								<div class="font-medium">${status}</div>
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
			accessorKey: 'invoicingStage',
			header: 'Invoicing Stage',
			cell: ({ row }) => {
				const stage = row.original.paymentValue >= 10 ? 'First half' : 'Second half';
				const payment = `10% + 4% paid`;
				const status =
					row.original.paymentValue === 100
						? 'Approved'
						: row.original.paymentValue > 50
							? 'Review'
							: 'Next Month';

				const cellSnippet = createRawSnippet<[{ stage: string; payment: string; status: string }]>(
					(getData) => {
						const { stage, payment, status } = getData();
						const badgeColor = getInvoiceStatusBadgeColor(status);
						return {
							render: () => `
							<div>
								<div class="font-medium">${stage}</div>
								<div class="text-sm text-muted-foreground">${payment}</div>
								<div class="mt-1.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badgeColor}">
									${status}
								</div>
							</div>
						`
						};
					}
				);
				return renderSnippet(cellSnippet, { stage, payment, status });
			}
		},
		{
			accessorKey: 'commission',
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
					return {
						render: () => `<div class="text-right font-medium">${formatted}</div>`
					};
				});
				return renderSnippet(cellSnippet, {
					value: getEffectiveSaleRevenue(row.original)
				});
			}
		}
	];

	// Table state
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([{ id: 'id', desc: true }]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});
	let rowSelection = $state<RowSelectionState>({});
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
		columns,
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
		onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
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
			},
			get rowSelection() {
				return rowSelection;
			}
		}
	});
</script>

<div class="w-full space-y-4">
	<!-- Filters and search bar -->
	<div class="rounded-lg border bg-card/60 p-3 shadow-sm">
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div class="relative w-full xl:max-w-xl">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search sale ID, client, or property..."
					value={globalFilter}
					oninput={(e) => {
						globalFilter = e.currentTarget.value;
						pagination = { ...pagination, pageIndex: 0 };
					}}
					onchange={(e) => {
						globalFilter = e.currentTarget.value;
						pagination = { ...pagination, pageIndex: 0 };
					}}
					class="pl-8"
				/>
			</div>

				<div class="flex flex-wrap items-center gap-2 xl:justify-end">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="outline" size="sm" class="h-9 shrink-0 gap-1">
								Columns
								<ChevronDown class="h-4 w-4 opacity-50" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-36">
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

				<Button
					variant={dateFilter === 'this-month' ? 'default' : 'outline'}
					size="sm"
					class="h-9 shrink-0 gap-2"
					onclick={() => {
						dateFilter = dateFilter === 'this-month' ? 'all' : 'this-month';
						pagination = { ...pagination, pageIndex: 0 };
					}}
				>
					<Calendar class="h-4 w-4" />
					This Month
				</Button>

				<Button
					variant={orderSort === 'most-recent' ? 'default' : 'outline'}
					size="sm"
					class="h-9 shrink-0 gap-2"
					onclick={setMostRecentSort}
				>
					Most Recent
				</Button>

				{#if hasActiveFilters}
					<Button variant="ghost" size="sm" class="h-9" onclick={resetFilters}>
						Clear filters
					</Button>
				{/if}
			</div>
			</div>

			<!-- Column-specific filters -->
			<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(170px,0.8fr)_minmax(310px,1.2fr)_minmax(220px,1fr)_minmax(160px,0.75fr)]">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-9 w-full justify-between gap-1">
							<span class="truncate">{selectedDeveloperLabel}</span>
							{#if developerFilter}
								<span class="ml-1 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
									1
								</span>
							{/if}
							<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="max-h-80 w-64 overflow-y-auto">
					<DropdownMenu.Item
						onclick={() => {
							developerFilter = '';
							pagination = { ...pagination, pageIndex: 0 };
						}}
					>
						All Developers
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					{#each developerOptions as developer (developer.value)}
						<DropdownMenu.Item
							onclick={() => {
								developerFilter = developer.value;
								pagination = { ...pagination, pageIndex: 0 };
							}}
						>
							{developer.label}
						</DropdownMenu.Item>
					{:else}
						<DropdownMenu.Item disabled>No developers found</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
				<Input
					type="date"
					aria-label="Sale date from"
					value={saleDateFrom}
					max={saleDateTo || undefined}
					oninput={(e) => {
						saleDateFrom = e.currentTarget.value;
						pagination = { ...pagination, pageIndex: 0 };
					}}
					onchange={(e) => {
						saleDateFrom = e.currentTarget.value;
						pagination = { ...pagination, pageIndex: 0 };
					}}
					class="h-9 w-full min-w-0"
				/>
				<span class="text-sm text-muted-foreground">to</span>
				<Input
					type="date"
					aria-label="Sale date to"
					value={saleDateTo}
					min={saleDateFrom || undefined}
					oninput={(e) => {
						saleDateTo = e.currentTarget.value;
						pagination = { ...pagination, pageIndex: 0 };
					}}
					onchange={(e) => {
						saleDateTo = e.currentTarget.value;
						pagination = { ...pagination, pageIndex: 0 };
					}}
					class="h-9 w-full min-w-0"
				/>
			</div>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-9 w-full justify-between gap-1">
							<span class="truncate">{selectedSeniorManagerLabel}</span>
							{#if seniorManagerFilter}
								<span class="ml-1 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
									1
								</span>
							{/if}
							<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="max-h-80 w-72 overflow-y-auto">
					<DropdownMenu.Item
						onclick={() => {
							seniorManagerFilter = '';
							pagination = { ...pagination, pageIndex: 0 };
						}}
					>
						All Senior Managers
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					{#each seniorManagerOptions as seniorManager (seniorManager)}
						<DropdownMenu.Item
							onclick={() => {
								seniorManagerFilter = seniorManager;
								pagination = { ...pagination, pageIndex: 0 };
							}}
						>
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
						<Button {...props} variant="outline" size="sm" class="h-9 w-full justify-between gap-1">
							Deal Status
							{#if table.getColumn('dealStatus')?.getFilterValue()}
								<span class="ml-1 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
									1
								</span>
							{/if}
							<ChevronDown class="h-4 w-4 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start">
					<DropdownMenu.Item
						onclick={() => {
							table.getColumn('dealStatus')?.setFilterValue(undefined);
							pagination = { ...pagination, pageIndex: 0 };
						}}
					>
						All
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						onclick={() => {
							table.getColumn('dealStatus')?.setFilterValue('EOI');
							pagination = { ...pagination, pageIndex: 0 };
						}}
					>
						EOI
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onclick={() => {
							table.getColumn('dealStatus')?.setFilterValue('Booking');
							pagination = { ...pagination, pageIndex: 0 };
						}}
					>
						Booking
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>

			<div class="flex justify-end text-sm text-muted-foreground">
				{table.getFilteredSelectedRowModel().rows.length} of
				{table.getFilteredRowModel().rows.length} row(s) {hasActiveFilters ? 'filtered' : 'total'}
			</div>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-md border bg-card">
		<Table.Root>
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
						<Table.Cell colspan={columns.length} class="py-12">
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
