<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '@/components/ui/badge';
	import { Separator } from '@/components/ui/separator';
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
		if (lower === 'verified' || lower === 'success' || lower === 'approved') return 'success';
		if (lower === 'rejected' || lower === 'error') return 'destructive';
		if (lower === 'not-eligible') return 'outline';
		return 'secondary';
	};

	const formatFileSize = (bytes: number | undefined): string => {
		if (bytes === undefined) return '-';
		if (bytes < 1024) return bytes + 'b';
		if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'kb';
		return (bytes / (1024 * 1024)).toFixed(1) + 'mb';
	};

	const getInitials = (name: string): string => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	const formatCommentDate = (timestamp: unknown): string => {
		if (!timestamp) return '';
		const date =
			typeof timestamp === 'object' &&
			timestamp !== null &&
			'toDate' in timestamp &&
			typeof timestamp.toDate === 'function'
				? timestamp.toDate()
				: new Date(timestamp as string | number);
		const options: Intl.DateTimeFormatOptions = {
			day: 'numeric',
			month: 'short',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		};
		return date.toLocaleDateString('en-US', options).replace(',', ' -');
	};

	const filterCommentsBySection = (
		section:
			| 'client-details'
			| 'project-details'
			| 'deal-status'
			| 'refferal-agreement'
			| 'invoicing-stage'
			| 'deal-owners'
			| 'joint-buyers'
	) => {
		return sale?.commnets?.filter((comment) => comment.section === section) ?? [];
	};
</script>

{#snippet sectionComments(section: string)}
	{@const comments = filterCommentsBySection(
		section as
			| 'client-details'
			| 'project-details'
			| 'deal-status'
			| 'refferal-agreement'
			| 'invoicing-stage'
			| 'deal-owners'
			| 'joint-buyers'
	)}

	{#if comments.length > 0}
		<div class="mt-4 space-y-4">
			<h4 class="text-sm font-semibold underline decoration-muted-foreground/30 underline-offset-8">
				Comment
			</h4>
			<div class="mt-6 space-y-6">
				{#each comments as comment (comment.createdAt)}
					<div class="flex items-start gap-4">
						<Avatar.Root class="size-9 bg-blue-600">
							{#if comment.authourPhotoURL}
								<Avatar.Image src={comment.authourPhotoURL} alt={comment.authourName} />
							{/if}
							<Avatar.Fallback class="bg-blue-600 text-xs text-white">
								{getInitials(comment.authourName)}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="flex-1 space-y-1.5">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="text-sm font-semibold text-foreground">{comment.authourName}</span>
									<Badge
										variant="secondary"
										class="bg-muted px-1.5 py-0 text-[10px] font-normal text-muted-foreground hover:bg-muted"
									>
										{comment.team.charAt(0).toUpperCase() + comment.team.slice(1)}
									</Badge>
								</div>
								<span class="text-xs text-muted-foreground">
									{formatCommentDate(comment.createdAt)}
								</span>
							</div>
							<p class="text-sm leading-relaxed text-muted-foreground">
								{comment.message}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

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
				<h2 class="text-lg font-medium">Client Details</h2>
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
								<Table.Cell class="font-medium">
									{#if sale?.clientDetails.phone}
										<a
											href="tel:{sale.clientDetails.phone}"
											class="text-orange-500 hover:underline"
										>
											{sale.clientDetails.phone}
										</a>
									{:else}
										-
									{/if}
								</Table.Cell>
								<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">Email</Table.Cell>
								<Table.Cell class="font-medium">
									{#if sale?.clientDetails.email}
										<a
											href="mailto:{sale.clientDetails.email}"
											class="text-orange-500 hover:underline"
										>
											{sale.clientDetails.email}
										</a>
									{:else}
										-
									{/if}
								</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</div>
			</div>
			<div class="space-y-4">
				<div class="flex items-center gap-4">
					<div
						class="grid h-8 w-8 place-items-center rounded-lg border border-white/5 bg-orange-100 p-0"
					>
						<Upload class="h-4 w-4 text-orange-500" stroke-width="4" />
					</div>
					<h2 class="text-sm font-medium">Client KYC Document</h2>
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
								<h3 class="text-sm font-medium">Passport</h3>
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
								<h3 class="text-sm font-medium">Government ID</h3>
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
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
								>
									3
								</span>
								<h3 class="text-sm font-medium">AML Form</h3>
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

			<!-- Client Details Comments -->
			{@render sectionComments('client-details')}

			<Separator class="my-4" />

			<!-- Project Details -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-medium">Project Details</h2>
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

			<!-- Project Details Comments -->
			{@render sectionComments('project-details')}

			<Separator class="my-4" />

			<!-- Deal Status -->
			<div class="space-y-4">
				<h2 class="text-lg font-medium">Deal Status</h2>
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
			<div class="space-y-6">
				<!-- Booking Form -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<span
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
							>
								1
							</span>
							<h3 class="text-sm font-medium">Booking Form</h3>
						</div>
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2">
								<span class="text-sm text-muted-foreground">Compliance:</span>
								<Badge
									variant={getBadgeVariant(sale?.bookingFormFile?.complianceStatus ?? 'pending')}
								>
									{sale?.bookingFormFile?.complianceStatus === 'pending'
										? 'In Review'
										: (sale?.bookingFormFile?.complianceStatus ?? 'In Review')}
								</Badge>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-sm text-muted-foreground">Finance:</span>
								<Badge variant={getBadgeVariant(sale?.bookingFormFile?.financeStatus ?? 'pending')}>
									{sale?.bookingFormFile?.financeStatus === 'pending'
										? 'In Review'
										: (sale?.bookingFormFile?.financeStatus ?? 'In Review')}
								</Badge>
							</div>
						</div>
					</div>
					{#if sale?.bookingFormFile}
						<div
							class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
						>
							<div class="flex items-center gap-3">
								<FileText class="h-10 w-10 text-orange-500" />
								<div class="flex flex-col">
									<span class="text-sm font-medium">{sale.bookingFormFile.name}</span>
									<span class="text-xs text-muted-foreground"
										>{formatFileSize(sale.bookingFormFile.size)}</span
									>
								</div>
							</div>
							<a
								href={sale.bookingFormFile.downloadURL}
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
							No booking form uploaded
						</div>
					{/if}
				</div>

				<!-- Payment Receipt -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<span
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
							>
								2
							</span>
							<h3 class="text-sm font-medium">Payment Receipt</h3>
						</div>
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2">
								<span class="text-sm text-muted-foreground">Compliance:</span>
								<Badge
									variant={getBadgeVariant(sale?.paymentReceiptFile?.complianceStatus ?? 'pending')}
								>
									{sale?.paymentReceiptFile?.complianceStatus === 'pending'
										? 'In Review'
										: (sale?.paymentReceiptFile?.complianceStatus ?? 'In Review')}
								</Badge>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-sm text-muted-foreground">Finance:</span>
								<Badge
									variant={getBadgeVariant(sale?.paymentReceiptFile?.financeStatus ?? 'pending')}
								>
									{sale?.paymentReceiptFile?.financeStatus === 'pending'
										? 'In Review'
										: (sale?.paymentReceiptFile?.financeStatus ?? 'In Review')}
								</Badge>
							</div>
						</div>
					</div>
					{#if sale?.paymentReceiptFile}
						<div
							class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
						>
							<div class="flex items-center gap-3">
								<FileText class="h-10 w-10 text-orange-500" />
								<div class="flex flex-col">
									<span class="text-sm font-medium">{sale.paymentReceiptFile.name}</span>
									<span class="text-xs text-muted-foreground"
										>{formatFileSize(sale.paymentReceiptFile.size)}</span
									>
								</div>
							</div>
							<a
								href={sale.paymentReceiptFile.downloadURL}
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
							No payment receipt uploaded
						</div>
					{/if}
				</div>
			</div>

			<!-- Deal Status Comments -->
			{@render sectionComments('deal-status')}

			<Separator class="my-4" />

			<!-- Referral Agreement -->
			<div class="space-y-4">
				<h2 class="text-lg font-medium">Referral Agreement</h2>
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<span
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
							>
								3
							</span>
							<h3 class="text-sm font-medium">Referral Agreement</h3>
						</div>
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2">
								<span class="text-sm text-muted-foreground">Compliance:</span>
								<Badge
									variant={getBadgeVariant(
										sale?.refferalAgreementFile?.complianceStatus ?? 'pending'
									)}
								>
									{sale?.refferalAgreementFile?.complianceStatus === 'pending'
										? 'In Review'
										: (sale?.refferalAgreementFile?.complianceStatus ?? 'In Review')}
								</Badge>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-sm text-muted-foreground">Finance:</span>
								<Badge
									variant={getBadgeVariant(sale?.refferalAgreementFile?.financeStatus ?? 'pending')}
								>
									{sale?.refferalAgreementFile?.financeStatus === 'pending'
										? 'In Review'
										: (sale?.refferalAgreementFile?.financeStatus ?? 'In Review')}
								</Badge>
							</div>
						</div>
					</div>
					{#if sale?.refferalAgreementFile}
						<div
							class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
						>
							<div class="flex items-center gap-3">
								<FileText class="h-10 w-10 text-orange-500" />
								<div class="flex flex-col">
									<span class="text-sm font-medium">{sale.refferalAgreementFile.name}</span>
									<span class="text-xs text-muted-foreground"
										>{formatFileSize(sale.refferalAgreementFile.size)}</span
									>
								</div>
							</div>
							<a
								href={sale.refferalAgreementFile.downloadURL}
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
							No referral agreement uploaded
						</div>
					{/if}
				</div>
			</div>

			<!-- Referral Agreement Comments -->
			{@render sectionComments('refferal-agreement')}

			<Separator class="my-4" />

			<!-- Invoicing Stage -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-medium">Invoicing Stage</h2>
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<span class="text-sm text-muted-foreground">Compliance:</span>
							<Badge variant={getBadgeVariant(sale?.complianceStatus ?? 'pending')}>
								{#if sale?.complianceStatus === 'pending'}
									In Review
								{:else}
									<span class="capitalize">
										{sale?.complianceStatus === 'approved'
											? 'Verified'
											: (sale?.complianceStatus?.replace('-', ' ') ?? 'In Review')}
									</span>
								{/if}
							</Badge>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-muted-foreground">Finance:</span>
							<Badge variant={getBadgeVariant(sale?.financeStatus ?? 'pending')}>
								{#if sale?.financeStatus === 'pending'}
									In Review
								{:else}
									<span class="capitalize">
										{sale?.financeStatus === 'approved'
											? 'Verified'
											: (sale?.financeStatus?.replace('-', ' ') ?? 'In Review')}
									</span>
								{/if}
							</Badge>
						</div>
					</div>
				</div>
				<div class="rounded-lg border">
					<Table.Root>
						<Table.Body>
							<Table.Row>
								<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
									Stage
								</Table.Cell>
								<Table.Cell class="font-medium">
									<div class="flex flex-col">
										<span>First half</span>
										<span class="text-xs font-normal text-muted-foreground">10 + 4% paid</span>
									</div>
								</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			<!-- Invoicing Stage Comments -->
			{@render sectionComments('invoicing-stage')}

			<Separator class="my-4" />

			<!-- Deal Owners -->
			<div class="space-y-4">
				<h2 class="text-lg font-medium">Deal Owners</h2>
				<div class="rounded-lg border">
					<Table.Root>
						<Table.Body>
							{#each sale?.dealOwners ?? [] as owner, i (owner.userId)}
								<Table.Row>
									<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
										Agent {i + 1}
									</Table.Cell>
									<Table.Cell class="font-medium">
										<a href="mailto:{owner.email}" class="text-orange-500 hover:underline">
											{owner.email}
										</a>
									</Table.Cell>
									<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
										% Split
									</Table.Cell>
									<Table.Cell class="font-medium">{owner.split}%</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			<!-- Deal Owners Comments -->
			{@render sectionComments('deal-owners')}

			<Separator class="my-4" />

			<!-- Joint Buyers -->
			{#if sale?.jointBuyers && sale.jointBuyers.length > 0}
				<Separator class="my-4" />
				<!-- Joint Buyers -->
				<div class="space-y-6">
					<h2 class="text-lg font-medium">Joint Buyers</h2>
					{#each sale.jointBuyers as buyer, i (i)}
						<div class="space-y-8 rounded-xl border bg-muted/5 p-6">
							<div class="flex items-center justify-between border-b pb-4">
								<h3 class="text-md font-medium text-orange-500">Joint Buyer #{i + 1}</h3>
							</div>

							<!-- Buyer Details (Copy of Client Details UI) -->
							<div class="space-y-4">
								<h2 class="text-lg font-medium">Details</h2>
								<div class="rounded-lg border bg-background">
									<Table.Root>
										<Table.Body>
											<Table.Row>
												<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
													First Name
												</Table.Cell>
												<Table.Cell class="font-medium">{buyer.firstName ?? '-'}</Table.Cell>
												<Table.Cell class="w-48 bg-muted/50 font-medium text-muted-foreground">
													Last Name
												</Table.Cell>
												<Table.Cell class="font-medium">{buyer.lastName ?? '-'}</Table.Cell>
											</Table.Row>
											<Table.Row>
												<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">
													Phone
												</Table.Cell>
												<Table.Cell class="font-medium">
													{#if buyer.phone}
														<a href="tel:{buyer.phone}" class="text-orange-500 hover:underline">
															{buyer.phone}
														</a>
													{:else}
														-
													{/if}
												</Table.Cell>
												<Table.Cell class="bg-muted/50 font-medium text-muted-foreground">
													Email
												</Table.Cell>
												<Table.Cell class="font-medium">
													{#if buyer.email}
														<a href="mailto:{buyer.email}" class="text-orange-500 hover:underline">
															{buyer.email}
														</a>
													{:else}
														-
													{/if}
												</Table.Cell>
											</Table.Row>
										</Table.Body>
									</Table.Root>
								</div>
							</div>

							<!-- Buyer KYC (Copy of Client KYC UI) -->
							<div class="space-y-4">
								<div class="flex items-center gap-4">
									<div
										class="grid h-8 w-8 place-items-center rounded-lg border border-white/5 bg-orange-100 p-0"
									>
										<Upload class="h-4 w-4 text-orange-500" stroke-width="4" />
									</div>
									<h2 class="text-sm font-medium">KYC Documents</h2>
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
												<h3 class="text-sm font-medium">Passport</h3>
											</div>
											<div class="flex items-center gap-4">
												<div class="flex items-center gap-2">
													<span class="text-sm text-muted-foreground">Compliance:</span>
													<Badge
														variant={getBadgeVariant(
															buyer.passportFile?.complianceStatus ?? 'pending'
														)}
													>
														{buyer.passportFile?.complianceStatus === 'pending'
															? 'In Review'
															: (buyer.passportFile?.complianceStatus ?? 'In Review')}
													</Badge>
												</div>
												<div class="flex items-center gap-2">
													<span class="text-sm text-muted-foreground">Finance:</span>
													<Badge
														variant={getBadgeVariant(
															buyer.passportFile?.financeStatus ?? 'pending'
														)}
													>
														{buyer.passportFile?.financeStatus === 'pending'
															? 'In Review'
															: (buyer.passportFile?.financeStatus ?? 'In Review')}
													</Badge>
												</div>
											</div>
										</div>
										{#if buyer.passportFile}
											<div
												class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
											>
												<div class="flex items-center gap-3">
													<FileText class="h-10 w-10 text-orange-500" />
													<div class="flex flex-col">
														<span class="text-sm font-medium">{buyer.passportFile.name}</span>
														<span class="text-xs text-muted-foreground"
															>{formatFileSize(buyer.passportFile.size)}</span
														>
													</div>
												</div>
												<a
													href={buyer.passportFile.downloadURL}
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
												No passport uploaded
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
												<h3 class="text-sm font-medium">Government ID</h3>
											</div>
											<div class="flex items-center gap-4">
												<div class="flex items-center gap-2">
													<span class="text-sm text-muted-foreground">Compliance:</span>
													<Badge
														variant={getBadgeVariant(
															buyer.nationalIdFile?.complianceStatus ?? 'pending'
														)}
													>
														{buyer.nationalIdFile?.complianceStatus === 'pending'
															? 'In Review'
															: (buyer.nationalIdFile?.complianceStatus ?? 'In Review')}
													</Badge>
												</div>
												<div class="flex items-center gap-2">
													<span class="text-sm text-muted-foreground">Finance:</span>
													<Badge
														variant={getBadgeVariant(
															buyer.nationalIdFile?.financeStatus ?? 'pending'
														)}
													>
														{buyer.nationalIdFile?.financeStatus === 'pending'
															? 'In Review'
															: (buyer.nationalIdFile?.financeStatus ?? 'In Review')}
													</Badge>
												</div>
											</div>
										</div>
										{#if buyer.nationalIdFile}
											<div
												class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
											>
												<div class="flex items-center gap-3">
													<FileText class="h-10 w-10 text-orange-500" />
													<div class="flex flex-col">
														<span class="text-sm font-medium">{buyer.nationalIdFile.name}</span>
														<span class="text-xs text-muted-foreground"
															>{formatFileSize(buyer.nationalIdFile.size)}</span
														>
													</div>
												</div>
												<a
													href={buyer.nationalIdFile.downloadURL}
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
												No national ID uploaded
											</div>
										{/if}
									</div>

									<!-- AML Form -->
									<div class="space-y-3">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-4">
												<span
													class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
												>
													3
												</span>
												<h3 class="text-sm font-medium">AML Form</h3>
											</div>
											<div class="flex items-center gap-4">
												<div class="flex items-center gap-2">
													<span class="text-sm text-muted-foreground">Compliance:</span>
													<Badge
														variant={getBadgeVariant(
															buyer.amlFormFile?.complianceStatus ?? 'pending'
														)}
													>
														{buyer.amlFormFile?.complianceStatus === 'pending'
															? 'In Review'
															: (buyer.amlFormFile?.complianceStatus ?? 'In Review')}
													</Badge>
												</div>
												<div class="flex items-center gap-2">
													<span class="text-sm text-muted-foreground">Finance:</span>
													<Badge
														variant={getBadgeVariant(buyer.amlFormFile?.financeStatus ?? 'pending')}
													>
														{buyer.amlFormFile?.financeStatus === 'pending'
															? 'In Review'
															: (buyer.amlFormFile?.financeStatus ?? 'In Review')}
													</Badge>
												</div>
											</div>
										</div>
										{#if buyer.amlFormFile}
											<div
												class="flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3"
											>
												<div class="flex items-center gap-3">
													<FileText class="h-10 w-10 text-orange-500" />
													<div class="flex flex-col">
														<span class="text-sm font-medium">{buyer.amlFormFile.name}</span>
														<span class="text-xs text-muted-foreground"
															>{formatFileSize(buyer.amlFormFile.size)}</span
														>
													</div>
												</div>
												<a
													href={buyer.amlFormFile.downloadURL}
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
												No AML form uploaded
											</div>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}

					<!-- Joint Buyers Comments -->
					{@render sectionComments('joint-buyers')}
				</div>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
