<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
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
		{JSON.stringify(sale, null, 2)}
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
								<Table.Cell class="font-medium">{sale?.primaryBuyer.firstName ?? '-'}</Table.Cell>
								<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
									Last Name
								</Table.Cell>
								<Table.Cell class="font-medium">{sale?.primaryBuyer.lastName ?? '-'}</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">Phone</Table.Cell>
								<Table.Cell class="font-medium">{sale?.primaryBuyer.phone ?? '-'}</Table.Cell>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">Email</Table.Cell>
								<Table.Cell class="font-medium">{sale?.primaryBuyer.email ?? '-'}</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
