<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { formatAmount, type DealRow } from '$lib/finance-dashboard-utils.js';
	import { toast } from 'svelte-sonner';
	import Copy from '~icons/lucide/copy';
	import Home from '~icons/lucide/house';
	import Tag from '~icons/lucide/tag';

	let { deals, label }: { deals: DealRow[]; label: string } = $props();

	let tableScroller = $state<HTMLDivElement | null>(null);
	let scrollbar = $state<HTMLDivElement | null>(null);

	function syncScroll(source: HTMLDivElement | null, target: HTMLDivElement | null) {
		if (!source || !target || target.scrollLeft === source.scrollLeft) return;
		target.scrollLeft = source.scrollLeft;
	}

	async function copyId(id: string) {
		try {
			await navigator.clipboard.writeText(id);
			toast.success(`Copied ${id}`);
		} catch {
			toast.error('Unable to copy sale ID');
		}
	}

	function formatUnitValue(v: string): string {
		const n = parseFloat(v.replace(/[^0-9.]/g, ''));
		if (isNaN(n)) return v || '-';
		if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
		if (n >= 1_000) return `AED ${(n / 1_000).toFixed(1)}K`;
		return `AED ${n.toLocaleString()}`;
	}

	function formatInvoiceStage(stages: string[]): string {
		if (!stages.length) return '-';
		return stages
			.map((s) => {
				if (s === 'first-half') return '1st Half';
				if (s === 'second-half') return '2nd Half';
				if (s === 'full') return 'Full';
				return s;
			})
			.join(', ');
	}

	function formatFinanceStatus(status: string): { label: string; cls: string } {
		switch (status) {
			case 'paid':
				return { label: 'Paid', cls: 'bg-green-100 text-green-700' };
			case 'raised':
				return { label: 'Invoice Raised', cls: 'bg-blue-100 text-blue-700' };
			case 'generated':
				return { label: 'Generated', cls: 'bg-amber-100 text-amber-700' };
			default:
				return { label: 'Pending', cls: 'bg-gray-100 text-gray-600' };
		}
	}

	const sorted = $derived([...deals].sort((a, b) => b.id.localeCompare(a.id)));
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-baseline gap-2">
		<h2 class="text-sm font-semibold uppercase tracking-wide text-foreground">
			Deals — {label}
		</h2>
		<span class="text-muted-foreground text-xs">{deals.length} deal{deals.length !== 1 ? 's' : ''}</span>
	</div>

	<div class="rounded-md border border-[#EBEEEE] bg-white">
		<div
			bind:this={tableScroller}
			class="overflow-x-auto"
			onscroll={() => syncScroll(tableScroller, scrollbar)}
		>
			<Table.Root class="min-w-[1100px]">
				<Table.Header>
					<Table.Row class="bg-[#FBF9F8]">
						<Table.Head class="h-11 min-w-36 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
							Sale ID
						</Table.Head>
						<Table.Head class="h-11 min-w-36 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
							Client
						</Table.Head>
						<Table.Head class="h-11 min-w-44 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
							<div class="flex items-center gap-1.5">
								<Home class="size-4" />
								Property
							</div>
						</Table.Head>
						<Table.Head class="h-11 min-w-32 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
							<div class="flex items-center gap-1.5">
								<Tag class="size-4" />
								Unit Value
							</div>
						</Table.Head>
						<Table.Head class="h-11 min-w-32 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
							Invoice Stage
						</Table.Head>
						<Table.Head class="h-11 min-w-32 border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
							Invoice Status
						</Table.Head>
						<Table.Head class="h-11 min-w-28 border-r border-[#EBDCCB] text-right text-[13px] text-[#17213D]">
							Revenue
						</Table.Head>
						<Table.Head class="h-11 min-w-28 border-r border-[#EBDCCB] text-right text-[13px] text-[#17213D]">
							Passback
						</Table.Head>
						<Table.Head class="h-11 min-w-32 text-right text-[13px] text-[#17213D]">
							Profit Post Passback
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if sorted.length}
						{#each sorted as deal (deal.id)}
							{@const financeStatus = formatFinanceStatus(deal.invoiceFinanceStatus)}
							<Table.Row class="border-[#EBDCCB]">
								<Table.Cell class="border-r border-[#EBDCCB] font-mono text-[13px] font-semibold text-[#17213D]">
									<div class="flex items-center gap-1.5">
										<span class="truncate max-w-28">{deal.id}</span>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											class="size-7 shrink-0 text-[#687976] hover:text-[#17213D]"
											aria-label="Copy sale ID"
											onclick={() => copyId(deal.id)}
										>
											<Copy class="size-3.5" />
										</Button>
									</div>
								</Table.Cell>
								<Table.Cell class="border-r border-[#EBDCCB] text-[13px] font-semibold text-[#17213D]">
									{deal.clientName}
								</Table.Cell>
								<Table.Cell class="border-r border-[#EBDCCB] text-[13px]">
									<div class="font-semibold text-[#17213D]">{deal.project}</div>
									<div class="mt-0.5 text-[#626262]">{deal.developer}</div>
								</Table.Cell>
								<Table.Cell class="border-r border-[#EBDCCB] text-[13px] font-semibold text-[#17213D] tabular-nums">
									{formatUnitValue(deal.unitValue)}
								</Table.Cell>
								<Table.Cell class="border-r border-[#EBDCCB] text-[13px] text-[#17213D]">
									{formatInvoiceStage(deal.invoiceStage)}
								</Table.Cell>
								<Table.Cell class="border-r border-[#EBDCCB] text-[13px]">
									<span class="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold {financeStatus.cls}">
										{financeStatus.label}
									</span>
								</Table.Cell>
								<Table.Cell class="border-r border-[#EBDCCB] text-right text-[13px] font-semibold text-[#17213D] tabular-nums">
									{formatAmount(deal.revenueAchieved)}
								</Table.Cell>
								<Table.Cell class="border-r border-[#EBDCCB] text-right text-[13px] font-semibold text-amber-600 tabular-nums">
									{formatAmount(deal.passbackAmount)}
								</Table.Cell>
								<Table.Cell class="text-right text-[13px] font-semibold text-emerald-600 tabular-nums">
									{formatAmount(deal.revenueAfterPassback)}
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan={9} class="h-24 text-center text-[13px] text-[#687976]">
								No confirmed deals found.
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</div>
		<div
			bind:this={scrollbar}
			class="overflow-x-scroll border-t border-[#EBDCCB] md:hidden"
			onscroll={() => syncScroll(scrollbar, tableScroller)}
		>
			<div class="h-4 min-w-[1100px]"></div>
		</div>
	</div>
</div>
