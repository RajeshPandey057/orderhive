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
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Calendar, ChevronDown, Search } from '@lucide/svelte';
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

	interface Sale {
		id: string;
		client: string;
		property: string;
		location: string;
		unitValue: number;
		dealStatus: string;
		paymentValue: number;
		invoicingStage: string;
		invoicingPayment: string;
		invoicingStatus: string;
		commission: number;
	}

	interface Props {
		data: Sale[];
	}

	let { data = [] }: Props = $props();

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
				return renderSnippet(cellSnippet, { client: row.original.client });
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
					property: row.original.property,
					location: row.original.location
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
				const formatter = new Intl.NumberFormat('en-US', {
					minimumFractionDigits: 0,
					maximumFractionDigits: 0
				});
				const cellSnippet = createRawSnippet<[{ value: number }]>((getValue) => {
					const { value } = getValue();
					const formatted = formatter.format(value);
					return {
						render: () => `<div class="font-medium">${formatted}</div>`
					};
				});
				return renderSnippet(cellSnippet, { value: row.original.unitValue });
			}
		},
		{
			accessorKey: 'dealStatus',
			header: 'Deal Status',
			cell: ({ row }) => {
				const status = row.original.dealStatus;
				const payment = row.original.paymentValue;

				const getStatusBadgeColor = (s: string) => {
					const lower = s.toLowerCase();
					if (lower.includes('review')) return 'text-blue-700 bg-blue-100';
					if (lower.includes('verified')) return 'text-green-700 bg-green-100';
					if (lower.includes('update')) return 'text-red-700 bg-red-100';
					return 'text-blue-700 bg-blue-100';
				};

				const cellSnippet = createRawSnippet<[{ status: string; payment: number }]>((getData) => {
					const { status, payment } = getData();
					const badgeColor = getStatusBadgeColor(status);
					return {
						render: () => `
							<div>
								<div class="font-medium">${status}</div>
								<div class="text-sm text-muted-foreground">${payment}% Paid</div>
								<div class="mt-1.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badgeColor}">
									${status.includes('Review') ? 'Review' : status.includes('Verified') ? 'Verified' : status.includes('Update') ? 'Update' : status}
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
				const stage = row.original.invoicingStage;
				const payment = row.original.invoicingPayment;
				const status = row.original.invoicingStatus;

				const getStatusBadgeColor = (s: string) => {
					const lower = s.toLowerCase();
					if (lower.includes('approved')) return 'text-green-700 bg-green-100';
					if (lower.includes('next month')) return 'text-orange-700 bg-orange-100';
					if (lower.includes('review')) return 'text-blue-700 bg-blue-100';
					return 'text-blue-700 bg-blue-100';
				};

				const cellSnippet = createRawSnippet<[{ stage: string; payment: string; status: string }]>(
					(getData) => {
						const { stage, payment, status } = getData();
						const badgeColor = getStatusBadgeColor(status);
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
							<span>Commission Value</span>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
						</button>
					`
				}));
				return renderSnippet(headerSnippet);
			},
			enableSorting: true,
			cell: ({ row }) => {
				const formatter = new Intl.NumberFormat('en-US', {
					minimumFractionDigits: 0,
					maximumFractionDigits: 0
				});
				const cellSnippet = createRawSnippet<[{ value: number }]>((getValue) => {
					const { value } = getValue();
					const formatted = formatter.format(value);
					return {
						render: () => `<div class="text-right font-medium">${formatted}</div>`
					};
				});
				return renderSnippet(cellSnippet, { value: row.original.commission });
			}
		}
	];

	// Table state
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});
	let rowSelection = $state<RowSelectionState>({});
	let globalFilter = $state('');

	const table = createSvelteTable({
		get data() {
			return data;
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
		onGlobalFilterChange: (updater: Updater<string>) => {
			if (typeof updater === 'function') {
				globalFilter = updater(globalFilter);
			} else {
				globalFilter = updater;
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
			},
			get globalFilter() {
				return globalFilter;
			}
		}
	});
</script>

<div class="w-full space-y-4">
	<!-- Filters and search bar -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-2">
			<div class="relative max-w-sm flex-1">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search all columns..."
					value={globalFilter}
					oninput={(e) => {
						globalFilter = e.currentTarget.value;
					}}
					onchange={(e) => {
						globalFilter = e.currentTarget.value;
					}}
					class="pl-8"
				/>
			</div>

			<div class="ml-auto flex items-center gap-2">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="outline" size="sm" class="h-9 gap-1">
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

				<Button variant="outline" size="sm" class="h-9 gap-2">
					<Calendar class="h-4 w-4" />
					This Month
				</Button>
			</div>
		</div>

		<!-- Column-specific filters -->
		<div class="flex flex-wrap items-center gap-2">
			<Input
				placeholder="Filter by client..."
				value={(table.getColumn('client')?.getFilterValue() as string) ?? ''}
				oninput={(e) => {
					table.getColumn('client')?.setFilterValue(e.currentTarget.value);
				}}
				onchange={(e) => {
					table.getColumn('client')?.setFilterValue(e.currentTarget.value);
				}}
				class="h-9 max-w-40"
			/>

			<Input
				placeholder="Filter by property..."
				value={(table.getColumn('property')?.getFilterValue() as string) ?? ''}
				oninput={(e) => {
					table.getColumn('property')?.setFilterValue(e.currentTarget.value);
				}}
				onchange={(e) => {
					table.getColumn('property')?.setFilterValue(e.currentTarget.value);
				}}
				class="h-9 max-w-40"
			/>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-9 gap-1">
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
						onclick={() => table.getColumn('dealStatus')?.setFilterValue(undefined)}
					>
						All
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => table.getColumn('dealStatus')?.setFilterValue('EOI')}>
						EOI
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onclick={() => table.getColumn('dealStatus')?.setFilterValue('Booking')}
					>
						Booking
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-9 gap-1">
							Invoicing Status
							{#if table.getColumn('invoicingStatus')?.getFilterValue()}
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
						onclick={() => table.getColumn('invoicingStatus')?.setFilterValue(undefined)}
					>
						All
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						onclick={() => table.getColumn('invoicingStatus')?.setFilterValue('Approved')}
					>
						Approved
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onclick={() => table.getColumn('invoicingStatus')?.setFilterValue('Review')}
					>
						Review
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onclick={() => table.getColumn('invoicingStatus')?.setFilterValue('Next Month')}
					>
						Next Month
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			{#if columnFilters.length > 0 || globalFilter}
				<Button
					variant="ghost"
					size="sm"
					class="h-9"
					onclick={() => {
						table.resetColumnFilters();
						globalFilter = '';
					}}
				>
					Clear filters
				</Button>
			{/if}

			<div class="ml-auto text-sm text-muted-foreground">
				{table.getFilteredSelectedRowModel().rows.length} of
				{table.getFilteredRowModel().rows.length} row(s) {columnFilters.length > 0 || globalFilter
					? 'filtered'
					: 'total'}
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
						<Table.Row class="border-b last:border-b-0 hover:bg-muted/50">
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell class="border-r last:border-r-0">
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 text-center">
							No results found.
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
