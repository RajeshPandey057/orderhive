<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '@/components/ui/badge';
	import ChevronDown from '~icons/lucide/chevron-down';
	import Upload from '~icons/lucide/cloud-upload';
	import FileText from '~icons/lucide/file-text';
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
		if (lower === 'in review' || lower === 'info' || lower === 'pending') return 'secondary';
		if (lower === 'verified' || lower === 'success') return 'success';
		if (lower === 'rejected' || lower === 'error') return 'destructive';
		return 'secondary';
	};

	const formatFileSize = (bytes: number | undefined): string => {
		if (bytes === undefined) return '-';
		if (bytes < 1024) return bytes + 'b';
		if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'kb';
		return (bytes / (1024 * 1024)).toFixed(1) + 'mb';
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
			<!-- Client KYC docs  -->
			<div class="space-y-4">
				<div class="flex items-center gap-4">
					<div
						class="grid h-8 w-8 place-items-center rounded-lg border border-white/5 bg-orange-100 p-0"
					>
						<Upload class="h-4 w-4 text-orange-500" stroke-width="4" />
					</div>
					<h2 class="text-2xl font-semibold">Client KYC Document</h2>
				</div>

				<div class="space-y-6">
					<!-- Passport -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
								>
									1
								</span>
								<h3 class="text-lg font-medium">Passport</h3>
							</div>
							<div class="flex items-center gap-4">
								<div class="flex items-center gap-2">
									<span class="text-sm text-muted-foreground">Compliance:</span>
									<Badge
										variant={getBadgeVariant(
											sale?.clientDetails.passportFile?.complianceStatus ?? 'pending'
										)}
									>
										{sale?.clientDetails.passportFile?.complianceStatus === 'pending'
											? 'In Review'
											: (sale?.clientDetails.passportFile?.complianceStatus ?? 'In Review')}
									</Badge>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm text-muted-foreground">Finance:</span>
									<Badge
										variant={getBadgeVariant(
											sale?.clientDetails.passportFile?.financeStatus ?? 'pending'
										)}
									>
										{sale?.clientDetails.passportFile?.financeStatus === 'pending'
											? 'In Review'
											: (sale?.clientDetails.passportFile?.financeStatus ?? 'In Review')}
									</Badge>
								</div>
							</div>
						</div>
						{#if sale?.clientDetails.passportFile}
							<div
								class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
							>
								<div class="flex items-center gap-3">
									<FileText class="h-10 w-10 text-orange-500" />
									<div class="flex flex-col">
										<span class="text-sm font-medium">{sale.clientDetails.passportFile.name}</span>
										<span class="text-xs text-muted-foreground"
											>{formatFileSize(sale.clientDetails.passportFile.size)}</span
										>
									</div>
								</div>
								<a
									href={sale.clientDetails.passportFile.downloadURL}
									target="_blank"
									class={buttonVariants({ variant: 'outline', size: 'sm' })}
								>
									View
								</a>
							</div>
						{:else}
							<div
								class="flex w-full items-center justify-center rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground"
							>
								No passport document uploaded
							</div>
						{/if}
					</div>

					<!-- Government ID -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
								>
									2
								</span>
								<h3 class="text-lg font-medium">Government ID</h3>
							</div>
							<div class="flex items-center gap-4">
								<div class="flex items-center gap-2">
									<span class="text-sm text-muted-foreground">Compliance:</span>
									<Badge
										variant={getBadgeVariant(
											sale?.clientDetails.nationalIdFile?.complianceStatus ?? 'pending'
										)}
									>
										{sale?.clientDetails.nationalIdFile?.complianceStatus === 'pending'
											? 'In Review'
											: (sale?.clientDetails.nationalIdFile?.complianceStatus ?? 'In Review')}
									</Badge>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm text-muted-foreground">Finance:</span>
									<Badge
										variant={getBadgeVariant(
											sale?.clientDetails.nationalIdFile?.financeStatus ?? 'pending'
										)}
									>
										{sale?.clientDetails.nationalIdFile?.financeStatus === 'pending'
											? 'In Review'
											: (sale?.clientDetails.nationalIdFile?.financeStatus ?? 'In Review')}
									</Badge>
								</div>
							</div>
						</div>
						{#if sale?.clientDetails.nationalIdFile}
							<div
								class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
							>
								<div class="flex items-center gap-3">
									<FileText class="h-10 w-10 text-orange-500" />
									<div class="flex flex-col">
										<span class="text-sm font-medium">{sale.clientDetails.nationalIdFile.name}</span
										>
										<span class="text-xs text-muted-foreground"
											>{formatFileSize(sale.clientDetails.nationalIdFile.size)}</span
										>
									</div>
								</div>
								<a
									href={sale.clientDetails.nationalIdFile.downloadURL}
									target="_blank"
									class={buttonVariants({ variant: 'outline', size: 'sm' })}
								>
									View
								</a>
							</div>
						{:else}
							<div
								class="flex w-full items-center justify-center rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground"
							>
								No national ID document uploaded
							</div>
						{/if}
					</div>

					<!-- AML Form -->
					<!-- AML Form -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
								>
									3
								</span>
								<h3 class="text-lg font-medium">AML Form</h3>
							</div>
							<div class="flex items-center gap-4">
								<div class="flex items-center gap-2">
									<span class="text-sm text-muted-foreground">Compliance:</span>
									<Badge
										variant={getBadgeVariant(
											sale?.clientDetails.amlFormFile?.complianceStatus ?? 'pending'
										)}
									>
										{sale?.clientDetails.amlFormFile?.complianceStatus === 'pending'
											? 'In Review'
											: (sale?.clientDetails.amlFormFile?.complianceStatus ?? 'In Review')}
									</Badge>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm text-muted-foreground">Finance:</span>
									<Badge
										variant={getBadgeVariant(
											sale?.clientDetails.amlFormFile?.financeStatus ?? 'pending'
										)}
									>
										{sale?.clientDetails.amlFormFile?.financeStatus === 'pending'
											? 'In Review'
											: (sale?.clientDetails.amlFormFile?.financeStatus ?? 'In Review')}
									</Badge>
								</div>
							</div>
						</div>
						{#if sale?.clientDetails.amlFormFile}
							<div
								class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
							>
								<div class="flex items-center gap-3">
									<FileText class="h-10 w-10 text-orange-500" />
									<div class="flex flex-col">
										<span class="text-sm font-medium">{sale.clientDetails.amlFormFile.name}</span>
										<span class="text-xs text-muted-foreground"
											>{formatFileSize(sale.clientDetails.amlFormFile.size)}</span
										>
									</div>
								</div>
								<a
									href={sale.clientDetails.amlFormFile.downloadURL}
									target="_blank"
									class={buttonVariants({ variant: 'outline', size: 'sm' })}
								>
									View
								</a>
							</div>
						{:else}
							<div
								class="flex w-full items-center justify-center rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground"
							>
								No AML form document uploaded
							</div>
						{/if}
					</div>
				</div>
			</div>
			<!-- Project Details -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-semibold">Project Details</h2>
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<span class="text-sm text-muted-foreground">Compliance:</span>
							<Badge variant="secondary">In Review</Badge>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-muted-foreground">Finance:</span>
							<Badge variant="default">Verified</Badge>
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
