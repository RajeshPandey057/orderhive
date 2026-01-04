<script lang="ts">
	import DealPercentage from '$lib/components/deal-percentage.svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import HorizontalSeparator from '@/components/ui/separator/horizontal-separator.svelte';
	import { firekitCollection, firekitUser } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';
	import Building from '~icons/lucide/building';
	import PlusRound from '~icons/lucide/circle-fading-plus';
	import Upload from '~icons/lucide/cloud-upload';
	import FileText from '~icons/lucide/file-text';
	import Hammer from '~icons/lucide/hammer';
	import Home from '~icons/lucide/home';
	import Pencil from '~icons/lucide/pencil';
	import Plus from '~icons/lucide/plus';
	import Save from '~icons/lucide/save';
	import PriceTag from '~icons/lucide/tag';
	import Traffic from '~icons/lucide/traffic-cone';
	import Trash2 from '~icons/lucide/trash-2';
	import X from '~icons/lucide/x';
	import { createSale } from './sales.remote';

	let sheetOpen = $state(false);
	let jointBuyers = $state<{ key: number }[]>([]);
	let nextJointKey = 0;
	let nextOwnerKey = 0;

	type FirestoreUser = {
		id: string;
		email: string;
		displayName?: string;
		photoURL?: string;
	};

	type DealOwnerRow = {
		key: number;
		userId: string;
		email: string;
		name: string;
		split: number;
		photoURL?: string;
	};

	const users = firekitCollection<FirestoreUser>('users');

	let dealOwners = $state<DealOwnerRow[]>([
		{
			key: nextOwnerKey++,
			userId: firekitUser.uid ?? '',
			email: firekitUser.email ?? '',
			name: firekitUser.displayName ?? 'You',
			split: 100,
			photoURL: firekitUser.photoURL ?? undefined
		}
	]);

	const syncDealOwners = () => {
		createSale.fields.dealOwners.set(
			dealOwners.map((owner) => ({
				userId: owner.userId,
				email: owner.email,
				split: Number(owner.split) || 0
			}))
		);
	};

	syncDealOwners();

	const ownerOptions = $derived(users.data ?? []);
	const splitTotal = $derived(
		dealOwners.reduce((total, owner) => total + (Number(owner.split) || 0), 0)
	);
	const splitRemaining = $derived(100 - splitTotal);

	// Track uploaded files
	let uploadedFiles = $state<Record<string, File | null>>({
		passportFile: null,
		nationalIdFile: null,
		bookingFormFile: null,
		paymentReceiptFile: null
	});

	// Track uploaded files for joint buyers
	let jointBuyerFiles = $state<
		Record<number, { passportFile: File | null; nationalIdFile: File | null }>
	>({});

	const handleFileUpload = (fieldName: string, event: Event) => {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			uploadedFiles[fieldName] = input.files[0];
		}
	};

	const removeFile = (fieldName: string) => {
		uploadedFiles[fieldName] = null;
		const input = document.getElementById(fieldName) as HTMLInputElement;
		if (input) input.value = '';
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return bytes + 'b';
		if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'kb';
		return (bytes / (1024 * 1024)).toFixed(1) + 'mb';
	};

	const addJointBuyer = () => {
		const newKey = nextJointKey++;
		jointBuyers = [...jointBuyers, { key: newKey }];
		jointBuyerFiles[newKey] = { passportFile: null, nationalIdFile: null };
	};

	const removeJointBuyer = (key: number) => {
		jointBuyers = jointBuyers.filter((buyer) => buyer.key !== key);
		delete jointBuyerFiles[key];
	};

	const handleJointBuyerFileUpload = (
		buyerKey: number,
		fieldName: 'passportFile' | 'nationalIdFile',
		event: Event
	) => {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			if (!jointBuyerFiles[buyerKey]) {
				jointBuyerFiles[buyerKey] = { passportFile: null, nationalIdFile: null };
			}
			jointBuyerFiles[buyerKey][fieldName] = input.files[0];
		}
	};

	const removeJointBuyerFile = (buyerKey: number, fieldName: 'passportFile' | 'nationalIdFile') => {
		if (jointBuyerFiles[buyerKey]) {
			jointBuyerFiles[buyerKey][fieldName] = null;
		}
		const input = document.getElementById(`joint-${fieldName}-${buyerKey}`) as HTMLInputElement;
		if (input) input.value = '';
	};

	const handleOwnerSelect = (ownerKey: number, userId: string) => {
		const selectedUser = ownerOptions.find((user) => user.id === userId);

		dealOwners = dealOwners.map((owner) =>
			owner.key === ownerKey
				? {
						...owner,
						userId,
						email: selectedUser?.email ?? '',
						name: selectedUser?.displayName ?? selectedUser?.email ?? 'Owner',
						photoURL: selectedUser?.photoURL
					}
				: owner
		);

		syncDealOwners();
	};

	const handleSplitChange = (ownerKey: number, value: string) => {
		const numericSplit = Number(value);
		dealOwners = dealOwners.map((owner) =>
			owner.key === ownerKey
				? {
						...owner,
						split: Number.isNaN(numericSplit) ? 0 : numericSplit
					}
				: owner
		);

		syncDealOwners();
	};

	const addDealOwner = () => {
		const defaultSplit = Math.max(0, splitRemaining);
		dealOwners = [
			...dealOwners,
			{
				key: nextOwnerKey++,
				userId: '',
				email: '',
				name: '',
				split: defaultSplit
			}
		];

		syncDealOwners();
	};

	const removeDealOwner = (ownerKey: number) => {
		if (dealOwners.length === 1) return;
		dealOwners = dealOwners.filter((owner) => owner.key !== ownerKey);

		syncDealOwners();
	};

	const dealTypes = [
		{ value: 'off-plan', label: 'Off Plan' },
		{ value: 'on-plan', label: 'On Plan' },
		{ value: 'resell', label: 'Resell' }
	];
	const developers = [
		{ value: 'emmar', label: 'Emmar' },
		{ value: 'danube', label: 'Danube' },
		{ value: 'sobha-realty', label: 'Sobha Realty' },
		{ value: 'dubai-properties', label: 'Dubai Properties' },
		{ value: 'arada', label: 'Arada' },
		{ value: 'deyaar', label: 'Deyaar' },
		{ value: 'aldar', label: 'Aldar' },
		{ value: 'ellington', label: 'Ellington' },
		{ value: 'damac', label: 'Damac' },
		{ value: 'omniyat', label: 'Omniyat' },
		{ value: 'nakheel', label: 'Nakheel' },
		{ value: 'binghatti', label: 'Binghatti' },
		{ value: 'meras', label: 'Meras' }
	];

	const dealTypeLabel = $derived(
		dealTypes.find((d) => d.value === createSale.fields.dealType.value())?.label ?? 'Choose deal'
	);
	const developerLabel = $derived(
		developers.find((d) => d.value === createSale.fields.developer.value())?.label ??
			'Select Developer'
	);
</script>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Trigger class={buttonVariants({ variant: 'default' })}>
		<Plus />
		<p class="text-sm">Add Sale</p>
	</Sheet.Trigger>
	<Sheet.Content side="right" class="w-200 max-w-200 overflow-y-auto sm:w-200 sm:max-w-200">
		<form
			enctype="multipart/form-data"
			{...createSale.enhance(async ({ form, submit }) => {
				try {
					await submit();

					// Only reset and close if submission was successful (no validation errors)
					const issues = createSale.fields.allIssues();
					if (!issues?.length) {
						form.reset();
						sheetOpen = false;
						toast.success('Sale created successfully!');
					}
				} catch {
					toast.error('Failed to create sale');
				}
			})}
		>
			<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
				<Sheet.Title class="text-2xl font-medium">Add Sale</Sheet.Title>
				<div class="flex flex-row gap-2">
					<Sheet.Close class={buttonVariants({ variant: 'outline', size: 'sm' })}>
						<Pencil class="mr-2 h-4 w-4" /> Save as Draft
					</Sheet.Close>
					<Button
						type="submit"
						size="sm"
						disabled={!!createSale.pending || splitRemaining !== 0}
						title={splitRemaining !== 0 ? 'Owner split must total 100%' : undefined}
					>
						<Save class="mr-2 h-4 w-4" />
						{createSale.pending ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</div>
			{#each createSale.fields.allIssues() as issue, i (i)}
				<Field.Error class="text-sm text-destructive">
					{issue.message}
				</Field.Error>
			{/each}
			<div class="flex flex-col gap-8 p-6">
				<!-- Client Details Section -->
				<Field.Set>
					<Field.Set>
						<Field.Legend class="text-lg font-medium">Client Details</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-3 gap-4">
								<Field.Field>
									<Input {...createSale.fields.firstName.as('text')} placeholder="First Name" />
									{#each createSale.fields.firstName.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
								<Field.Field>
									<Input {...createSale.fields.lastName.as('text')} placeholder="Last Name" />
									{#each createSale.fields.lastName.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
								<Field.Field>
									<Input {...createSale.fields.email.as('email')} placeholder="Email" />
									{#each createSale.fields.email.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
							</div>

							<div class="flex gap-2">
								<Input id="countryCode" class="w-32" disabled value="+971" />
								<Field.Field class="flex-1">
									<Input {...createSale.fields.phone.as('tel')} placeholder="00000 00000" />
									{#each createSale.fields.phone.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
							</div>
						</Field.Group>
					</Field.Set>
					<Field.Set>
						<Field.Legend class="flex items-center gap-4 text-lg font-medium">
							<div
								class="grid h-8 w-8 place-items-center rounded-lg border border-white/5 bg-orange-100 p-0"
							>
								<Upload class="h-4 w-4 text-orange-500 " stroke-width="4" />
							</div>
							Client KYC Documents
						</Field.Legend>
						<Field.Group class="space-y-4">
							<div class="grid gap-4 xl:grid-cols-2">
								<div class="space-y-4">
									<div class="flex items-center gap-4">
										<span
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
										>
											1
										</span>

										<Field.Field class="w-full">
											{#if uploadedFiles.passportFile}
												<h3 class="text-sm font-medium">Passport</h3>

												<div
													class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
												>
													<div class="flex items-center gap-3">
														<FileText class="h-10 w-10 text-orange-500" />
														<div class="flex flex-col">
															<span class="text-sm font-medium"
																>{uploadedFiles.passportFile.name}</span
															>
															<span class="text-xs text-muted-foreground"
																>{formatFileSize(uploadedFiles.passportFile.size)}</span
															>
														</div>
													</div>
													<button
														type="button"
														onclick={() => removeFile('passportFile')}
														class="text-destructive hover:text-destructive/80"
													>
														<Trash2 class="h-5 w-5" />
													</button>
												</div>
											{:else}
												<label
													for="passportFile"
													class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
												>
													<Upload class="h-5 w-5 text-gray-600" />
													<span class="text-sm font-medium">Upload Passport</span>
												</label>
											{/if}
											<Input
												id="passportFile"
												class="sr-only"
												{...createSale.fields.passportFile.as('file')}
												files={undefined}
												accept=".pdf,image/*"
												onchange={(e) => handleFileUpload('passportFile', e)}
											/>
											{#each createSale.fields.passportFile.issues() as issue, i (i)}
												<Field.Error class="text-sm text-destructive">
													{issue.message}
												</Field.Error>
											{/each}
										</Field.Field>
									</div>

									<div class="flex items-center gap-4">
										<span
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
										>
											2
										</span>
										<Field.Field class="w-full">
											{#if uploadedFiles.nationalIdFile}
												<h3 class="text-sm font-medium">National ID</h3>

												<div
													class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
												>
													<div class="flex items-center gap-3">
														<FileText class="h-10 w-10 text-orange-500" />
														<div class="flex flex-col">
															<span class="text-sm font-medium"
																>{uploadedFiles.nationalIdFile.name}</span
															>
															<span class="text-xs text-muted-foreground"
																>{formatFileSize(uploadedFiles.nationalIdFile.size)}</span
															>
														</div>
													</div>
													<button
														type="button"
														onclick={() => removeFile('nationalIdFile')}
														class="text-destructive hover:text-destructive/80"
													>
														<Trash2 class="h-5 w-5" />
													</button>
												</div>
											{:else}
												<label
													for="nationalIdFile"
													class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
												>
													<Upload class="h-5 w-5 text-gray-600" />
													<span class="text-sm font-medium">
														Upload National ID <br />(Emirates ID/Aadhar)
													</span>
												</label>
											{/if}
											<Input
												id="nationalIdFile"
												class="sr-only"
												{...createSale.fields.nationalIdFile.as('file')}
												files={undefined}
												accept=".pdf,image/*"
												onchange={(e) => handleFileUpload('nationalIdFile', e)}
											/>
											{#each createSale.fields.nationalIdFile.issues() as issue, i (i)}
												<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
											{/each}
										</Field.Field>
									</div>
								</div>
								<div class="flex w-full flex-col items-center gap-4">
									<div class="flex w-full flex-row gap-4">
										<span
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
										>
											3
										</span>
										<p class="text-sm font-medium">AML Form</p>
									</div>

									<Button variant="outline" type="button" class="w-full bg-orange-50/40">
										<PlusRound class="h-4 w-4" />
										Generate Now
									</Button>
								</div>
							</div>
						</Field.Group>
					</Field.Set>
				</Field.Set>
				<Field.Separator />

				<Field.Separator />
				<!-- Project Details Section -->
				<Field.Set>
					<Field.Legend class="text-lg font-medium">Project Details</Field.Legend>

					<Field.Group>
						<div class="grid grid-cols-3 gap-4">
							<Field.Field id="dealType">
								<Select.Root
									type="single"
									value={createSale.fields.dealType.value() ?? ''}
									onValueChange={(v) =>
										createSale.fields.dealType.set(v as 'off-plan' | 'on-plan' | 'resell')}
								>
									<Select.Trigger id="dealype">
										<div class="flex items-center gap-2">
											<Traffic />
											{dealTypeLabel}
										</div>
									</Select.Trigger>
									<Select.Content>
										{#each dealTypes as dealType (dealType.value)}
											<Select.Item {...dealType} />
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...createSale.fields.dealType.as('text')} />
								{#each createSale.fields.dealType.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field id="developer">
								<Select.Root
									type="single"
									value={createSale.fields.developer.value() ?? ''}
									onValueChange={(v) => createSale.fields.developer.set(v as string)}
								>
									<Select.Trigger id="developer">
										<div class="flex items-center gap-2">
											<Hammer />
											{developerLabel}
										</div>
									</Select.Trigger>
									<Select.Content>
										{#each developers as developer (developer.value)}
											<Select.Item {...developer} />
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...createSale.fields.developer.as('text')} />
								{#each createSale.fields.developer.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<InputGroup.Root id="property">
									<InputGroup.Input
										{...createSale.fields.property.as('text')}
										placeholder="Select Property"
									/>
									<InputGroup.Addon>
										<Building />
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each createSale.fields.property.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<Field.Field>
								<InputGroup.Root id="unitNo">
									<InputGroup.Input
										{...createSale.fields.unitNo.as('text')}
										placeholder="Unit No"
									/>
									<InputGroup.Addon>
										<Home />
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each createSale.fields.unitNo.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<InputGroup.Root id="unitValue">
									<InputGroup.Input
										{...createSale.fields.unitValue.as('text')}
										placeholder="Unit Value"
									/>
									<InputGroup.Addon>
										<PriceTag />
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each createSale.fields.unitValue.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						</div>
					</Field.Group>
				</Field.Set>
				<Field.Separator />
				<Field.Set>
					<Field.Legend class="flex items-center gap-4 text-lg font-medium">
						Deal Status
					</Field.Legend>
					{#each createSale.fields.dealStage.issues() as issue, i (i)}
						<Field.Error class="text-sm text-destructive">
							{issue.message}
						</Field.Error>
					{/each}
					<Field.Group class="space-y-4">
						<RadioGroup.Root
							bind:value={
								() => createSale.fields.dealStage.value() ?? '',
								(v) => createSale.fields.dealStage.set(v ?? '')
							}
							class="flex w-full flex-row gap-4"
						>
							<div class="flex w-full flex-col gap-2">
								<Field.Field orientation="horizontal">
									<RadioGroup.Item value="eoi" id="deal-eoi" />
									<Field.Label for="deal-eoi" class="font-normal">EOI</Field.Label>
								</Field.Field>
								<Field.Field>
									<DealPercentage
										bind:value={
											() => createSale.fields.paymentValue.value() ?? 0,
											(v) => createSale.fields.paymentValue.set(Number(v) || 0)
										}
										disabled={createSale.fields.dealStage.value() !== 'eoi'}
									/>
									<input class="sr-only" {...createSale.fields.paymentValue.as('number')} />
									{#each createSale.fields.paymentValue.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
								<Field.Field class="w-full">
									{#if uploadedFiles.bookingFormFile}
										<h3 class="text-sm font-medium">Booking Form</h3>

										<div
											class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
										>
											<div class="flex items-center gap-3">
												<FileText class="h-10 w-10 text-orange-500" />
												<div class="flex flex-col">
													<span class="text-sm font-medium"
														>{uploadedFiles.bookingFormFile.name}</span
													>
													<span class="text-xs text-muted-foreground"
														>{formatFileSize(uploadedFiles.bookingFormFile.size)}</span
													>
												</div>
											</div>
											<button
												type="button"
												onclick={() => removeFile('bookingFormFile')}
												class="text-destructive hover:text-destructive/80"
											>
												<Trash2 class="h-5 w-5" />
											</button>
										</div>
									{:else}
										<label
											for="bookingFormFile"
											class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
										>
											<Upload class="h-5 w-5 text-gray-600" />
											<span class="text-sm font-medium">Upload booking form</span>
										</label>
									{/if}
									<Input
										id="bookingFormFile"
										class="sr-only"
										{...createSale.fields.bookingFormFile.as('file')}
										files={undefined}
										accept=".pdf,image/*"
										onchange={(e) => handleFileUpload('bookingFormFile', e)}
									/>
									{#each createSale.fields.bookingFormFile.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">
											{issue.message}
										</Field.Error>
									{/each}
								</Field.Field><Field.Field class="w-full">
									{#if uploadedFiles.paymentReceiptFile}
										<h3 class="text-sm font-medium">Payment Receipt</h3>

										<div
											class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
										>
											<div class="flex items-center gap-3">
												<FileText class="h-10 w-10 text-orange-500" />
												<div class="flex flex-col">
													<span class="text-sm font-medium"
														>{uploadedFiles.paymentReceiptFile.name}</span
													>
													<span class="text-xs text-muted-foreground"
														>{formatFileSize(uploadedFiles.paymentReceiptFile.size)}</span
													>
												</div>
											</div>
											<button
												type="button"
												onclick={() => removeFile('paymentReceiptFile')}
												class="text-destructive hover:text-destructive/80"
											>
												<Trash2 class="h-5 w-5" />
											</button>
										</div>
									{:else}
										<label
											for="paymentReceiptFile"
											class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
										>
											<Upload class="h-5 w-5 text-gray-600" />
											<span class="text-sm font-medium">Upload payment receipt</span>
										</label>
									{/if}
									<Input
										id="paymentReceiptFile"
										class="sr-only"
										{...createSale.fields.paymentReceiptFile.as('file')}
										files={undefined}
										accept=".pdf,image/*"
										onchange={(e) => handleFileUpload('paymentReceiptFile', e)}
									/>
									{#each createSale.fields.paymentReceiptFile.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">
											{issue.message}
										</Field.Error>
									{/each}
								</Field.Field>
							</div>
							<HorizontalSeparator text="OR" class="mx-4" />
							<div class="flex w-full flex-col gap-2">
								<Field.Field orientation="horizontal">
									<RadioGroup.Item value="booking" id="deal-booking" />
									<Field.Label for="deal-booking" class="font-normal">Booking Stage</Field.Label>
								</Field.Field>
								<Field.Field>
									<DealPercentage
										bind:value={
											() => createSale.fields.paymentValue.value() ?? 0,
											(v) => createSale.fields.paymentValue.set(Number(v) || 0)
										}
										disabled={createSale.fields.dealStage.value() !== 'booking'}
									/>
									{#each createSale.fields.paymentValue.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
							</div>
						</RadioGroup.Root>
						<input class="sr-only" {...createSale.fields.dealStage.as('text')} />
					</Field.Group>
				</Field.Set>
				<Field.Separator />
				<Field.Set>
					<Field.Legend class="flex items-center gap-4 text-lg font-medium">
						Refferal Agreement
					</Field.Legend>
					<Field.Group class="space-y-4">
						<Button variant="outline" type="button" class="w-xs bg-orange-50/40">
							<PlusRound class="h-4 w-4" />
							Generate Referral Agreement
						</Button>
					</Field.Group>
				</Field.Set>

				<Field.Separator />
				<!-- Invoicing Stage Section -->

				<Field.Set>
					<Field.Legend class="text-lg font-medium">Invoicing Stage</Field.Legend>

					<RadioGroup.Root
						class="flex w-full flex-row justify-around"
						bind:value={
							() => createSale.fields.invoiceStage.value() ?? 'eligible-first-half',
							(v) => createSale.fields.invoiceStage.set(v ?? 'eligible-first-half')
						}
					>
						<Field.Field orientation="horizontal">
							<RadioGroup.Item value="eligible-first-half" id="eligible-first-half" />
							<div class="flex flex-col gap-1">
								<Field.Label for="eligible-first-half" class="text-sm font-normal">
									Eligible for first half
								</Field.Label>
								<span class="text-sm text-muted-foreground">10 + 4% paid</span>
							</div>
						</Field.Field>
						<Field.Field orientation="horizontal">
							<RadioGroup.Item value="eligible-second-half" id="eligible-second-half" />
							<div class="flex flex-col gap-1">
								<Field.Label for="eligible-second-half" class="text-sm font-normal">
									Eligible for second half
								</Field.Label>
								<span class="text-sm text-muted-foreground">20 + 4% paid</span>
							</div>
						</Field.Field>
						<Field.Field orientation="horizontal">
							<RadioGroup.Item value="eligible-full" id="eligible-full" />
							<div class="flex flex-col gap-1">
								<Field.Label for="eligible-full" class="text-sm font-normal">
									Eligible for full
								</Field.Label>
								<span class="text-sm text-muted-foreground">20 + 4% paid</span>
							</div>
						</Field.Field>
					</RadioGroup.Root>
					<input class="sr-only" {...createSale.fields.invoiceStage.as('text')} />
				</Field.Set>

				<Field.Set>
					<Field.Legend
						class={[
							'flex items-center justify-between text-lg font-medium',
							{
								'flex-wrap gap-2 sm:flex-nowrap': splitRemaining !== 0
							}
						]}
					>
						<span>Deal Owners</span>
						<span
							class={[
								'ml-4 text-right text-sm',
								{
									'text-muted-foreground': splitRemaining === 0,
									'text-destructive': splitRemaining !== 0
								}
							]}
						>
							{splitRemaining === 0
								? 'Split totals 100%'
								: splitRemaining > 0
									? `Remaining ${splitRemaining.toFixed(0)}%`
									: `Over by ${Math.abs(splitRemaining).toFixed(0)}%`}
						</span>
					</Field.Legend>

					<div class="space-y-3 rounded-xl border border-border/60 bg-background/60">
						<div
							class="grid grid-cols-[minmax(0,1.6fr)_140px_40px] items-center gap-4 rounded-t-xl bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground"
						>
							<span>Owners</span>
							<span class="text-right">Split %</span>
							<span></span>
						</div>

						{#each dealOwners as owner, index (owner.key)}
							<div
								class="grid grid-cols-[minmax(0,1.6fr)_140px_40px] items-center gap-4 border-t border-border/40 px-4 py-3"
							>
								<div class="flex min-w-0 items-center gap-3 md:gap-4">
									<Avatar.Root
										class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase"
									>
										{#if owner.photoURL}
											<Avatar.Image src={owner.photoURL} alt={owner.name || owner.email} />
										{/if}
										<Avatar.Fallback>{owner.name?.[0] || owner.email?.[0] || 'A'}</Avatar.Fallback>
									</Avatar.Root>
									<div class="min-w-0 flex-1 space-y-1">
										<Select.Root
											type="single"
											value={owner.userId}
											onValueChange={(value) => handleOwnerSelect(owner.key, value)}
										>
											<Select.Trigger class="w-full justify-between">
												<div class="flex flex-row items-center gap-2 text-left">
													<span class="truncate text-sm leading-tight font-medium">
														{owner.userId === firekitUser.uid ? 'You' : owner.name || 'Add owner'}
													</span>
													<span class="truncate text-xs leading-tight text-muted-foreground">
														{owner.email || 'Select an agent to auto-fill email'}
													</span>
												</div>
											</Select.Trigger>
											<Select.Content class="max-h-64 overflow-y-auto">
												{#if users.loading}
													<Select.Item value="loading" disabled>Loading owners...</Select.Item>
												{:else if ownerOptions.length === 0}
													<Select.Item value="empty" disabled>No owners found</Select.Item>
												{:else}
													{#each ownerOptions as user (user.id)}
														<Select.Item value={user.id}>
															<div class="flex flex-col text-left">
																<span class="text-sm font-medium">
																	{user.displayName ?? user.email ?? 'Owner'}
																</span>
																{#if user.email}
																	<span class="text-xs text-muted-foreground">{user.email}</span>
																{/if}
															</div>
														</Select.Item>
													{/each}
												{/if}
											</Select.Content>
										</Select.Root>
										<input
											class="sr-only"
											{...createSale.fields.dealOwners[index]?.userId.as('text')}
											value={owner.userId}
										/>
										<input
											class="sr-only"
											{...createSale.fields.dealOwners[index]?.email.as('email')}
											value={owner.email}
										/>
										{#each createSale.fields.dealOwners[index]?.userId.issues() ?? [] as issue, i (i)}
											<Field.Error class="text-xs text-destructive">{issue.message}</Field.Error>
										{/each}
										{#each createSale.fields.dealOwners[index]?.email.issues() ?? [] as issue, i (i)}
											<Field.Error class="text-xs text-destructive">{issue.message}</Field.Error>
										{/each}
									</div>
								</div>

								<div class="flex items-center justify-end gap-2">
									<Input
										{...createSale.fields.dealOwners[index]?.split.as('number')}
										class="h-10   w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
										type="number"
										min="0"
										max="100"
										step="1"
										value={owner.split}
										oninput={(event) =>
											handleSplitChange(owner.key, (event.target as HTMLInputElement).value)}
									/>
									{#each createSale.fields.dealOwners[index]?.split.issues() ?? [] as issue, i (i)}
										<Field.Error class="col-span-2 text-xs text-destructive"
											>{issue.message}</Field.Error
										>
									{/each}
								</div>

								<div class="flex items-center justify-end">
									{#if dealOwners.length > 1}
										<Button
											type="button"
											variant="ghost"
											size="icon"
											class="text-muted-foreground"
											onclick={() => removeDealOwner(owner.key)}
											aria-label="Remove owner"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							</div>
						{/each}

						<div class="flex items-center justify-between border-t border-border/40 px-4 py-3">
							<Button type="button" variant="outline" class="gap-2" onclick={addDealOwner}>
								<Plus class="h-4 w-4" />
								Add another agent
							</Button>
							<div class="text-sm text-muted-foreground">
								<span class={splitRemaining === 0 ? 'text-emerald-600' : 'text-destructive'}>
									{splitRemaining === 0
										? 'Ready to submit'
										: splitRemaining > 0
											? `Allocate ${splitRemaining.toFixed(0)}% more`
											: `Reduce ${Math.abs(splitRemaining).toFixed(0)}%`}
								</span>
							</div>
						</div>
					</div>
				</Field.Set>
				<!-- Joint Buyers -->
				<Field.Set>
					<Field.Legend class="text-lg font-medium">Joint Buyers</Field.Legend>

					{#each jointBuyers as buyer, index (buyer.key)}
						<div
							class="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/80 p-4"
						>
							<div class="flex items-center justify-between">
								<p class="text-base font-semibold">Buyer {index + 2} details</p>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => removeJointBuyer(buyer.key)}
									aria-label="Remove joint buyer"
								>
									<X class="h-4 w-4" />
								</Button>
							</div>
							<Field.Group>
								<div class="grid grid-cols-3 gap-4">
									<Field.Field>
										<Input name={`jointBuyers[${index}].firstName`} placeholder="First Name" />
									</Field.Field>
									<Field.Field>
										<Input name={`jointBuyers[${index}].lastName`} placeholder="Last Name" />
									</Field.Field>
									<Field.Field>
										<Input name={`jointBuyers[${index}].email`} placeholder="Email" type="email" />
									</Field.Field>
								</div>

								<div class="flex gap-2">
									<Input class="w-32" disabled value="+971" />
									<Field.Field class="flex-1">
										<Input
											name={`jointBuyers[${index}].phone`}
											placeholder="00000 00000"
											type="tel"
										/>
									</Field.Field>
								</div>
							</Field.Group>

							<Field.Set>
								<Field.Legend class="flex items-center gap-4 text-lg font-medium">
									<div
										class="grid h-8 w-8 place-items-center rounded-lg border border-white/5 bg-orange-100 p-0"
									>
										<Upload class="h-4 w-4 text-orange-500 " stroke-width="4" />
									</div>
									Client KYC Document
								</Field.Legend>
								<Field.Group class="space-y-4">
									<div class="grid gap-4 xl:grid-cols-2">
										<div class="space-y-4">
											<div class="flex items-center gap-4">
												<span
													class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
												>
													1
												</span>
												<Field.Field class="w-full">
													{#if jointBuyerFiles[buyer.key]?.passportFile}
														<h3 class="text-sm font-medium">Passport</h3>
														<div
															class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
														>
															<div class="flex items-center gap-3">
																<FileText class="h-10 w-10 text-orange-500" />
																<div class="flex flex-col">
																	<span class="text-sm font-medium"
																		>{jointBuyerFiles[buyer.key]?.passportFile?.name ?? ''}</span
																	>
																	<span class="text-xs text-muted-foreground"
																		>{jointBuyerFiles[buyer.key]?.passportFile
																			? formatFileSize(
																					jointBuyerFiles[buyer.key]?.passportFile?.size ?? 0
																				)
																			: ''}</span
																	>
																</div>
															</div>
															<button
																type="button"
																onclick={() => removeJointBuyerFile(buyer.key, 'passportFile')}
																class="text-destructive hover:text-destructive/80"
															>
																<Trash2 class="h-5 w-5" />
															</button>
														</div>
													{:else}
														<label
															for={`joint-passportFile-${buyer.key}`}
															class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
														>
															<Upload class="h-5 w-5 text-gray-600" />
															<span class="text-sm font-medium">Upload Passport</span>
														</label>
													{/if}
													<Input
														id={`joint-passportFile-${buyer.key}`}
														name={`jointBuyers[${index}].passportFile`}
														class="sr-only"
														type="file"
														accept=".pdf,image/*"
														onchange={(e) =>
															handleJointBuyerFileUpload(buyer.key, 'passportFile', e)}
													/>
												</Field.Field>
											</div>

											<div class="flex items-center gap-4">
												<span
													class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
												>
													2
												</span>
												<Field.Field class="w-full">
													{#if jointBuyerFiles[buyer.key]?.nationalIdFile}
														<h3 class="text-sm font-medium">National ID</h3>
														<div
															class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
														>
															<div class="flex items-center gap-3">
																<FileText class="h-10 w-10 text-orange-500" />
																<div class="flex flex-col">
																	<span class="text-sm font-medium"
																		>{jointBuyerFiles[buyer.key]?.nationalIdFile?.name ?? ''}</span
																	>
																	<span class="text-xs text-muted-foreground"
																		>{jointBuyerFiles[buyer.key]?.nationalIdFile
																			? formatFileSize(
																					jointBuyerFiles[buyer.key]?.nationalIdFile?.size ?? 0
																				)
																			: ''}</span
																	>
																</div>
															</div>
															<button
																type="button"
																onclick={() => removeJointBuyerFile(buyer.key, 'nationalIdFile')}
																class="text-destructive hover:text-destructive/80"
															>
																<Trash2 class="h-5 w-5" />
															</button>
														</div>
													{:else}
														<label
															for={`joint-nationalIdFile-${buyer.key}`}
															class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
														>
															<Upload class="h-5 w-5 text-gray-600" />
															<span class="text-sm font-medium">
																Upload National ID <br />(Emirates ID/Aadhar)
															</span>
														</label>
													{/if}
													<Input
														id={`joint-nationalIdFile-${buyer.key}`}
														name={`jointBuyers[${index}].nationalIdFile`}
														class="sr-only"
														type="file"
														accept=".pdf,image/*"
														onchange={(e) =>
															handleJointBuyerFileUpload(buyer.key, 'nationalIdFile', e)}
													/>
												</Field.Field>
											</div>
										</div>

										<div class="flex w-full flex-col items-center gap-4">
											<div class="flex w-full flex-row gap-4">
												<span
													class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
												>
													3
												</span>
												<p class="text-sm font-medium">AML Form</p>
											</div>

											<Button variant="outline" type="button" class="w-full bg-orange-50/40">
												<PlusRound class="h-4 w-4" />
												Generate Now
											</Button>
										</div>
									</div>
								</Field.Group>
							</Field.Set>
						</div>
					{/each}

					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-3 text-sm font-semibold text-foreground hover:border-foreground/60"
						onclick={addJointBuyer}
					>
						<Plus class="h-4 w-4" /> Add joint buyer
					</button>
				</Field.Set>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
