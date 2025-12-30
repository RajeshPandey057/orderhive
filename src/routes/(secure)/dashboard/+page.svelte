<script lang="ts">
	import DealPercentage from '$lib/components/deal-percentage.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import HorizontalSeparator from '@/components/ui/separator/horizontal-separator.svelte';
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

	let dealType = $state<string>();
	let developer = $state<string>();
	let sheetOpen = $state(false);
	let jointBuyers = $state<{ key: number }[]>([]);
	let nextJointKey = 0;
	let dealStage = $state<'eoi' | 'booking'>('eoi');
	let paymentValue = $state<number | string>('');
	let eligibleFirstHalf = $state(false);
	let eligibleSecondHalf = $state(false);
	let eligibleFull = $state(false);

	// Track uploaded files
	let uploadedFiles = $state<Record<string, File | null>>({
		passportFile: null,
		nationalIdFile: null,
		bookingFormFile: null,
		paymentReceiptFile: null
	});

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
		jointBuyers = [...jointBuyers, { key: nextJointKey++ }];
	};

	const removeJointBuyer = (key: number) => {
		jointBuyers = jointBuyers.filter((buyer) => buyer.key !== key);
	};

	// Sync the select values with form fields
	$effect(() => {
		if (dealType) {
			createSale.fields.dealType.set(dealType as 'off-plan' | 'on-plan' | 'resell');
		}
	});

	$effect(() => {
		if (developer) {
			createSale.fields.developer.set(developer);
		}
	});

	$effect(() => {
		if (dealStage) {
			createSale.fields.dealStage.set(dealStage);
		}
	});
	$effect(() => {
		if (paymentValue) {
			createSale.fields.paymentValue.set(Number(paymentValue));
		}
	});
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
		dealTypes.find((d) => d.value === dealType)?.label ?? 'Choose deal'
	);
	const developerLabel = $derived(
		developers.find((d) => d.value === developer)?.label ?? 'Select Developer'
	);
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
	<div class="flex w-full items-center justify-between gap-2 px-4">
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<h1 class="text-2xl font-medium">Sales Tracker</h1>
		</div>
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
								dealType = undefined;
								developer = undefined;
								toast.success('Sale created successfully!');
							}
						} catch {
							toast.error('Failed to create sale');
						}
					})}
				>
					<div
						class="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6"
					>
						<Sheet.Title class="text-2xl font-medium">Add Sale</Sheet.Title>
						<div class="flex flex-row gap-2">
							<Sheet.Close class={buttonVariants({ variant: 'outline', size: 'sm' })}>
								<Pencil class="mr-2 h-4 w-4" /> Save as Draft
							</Sheet.Close>
							<Button type="submit" size="sm" disabled={!!createSale.pending}>
								<Save class="mr-2 h-4 w-4" />
								{createSale.pending ? 'Saving...' : 'Save'}
							</Button>
						</div>
					</div>

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
														<Field.Error class="text-sm text-destructive"
															>{issue.message}</Field.Error
														>
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
										<Select.Root type="single" bind:value={dealType}>
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
										<Select.Root type="single" bind:value={developer}>
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
							<Field.Group class="space-y-4">
								<RadioGroup.Root bind:value={dealStage} class="flex w-full flex-row gap-4">
									<div class="flex w-full flex-col gap-2">
										<Field.Field orientation="horizontal">
											<RadioGroup.Item value="eoi" id="deal-eoi" />
											<Field.Label for="deal-eoi" class="font-normal">EOI</Field.Label>
										</Field.Field>
										<Field.Field>
											<DealPercentage
												bind:value={paymentValue}
												onValueChange={(v) => (paymentValue = v)}
												disabled={dealStage !== 'eoi'}
											/>
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
											<Field.Label for="deal-booking" class="font-normal">Booking Stage</Field.Label
											>
										</Field.Field>
										<Field.Field>
											<DealPercentage
												bind:value={paymentValue}
												onValueChange={(v) => (paymentValue = v)}
												disabled={dealStage !== 'booking'}
											/>
											{#each createSale.fields.paymentValue.issues() as issue, i (i)}
												<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
											{/each}
										</Field.Field>
									</div>
								</RadioGroup.Root>
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
							<Field.Group class="flex flex-row items-start gap-6">
								<Field.Field orientation="horizontal">
									<Checkbox id="eligible-first-half" bind:checked={eligibleFirstHalf} />
									<div class="flex flex-col gap-1">
										<Field.Label for="eligible-first-half" class="text-sm font-normal">
											Eligible for first half
										</Field.Label>
										<span class="text-sm text-muted-foreground">10 + 4% paid</span>
									</div>
								</Field.Field>

								<Field.Field orientation="horizontal">
									<Checkbox id="eligible-second-half" bind:checked={eligibleSecondHalf} />
									<div class="flex flex-col gap-1">
										<Field.Label for="eligible-second-half" class="text-sm font-normal">
											Eligible for second half
										</Field.Label>
										<span class="text-sm text-muted-foreground">20 + 4% paid</span>
									</div>
								</Field.Field>
								<HorizontalSeparator text="OR" />
								<Field.Field orientation="horizontal">
									<Checkbox id="eligible-full" bind:checked={eligibleFull} />
									<div class="flex flex-col gap-1">
										<Field.Label for="eligible-full" class="text-sm font-normal">
											Eligible for full
										</Field.Label>
										<span class="text-sm text-muted-foreground">20 + 4% paid</span>
									</div>
								</Field.Field>
							</Field.Group>
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
												<Input
													name={`jointBuyers[${index}].email`}
													placeholder="Email"
													type="email"
												/>
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
															<label
																for={`joint-passport-${buyer.key}`}
																class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
															>
																<Upload class="h-5 w-5 text-gray-600" />
																<span class="text-sm font-medium">Upload Passport</span>
															</label>
															<Input
																id={`joint-passport-${buyer.key}`}
																name={`jointBuyers[${index}].passportFile`}
																class="sr-only"
																type="file"
																accept=".pdf,image/*"
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
															<label
																for={`joint-national-${buyer.key}`}
																class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
															>
																<Upload class="h-5 w-5 text-gray-600" />
																<span class="text-sm font-medium">
																	Upload National ID <br />(Emirates ID/Aadhar)
																</span>
															</label>
															<Input
																id={`joint-national-${buyer.key}`}
																name={`jointBuyers[${index}].nationalIdFile`}
																class="sr-only"
																type="file"
																accept=".pdf,image/*"
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
	</div>
</header>
<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
	<div class="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min"></div>
</div>
