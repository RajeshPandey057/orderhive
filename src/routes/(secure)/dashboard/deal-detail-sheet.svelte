<script lang="ts">
	import * as Badge from '$lib/components/ui/badge/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import ChevronDown from '~icons/lucide/chevron-down';
	import Pencil from '~icons/lucide/pencil';

	interface Props {
		open?: boolean;
		sale?: Sale | null;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(), sale = $bindable(), onOpenChange }: Props = $props();

	// Parse client name

	const getBadgeVariant = (status: string) => {
		const lower = status.toLowerCase();
		if (lower === 'in review' || lower === 'info') return 'secondary';
		if (lower === 'verified' || lower === 'success') return 'default';
		if (lower === 'rejected' || lower === 'error') return 'destructive';
		return 'secondary';
	};
</script>

<Sheet.Root bind:open {onOpenChange}>
	<Sheet.Content side="right" class="w-200 max-w-200 overflow-y-auto sm:w-200 sm:max-w-200">
		<!-- Header -->
		<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
			<Sheet.Title class="text-2xl font-medium">Sale</Sheet.Title>
			<div class="flex flex-row gap-2">
				<Sheet.Close class={buttonVariants({ variant: 'outline', size: 'sm' })}>
					<Pencil class="mr-2 h-4 w-4" /> Edit
				</Sheet.Close>
			</div>
		</div>
		<!-- Content -->
		<div class="space-y-6 p-6">
			<!-- Client Details -->
			<div class="space-y-4">
				<h2 class="text-2xl font-semibold">Client Details</h2>
				<div class="rounded-lg border">
					<Table.Root>
						<Table.Body>
							<Table.Row>
								<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
									First Name
								</Table.Cell>
								<Table.Cell class="font-medium">{sale?.clientDetails.firstName ?? '-'}</Table.Cell>
								<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
									Last Name
								</Table.Cell>
								<Table.Cell class="font-medium">{sale?.clientDetails.lastName ?? '-'}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">Phone</Table.Cell>
								<Table.Cell class="font-medium">{sale?.clientDetails.phone ?? '-'}</Table.Cell>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">Email</Table.Cell>
								<Table.Cell class="font-medium">{sale?.clientDetails.email ?? '-'}</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			<!-- Project Details -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-semibold">Project Details</h2>
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<span class="text-sm text-muted-foreground">Compliance:</span>
							<Badge.Root variant="secondary">In Review</Badge.Root>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-muted-foreground">Finance:</span>
							<Badge.Root variant="default">Verified</Badge.Root>
						</div>
					</div>
				</div>
				<div class="rounded-lg border">
					<Table.Root>
						<Table.Body>
							<Table.Row>
								<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
									Developer
								</Table.Cell>
								<Table.Cell class="font-medium">
									<div class="flex items-center justify-between">
										<span>{sale?.developer ?? '-'}</span>
										<ChevronDown class="h-4 w-4 text-muted-foreground" />
									</div>
								</Table.Cell>
								<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
									Property
								</Table.Cell>
								<Table.Cell class="font-medium">{sale?.property ?? '-'}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">Unit</Table.Cell>
								<Table.Cell class="font-medium">{sale?.unitNo ?? '-'}</Table.Cell>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">
									Unit Value
								</Table.Cell>
								<Table.Cell class="font-medium">
									{sale?.unitValue ? Number(sale.unitValue).toLocaleString() : '-'}
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">
									Deal Type
								</Table.Cell>
								<Table.Cell class="font-medium">
									<div class="flex items-center justify-between">
										<span class="capitalize">{sale?.dealType ?? '-'}</span>
										<ChevronDown class="h-4 w-4 text-muted-foreground" />
									</div>
								</Table.Cell>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">
									Commission %
								</Table.Cell>
								<Table.Cell class="font-medium">4</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			<!-- Deal Status -->
			<div class="space-y-4">
				<h2 class="text-2xl font-semibold">Deal Status</h2>
				<div class="rounded-lg border">
					<Table.Root>
						<Table.Body>
							<Table.Row>
								<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
									Status
								</Table.Cell>
								<Table.Cell class="font-medium capitalize">
									{sale?.dealStage === 'eoi' ? 'EOI Received' : (sale?.dealStage ?? '-')}
								</Table.Cell>
								<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
									% Amount
								</Table.Cell>
								<Table.Cell class="font-medium">{sale?.paymentValue ?? '-'}%</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
