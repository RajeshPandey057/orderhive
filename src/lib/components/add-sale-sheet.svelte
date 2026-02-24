<script lang="ts">
	import DealPercentage from '$lib/components/deal-percentage.svelte';
	import PhoneInput from '$lib/components/phone-input.svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import CalendarComponent from '$lib/components/ui/calendar/calendar.svelte';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import HorizontalSeparator from '@/components/ui/separator/horizontal-separator.svelte';
	import { type DateValue } from '@internationalized/date';
	import { parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js';
	import { firekitCollection, firekitUser } from 'svelte-firekit';
	import { toast } from 'svelte-sonner';
	import Building from '~icons/lucide/building';
	import PlusRound from '~icons/lucide/circle-fading-plus';
	import Upload from '~icons/lucide/cloud-upload';
	import FileText from '~icons/lucide/file-text';
	import Hammer from '~icons/lucide/hammer';
	import Home from '~icons/lucide/home';
	import Loader2 from '~icons/lucide/loader-2';
	import Pencil from '~icons/lucide/pencil';
	import Plus from '~icons/lucide/plus';
	import Save from '~icons/lucide/save';
	import PriceTag from '~icons/lucide/tag';
	import Traffic from '~icons/lucide/traffic-cone';
	import Trash2 from '~icons/lucide/trash-2';
	import X from '~icons/lucide/x';
	import { generateAmlForm } from '../../routes/(secure)/agent/sales-tracker/aml.remote.js';
	import { createSale } from '../../routes/(secure)/agent/sales-tracker/sales.remote';

	let sheetOpen = $state(false);
	let jointBuyers = $state<{ key: number }[]>([]);
	let nextJointKey = 0;
	let nextOwnerKey = 0;
	let tentativeEligibilityDate = $state<DateValue | undefined>(undefined);
	let popoverOpen = $state(false);

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
				name: owner.name,
				photoURL: owner.photoURL || '',
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
		amlFormFile: null,
		bookingFormFile: null,
		paymentReceiptFile: null,
		refferalAgreementFile: null
	});

	// Track uploaded files for joint buyers
	let jointBuyerFiles = $state<
		Record<
			number,
			{ passportFile: File | null; nationalIdFile: File | null; amlFormFile: File | null }
		>
	>({});

	// Track phone countries and values for joint buyers
	let jointBuyerPhoneCountries = $state<Record<number, string>>({});
	let jointBuyerPhoneValues = $state<Record<number, string>>({});
	let clientPhoneCountry = $state<string>('AE');
	let clientPhoneValue = $state<string>('');

	// Track AML generation state
	let amlGenerating = $state<Record<string, boolean>>({
		primary: false
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
		const newKey = nextJointKey++;
		jointBuyers = [...jointBuyers, { key: newKey }];
		jointBuyerFiles[newKey] = { passportFile: null, nationalIdFile: null, amlFormFile: null };
		jointBuyerPhoneCountries[newKey] = 'AE';
		jointBuyerPhoneValues[newKey] = '';
		amlGenerating[`joint-${newKey}`] = false;
	};

	const removeJointBuyer = (key: number) => {
		jointBuyers = jointBuyers.filter((buyer) => buyer.key !== key);
		delete jointBuyerFiles[key];
		delete jointBuyerPhoneCountries[key];
		delete jointBuyerPhoneValues[key];
	};

	function getE164number(phoneValue: string, phoneCountry: string): string {
		if (!phoneValue.trim()) return '';
		try {
			const parsed = parsePhoneNumberWithError(phoneValue, phoneCountry as CountryCode);
			return parsed?.format('E.164') || '';
		} catch {
			return '';
		}
	}

	const handleJointBuyerFileUpload = (
		buyerKey: number,
		fieldName: 'passportFile' | 'nationalIdFile' | 'amlFormFile',
		event: Event
	) => {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			if (!jointBuyerFiles[buyerKey]) {
				jointBuyerFiles[buyerKey] = { passportFile: null, nationalIdFile: null, amlFormFile: null };
			}
			jointBuyerFiles[buyerKey][fieldName] = input.files[0];
		}
	};

	const removeJointBuyerFile = (
		buyerKey: number,
		fieldName: 'passportFile' | 'nationalIdFile' | 'amlFormFile'
	) => {
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

	const saleTypes = [
		{ value: 'off-plan', label: 'Off Plan' },
		{ value: 'secondary', label: 'Secondary' }
	];
	const developers = [
		{ value: 'al-wasl', label: 'Al Wasl' },
		{ value: 'aldar', label: 'Aldar' },
		{ value: 'alef', label: 'Alef' },
		{ value: 'arada', label: 'Arada' },
		{ value: 'ayat', label: 'Ayat' },
		{ value: 'azizi', label: 'Azizi' },
		{ value: 'binghatti', label: 'Binghatti' },
		{ value: 'damac', label: 'Damac' },
		{ value: 'danube', label: 'Danube' },
		{ value: 'deyaar', label: 'Deyaar' },
		{ value: 'dgm-vision', label: 'Dgm Vision' },
		{ value: 'dubai-properties', label: 'Dubai Properties' },
		{ value: 'dubai-south', label: 'Dubai South' },
		{ value: 'dvm-properties', label: 'DVM Properties' },
		{ value: 'ellington', label: 'Ellington' },
		{ value: 'emaar', label: 'Emaar' },
		{ value: 'expo', label: 'Expo' },
		{ value: 'london-gate', label: 'London Gate' },
		{ value: 'majid-al-futtaim', label: 'Majid Al Futtaim' },
		{ value: 'meraas', label: 'Meraas' },
		{ value: 'refine', label: 'Refine' },
		{ value: 'reportage', label: 'Reportage' },
		{ value: 'siroya', label: 'Siroya' },
		{ value: 'sobha', label: 'Sobha' },
		{ value: 'stella', label: 'Stella' },
		{ value: 'townx', label: 'TownX' },
		{ value: 'union-properties', label: 'Union Properties' },
		{ value: 'urban', label: 'Urban' },
		{ value: 'vision', label: 'Vision' },
		{ value: 'zaya', label: 'Zaya' }
	];
	const propertyTypes = [
		{ value: 'apartment', label: 'Apartment' },
		{ value: 'townhouse', label: 'Townhouse' },
		{ value: 'villa', label: 'Villa' },
		{ value: 'commercial', label: 'Commercial' },
		{ value: 'plot', label: 'Plot' }
	];

	const apartmentBedrooms = [
		{ value: 'studio', label: 'Studio' },
		{ value: '1bed', label: '1 Bed' },
		{ value: '2bed', label: '2 Bed' },
		{ value: '2bed+maid', label: '2 Bed + Maid' },
		{ value: '3bed', label: '3 Bed' },
		{ value: '3bed+maid', label: '3 Bed + Maid' },
		{ value: '4bed', label: '4 Bed' },
		{ value: 'duplex', label: 'Duplex' },
		{ value: 'penthouse', label: 'Penthouse' },
		{ value: 'podium-townhouse', label: 'Podium Townhouse' }
	];

	const townhouseVillaBedrooms = [
		{ value: '2bed', label: '2 Bed' },
		{ value: '3bed', label: '3 Bed' },
		{ value: '4bed', label: '4 Bed' },
		{ value: '5bed', label: '5 Bed' },
		{ value: '6-7bed', label: '6/7 Bed' }
	];

	const commercialSubTypes = [
		{ value: 'office', label: 'Office Space' },
		{ value: 'warehouse', label: 'Warehouse' }
	];

	const saleTypeLabel = $derived(
		saleTypes.find((d) => d.value === createSale.fields.saleType.value())?.label ?? 'Deal'
	);
	const developerLabel = $derived(
		developers.find((d) => d.value === createSale.fields.developer.value())?.label ?? 'Developer'
	);
	const propertyTypeLabel = $derived(
		propertyTypes.find((p) => p.value === createSale.fields.propertyType.value())?.label ??
			'Property Type'
	);
	const bedroomTypeLabel = $derived(
		[...apartmentBedrooms, ...townhouseVillaBedrooms].find(
			(b) => b.value === createSale.fields.bedroomType.value()
		)?.label ?? 'Bedrooms'
	);
	const commercialSubTypeLabel = $derived(
		commercialSubTypes.find((c) => c.value === createSale.fields.commercialSubType.value())
			?.label ?? 'Commercial Type'
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
							<Field.Field>
								<PhoneInput
									bind:value={clientPhoneValue}
									bind:country={clientPhoneCountry}
									showCountrySelect={true}
								/>
							</Field.Field>
							<input
								type="hidden"
								name="phone"
								value={getE164number(clientPhoneValue, clientPhoneCountry) || ''}
							/>
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
											accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
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
													Upload National ID <br />(Emirates ID)
												</span>
											</label>
										{/if}
										<Input
											id="nationalIdFile"
											class="sr-only"
											{...createSale.fields.nationalIdFile.as('file')}
											files={undefined}
											accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
											onchange={(e) => handleFileUpload('nationalIdFile', e)}
										/>
										{#each createSale.fields.nationalIdFile.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
								</div>

								<div class="col-span-2 flex w-full flex-col items-center gap-4">
									<div class="flex w-full flex-row gap-4">
										<span
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
										>
											3
										</span>
										<p class="text-sm font-medium">AML Form</p>
									</div>

									{#if uploadedFiles.amlFormFile}
										<div
											class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
										>
											<div class="flex items-center gap-3">
												<FileText class="h-10 w-10 text-orange-500" />
												<div class="flex flex-col">
													<span class="text-sm font-medium">{uploadedFiles.amlFormFile.name}</span>
													<span class="text-xs text-muted-foreground"
														>{formatFileSize(uploadedFiles.amlFormFile.size)}</span
													>
												</div>
											</div>
											<button
												type="button"
												onclick={() => removeFile('amlFormFile')}
												class="text-destructive hover:text-destructive/80"
											>
												<Trash2 class="h-5 w-5" />
											</button>
										</div>
									{:else}
										<div class="flex w-full flex-row gap-2">
											<Button
												variant="outline"
												type="button"
												class="flex-1 bg-orange-50/40"
												disabled={amlGenerating.primary}
												onclick={async () => {
													// Validate required fields
													const firstName = createSale.fields.firstName.value();
													const lastName = createSale.fields.lastName.value();
													const email = createSale.fields.email.value();
													const phone = getE164number(clientPhoneValue, clientPhoneCountry);

													if (!firstName || !lastName || !email || !phone) {
														toast.error(
															'Please fill in buyer name, email, and phone before generating AML form'
														);
														return;
													}

													amlGenerating.primary = true;
													toast.info('Generating and sending AML form...');

													try {
														const result = await generateAmlForm({
															firstName,
															lastName,
															email,
															phone,
															buyerType: 'primary' as const
														});

														if (result?.success && result?.file) {
															// Create File object from uploaded data
															const fileObj = new File([], result.file.name, {
																type: result.file.contentType,
																lastModified: result.file.lastModified
															});

															uploadedFiles.amlFormFile = fileObj;
															toast.success(
																`AML form generated and sent to ${email} for signature`
															);
														} else {
															toast.error(result?.error || 'Failed to generate AML form');
														}
													} catch (err) {
														toast.error('Failed to generate AML form');
														console.error('AML generation error:', err);
													} finally {
														amlGenerating.primary = false;
													}
												}}
											>
												{#if amlGenerating.primary}
													<Loader2 class="h-4 w-4 animate-spin" />
													Generating...
												{:else}
													<PlusRound class="h-4 w-4" />
													Generate Now
												{/if}
											</Button>
											<span class="self-center text-center text-xs text-muted-foreground">or</span>
											<label
												for="amlFormFile"
												class=" flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
											>
												<Upload class="h-5 w-5 text-gray-600" />
												<span class="text-sm font-medium">Upload manually</span>
											</label>
										</div>
									{/if}
									<Input
										id="amlFormFile"
										class="sr-only"
										{...createSale.fields.amlFormFile.as('file')}
										files={undefined}
										accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
										onchange={(e) => handleFileUpload('amlFormFile', e)}
									/>
								</div>
							</div>
						</Field.Group>
					</Field.Set>
				</Field.Set>
				<Field.Separator />

				<!-- Project Details Section -->
				<Field.Set>
					<Field.Legend class="text-lg font-medium">Project Details</Field.Legend>

					<Field.Group>
						<div class="grid grid-cols-3 gap-4">
							<Field.Field id="saleType">
								<Select.Root
									type="single"
									value={createSale.fields.saleType.value() ?? ''}
									onValueChange={(v) =>
										createSale.fields.saleType.set(v as 'off-plan' | 'secondary')}
								>
									<Select.Trigger id="dealype">
										<div class="flex items-center gap-2">
											<Traffic />
											{saleTypeLabel}
										</div>
									</Select.Trigger>
									<Select.Content>
										{#each saleTypes as saleType (saleType.value)}
											<Select.Item {...saleType} />
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...createSale.fields.saleType.as('text')} />
								{#each createSale.fields.saleType.issues() as issue, i (i)}
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

							<Field.Field id="propertyType">
								<Select.Root
									type="single"
									value={createSale.fields.propertyType.value() ?? ''}
									onValueChange={(v) =>
										createSale.fields.propertyType.set(
											v as 'apartment' | 'townhouse' | 'villa' | 'commercial' | 'plot'
										)}
								>
									<Select.Trigger id="propertyType">
										<div class="flex items-center gap-2">
											<Building />
											{propertyTypeLabel}
										</div>
									</Select.Trigger>
									<Select.Content>
										{#each propertyTypes as propertyType (propertyType.value)}
											<Select.Item {...propertyType} />
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...createSale.fields.propertyType.as('text')} />
								{#each createSale.fields.propertyType.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						</div>

						<!-- Conditional Fields Based on Property Type -->
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<!-- Apartment Fields -->
							{#if createSale.fields.propertyType.value() === 'apartment'}
								<Field.Field id="bedroomType">
									<Select.Root
										type="single"
										value={createSale.fields.bedroomType.value() ?? ''}
										onValueChange={(v) =>
											createSale.fields.bedroomType.set(
												v as unknown as NonNullable<
													Parameters<typeof createSale.fields.bedroomType.set>[0]
												>
											)}
									>
										<Select.Trigger id="bedroomType">
											<div class="flex items-center gap-2">
												<Home />
												{bedroomTypeLabel}
											</div>
										</Select.Trigger>
										<Select.Content>
											{#each apartmentBedrooms as bedroom (bedroom.value)}
												<Select.Item {...bedroom} />
											{/each}
										</Select.Content>
									</Select.Root>
									<input type="hidden" {...createSale.fields.bedroomType.as('text')} />
									{#each createSale.fields.bedroomType.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
								<Field.Field>
									<InputGroup.Root id="propertySize">
										<InputGroup.Input
											{...createSale.fields.propertySize.as('number')}
											placeholder="Property Size"
										/>
										<InputGroup.Addon>
											<span class="text-xs">Sqft</span>
										</InputGroup.Addon>
									</InputGroup.Root>
									{#each createSale.fields.propertySize.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
							{/if}

							<!-- Townhouse/Villa Fields -->
							{#if createSale.fields.propertyType.value() === 'townhouse' || createSale.fields.propertyType.value() === 'villa'}
								<Field.Field id="bedroomType">
									<Select.Root
										type="single"
										value={createSale.fields.bedroomType.value() ?? ''}
										onValueChange={(v) =>
											createSale.fields.bedroomType.set(
												v as unknown as NonNullable<
													Parameters<typeof createSale.fields.bedroomType.set>[0]
												>
											)}
									>
										<Select.Trigger id="bedroomType">
											<div class="flex items-center gap-2">
												<Home />
												{bedroomTypeLabel}
											</div>
										</Select.Trigger>
										<Select.Content>
											{#each townhouseVillaBedrooms as bedroom (bedroom.value)}
												<Select.Item {...bedroom} />
											{/each}
										</Select.Content>
									</Select.Root>
									<input type="hidden" {...createSale.fields.bedroomType.as('text')} />
									{#each createSale.fields.bedroomType.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
								<Field.Field>
									<InputGroup.Root id="plotArea">
										<InputGroup.Input
											{...createSale.fields.plotArea.as('number')}
											placeholder="Plot Area"
										/>
										<InputGroup.Addon>
											<span class="text-xs">Sqft</span>
										</InputGroup.Addon>
									</InputGroup.Root>
									{#each createSale.fields.plotArea.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
								<Field.Field>
									<InputGroup.Root id="builtUpArea">
										<InputGroup.Input
											{...createSale.fields.builtUpArea.as('number')}
											placeholder="Built Up Area"
										/>
										<InputGroup.Addon>
											<span class="text-xs">Sqft</span>
										</InputGroup.Addon>
									</InputGroup.Root>
									{#each createSale.fields.builtUpArea.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
							{/if}

							<!-- Commercial Fields -->
							{#if createSale.fields.propertyType.value() === 'commercial'}
								<Field.Field id="commercialSubType">
									<Select.Root
										type="single"
										value={createSale.fields.commercialSubType.value() ?? ''}
										onValueChange={(v) =>
											createSale.fields.commercialSubType.set(v as 'office' | 'warehouse')}
									>
										<Select.Trigger id="commercialSubType">
											<div class="flex items-center gap-2">
												<Building />
												{commercialSubTypeLabel}
											</div>
										</Select.Trigger>
										<Select.Content>
											{#each commercialSubTypes as subType (subType.value)}
												<Select.Item {...subType} />
											{/each}
										</Select.Content>
									</Select.Root>
									<input type="hidden" {...createSale.fields.commercialSubType.as('text')} />
									{#each createSale.fields.commercialSubType.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
								<Field.Field>
									<InputGroup.Root id="propertySize">
										<InputGroup.Input
											{...createSale.fields.propertySize.as('number')}
											placeholder="Property Size"
										/>
										<InputGroup.Addon>
											<span class="text-xs">Sqft</span>
										</InputGroup.Addon>
									</InputGroup.Root>
									{#each createSale.fields.propertySize.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
								{#if createSale.fields.commercialSubType.value() === 'warehouse'}
									<Field.Field>
										<InputGroup.Root id="grossFloorArea">
											<InputGroup.Input
												{...createSale.fields.grossFloorArea.as('number')}
												placeholder="Gross Floor Area"
											/>
											<InputGroup.Addon>
												<span class="text-xs">Sqft</span>
											</InputGroup.Addon>
										</InputGroup.Root>
										{#each createSale.fields.grossFloorArea.issues() as issue, i (i)}
											<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
										{/each}
									</Field.Field>
								{/if}
							{/if}

							<!-- Plot Fields -->
							{#if createSale.fields.propertyType.value() === 'plot'}
								<Field.Field>
									<InputGroup.Root id="propertySize">
										<InputGroup.Input
											{...createSale.fields.propertySize.as('number')}
											placeholder="Property Size"
										/>
										<InputGroup.Addon>
											<span class="text-xs">Sqft</span>
										</InputGroup.Addon>
									</InputGroup.Root>
									{#each createSale.fields.propertySize.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
							{/if}
						</div>
						<div class="grid grid-cols-3 gap-4">
							<Field.Field>
								<InputGroup.Root id="project">
									<InputGroup.Input
										{...createSale.fields.project.as('text')}
										placeholder="Select Project"
									/>
									<InputGroup.Addon>
										<Building />
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each createSale.fields.project.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<InputGroup.Root id="propertyNo">
									<InputGroup.Input
										{...createSale.fields.propertyNo.as('text')}
										placeholder="Property No"
									/>
									<InputGroup.Addon>
										<Home />
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each createSale.fields.propertyNo.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<InputGroup.Root id="propertyValue">
									<InputGroup.Input
										{...createSale.fields.propertyValue.as('text')}
										placeholder="Property Value"
									/>
									<InputGroup.Addon>
										<PriceTag />
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each createSale.fields.propertyValue.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						</div>
					</Field.Group>
				</Field.Set>
				<Field.Separator />

				<!-- Deal Status Section -->
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

						<!-- File Uploads - Only show when a stage is selected -->
						{#if createSale.fields.dealStage.value()}
							<div class="space-y-4 pt-2">
								<Field.Field class="w-full">
									{#if uploadedFiles.bookingFormFile}
										<h3 class="text-sm font-medium">
											{createSale.fields.dealStage.value() === 'eoi' ? 'EOI Form' : 'Booking Form'}
										</h3>

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
											<span class="text-sm font-medium">
												{createSale.fields.dealStage.value() === 'eoi'
													? 'Upload EOI form'
													: 'Upload booking form'}
											</span>
										</label>
									{/if}
									<Input
										id="bookingFormFile"
										class="sr-only"
										{...createSale.fields.bookingFormFile.as('file')}
										files={undefined}
										accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
										onchange={(e) => handleFileUpload('bookingFormFile', e)}
									/>
									{#each createSale.fields.bookingFormFile.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">
											{issue.message}
										</Field.Error>
									{/each}
								</Field.Field>

								<Field.Field class="w-full">
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
										accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
										onchange={(e) => handleFileUpload('paymentReceiptFile', e)}
									/>
									{#each createSale.fields.paymentReceiptFile.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">
											{issue.message}
										</Field.Error>
									{/each}
								</Field.Field>
							</div>
						{/if}
					</Field.Group>
				</Field.Set>
				<Field.Separator />

				<!-- Refferal Agreement Section -->
				<Field.Set>
					<Field.Legend class="flex items-center gap-4 text-lg font-medium">
						Refferal Agreement
					</Field.Legend>
					<Field.Group class="space-y-4">
						<!-- Referral Amount Section -->
						<div class="space-y-3 rounded-lg border border-border/60 bg-background/60 p-4">
							<h3 class="text-sm font-medium">Referral Amount</h3>
							<RadioGroup.Root
								class="flex w-full flex-row gap-4"
								value={createSale.fields.referralAmountType.value() ?? ''}
								onValueChange={(v) =>
									createSale.fields.referralAmountType.set(v as 'percentage' | 'amount')}
							>
								<Field.Field orientation="horizontal">
									<RadioGroup.Item value="percentage" id="percentage" />
									<Field.Label for="percentage">Percentage (%)</Field.Label>
								</Field.Field>
								<Field.Field orientation="horizontal">
									<RadioGroup.Item value="amount" id="amount" />
									<Field.Label for="amount">Fixed Amount</Field.Label>
								</Field.Field>
							</RadioGroup.Root>
							<input class="sr-only" {...createSale.fields.referralAmountType.as('text')} />
							{#if createSale.fields.referralAmountType.value()}
								<Field.Field>
									<InputGroup.Root id="referralAmount">
										<InputGroup.Input
											{...createSale.fields.referralAmount.as('number')}
											placeholder={createSale.fields.referralAmountType.value() === 'percentage'
												? 'Enter percentage (e.g., 2.5)'
												: 'Enter amount (e.g., 50000)'}
										/>
										<InputGroup.Addon>
											{#if createSale.fields.referralAmountType.value() === 'percentage'}
												<span class="text-xs">%</span>
											{:else}
												<span class="text-xs">AED</span>
											{/if}
										</InputGroup.Addon>
									</InputGroup.Root>
									{#each createSale.fields.referralAmount.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
									{#if createSale.fields.referralAmountType.value() === 'percentage' && createSale.fields.referralAmount.value() && createSale.fields.propertyValue.value()}
										{@const propertyValue = parseFloat(
											createSale.fields.propertyValue.value().replace(/,/g, '')
										)}
										{@const percentage = createSale.fields.referralAmount.value()}
										{@const calculatedAmount = (propertyValue * percentage) / 100}
										{#if !isNaN(calculatedAmount) && calculatedAmount > 0}
											<div class="mt-2 rounded-md bg-muted/50 p-3 text-sm">
												<div class="flex items-center justify-between">
													<span class="text-muted-foreground">Calculated Amount:</span>
													<span class="font-semibold text-foreground">
														AED {calculatedAmount.toLocaleString('en-US', {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2
														})}
													</span>
												</div>
											</div>
										{/if}
									{/if}
								</Field.Field>
							{/if}
						</div>
						{#if uploadedFiles.refferalAgreementFile}
							<h3 class="text-sm font-medium">Referral Agreement</h3>
							<div
								class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
							>
								<div class="flex items-center gap-3">
									<FileText class="h-10 w-10 text-orange-500" />
									<div class="flex flex-col">
										<span class="text-sm font-medium"
											>{uploadedFiles.refferalAgreementFile.name}</span
										>
										<span class="text-xs text-muted-foreground"
											>{formatFileSize(uploadedFiles.refferalAgreementFile.size)}</span
										>
									</div>
								</div>
								<button
									type="button"
									onclick={() => removeFile('refferalAgreementFile')}
									class="text-destructive hover:text-destructive/80"
								>
									<Trash2 class="h-5 w-5" />
								</button>
							</div>
						{:else}
							<div class="flex w-full flex-row gap-2">
								<Button variant="outline" type="button" class="flex-1 bg-orange-50/40">
									<PlusRound class="h-4 w-4" />
									Generate Referral Agreement
								</Button>
								<span class="self-center text-center text-xs text-muted-foreground">or</span>
								<label
									for="refferalAgreementFile"
									class="flex w-full flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
								>
									<Upload class="h-5 w-5 text-gray-600" />
									<span class="text-sm font-medium">Upload manually</span>
								</label>
							</div>
						{/if}
						<Input
							id="refferalAgreementFile"
							class="sr-only"
							{...createSale.fields.refferalAgreementFile.as('file')}
							files={undefined}
							accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
							onchange={(e) => handleFileUpload('refferalAgreementFile', e)}
						/>
					</Field.Group>
				</Field.Set>
				<Field.Separator />

				<!-- Invoicing Stage Section -->
				<Field.Set>
					<Field.Legend class="text-lg font-medium">Invoicing Stage</Field.Legend>

					<RadioGroup.Root
						class="grid w-full grid-cols-2 justify-around"
						bind:value={
							() => createSale.fields.invoiceStage.value() ?? '',
							(v) => createSale.fields.invoiceStage.set(v || undefined)
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
						<Field.Field orientation="horizontal">
							<RadioGroup.Item value="not-yet-eligible" id="not-yet-eligible" />
							<div class="flex flex-col gap-1">
								<Field.Label for="not-yet-eligible" class="text-sm font-normal">
									Not yet eligible for invoice
								</Field.Label>
								<span class="text-sm text-muted-foreground">Select tentative eligibility date</span>
							</div>
						</Field.Field>
					</RadioGroup.Root>

					{#if createSale.fields.invoiceStage.value() === 'not-yet-eligible'}
						<div class="col-span-2 mt-4 rounded-lg border border-border/60 bg-background/60 p-4">
							<Field.Field>
								<Field.Label for="tentative-date" class="mb-2 text-sm font-medium">
									Tentative Eligibility Date
								</Field.Label>
								<Popover.Root bind:open={popoverOpen}>
									<Popover.Trigger class="w-full">
										<Button
											variant="outline"
											class="w-full justify-start text-left font-normal"
											id="tentative-date"
											type="button"
										>
											{#if tentativeEligibilityDate}
												{new Date(
													tentativeEligibilityDate.year,
													tentativeEligibilityDate.month - 1,
													tentativeEligibilityDate.day
												).toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'long',
													day: 'numeric'
												})}
											{:else}
												<span class="text-muted-foreground">Pick a date</span>
											{/if}
										</Button>
									</Popover.Trigger>
									<Popover.Content class="w-auto p-0" align="start">
										<CalendarComponent
											type="single"
											bind:value={tentativeEligibilityDate}
											onValueChange={(value) => {
												tentativeEligibilityDate = value;
												// Update hidden input for form submission
												const hiddenInput = document.querySelector(
													'input[name="tentativeEligibilityDate"]'
												) as HTMLInputElement;
												if (hiddenInput && value) {
													const date = new Date(value.year, value.month - 1, value.day);
													hiddenInput.value = date.toISOString().split('T')[0];
												}
												popoverOpen = false;
											}}
										/>
									</Popover.Content>
								</Popover.Root>
								<input
									type="hidden"
									name="tentativeEligibilityDate"
									value={tentativeEligibilityDate
										? new Date(
												tentativeEligibilityDate.year,
												tentativeEligibilityDate.month - 1,
												tentativeEligibilityDate.day
											)
												.toISOString()
												.split('T')[0]
										: ''}
								/>
							</Field.Field>
						</div>
					{/if}

					<input class="sr-only" {...createSale.fields.invoiceStage.as('text')} />
				</Field.Set>
				<Field.Separator />

				<!-- Deal Owners Section -->
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
				<Field.Separator />

				<!-- Joint Buyers Sections-->
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

								<Field.Field>
									<PhoneInput
										bind:value={jointBuyerPhoneValues[buyer.key]}
										bind:country={jointBuyerPhoneCountries[buyer.key]}
										showCountrySelect={true}
									></PhoneInput>
								</Field.Field>
								<input
									type="hidden"
									name={`jointBuyers[${index}].phone`}
									value={getE164number(
										jointBuyerPhoneValues[buyer.key] || '',
										jointBuyerPhoneCountries[buyer.key] || ''
									)}
								/>
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
														accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
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
																Upload National ID <br />(Emirates ID)
															</span>
														</label>
													{/if}
													<Input
														id={`joint-nationalIdFile-${buyer.key}`}
														name={`jointBuyers[${index}].nationalIdFile`}
														class="sr-only"
														type="file"
														accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
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

											{#if jointBuyerFiles[buyer.key]?.amlFormFile}
												<div
													class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
												>
													<div class="flex items-center gap-3">
														<FileText class="h-10 w-10 text-orange-500" />
														<div class="flex flex-col">
															<span class="text-sm font-medium"
																>{jointBuyerFiles[buyer.key]?.amlFormFile?.name ?? ''}</span
															>
															<span class="text-xs text-muted-foreground"
																>{jointBuyerFiles[buyer.key]?.amlFormFile
																	? formatFileSize(
																			jointBuyerFiles[buyer.key]?.amlFormFile?.size ?? 0
																		)
																	: ''}</span
															>
														</div>
													</div>
													<button
														type="button"
														onclick={() => removeJointBuyerFile(buyer.key, 'amlFormFile')}
														class="text-destructive hover:text-destructive/80"
													>
														<Trash2 class="h-5 w-5" />
													</button>
												</div>
											{:else}
												<div class="flex w-full flex-col gap-2">
													<Button
														variant="outline"
														type="button"
														class="w-full bg-orange-50/40"
														disabled={amlGenerating[`joint-${buyer.key}`]}
														onclick={async () => {
															// Get joint buyer data from form fields
															const firstNameInput = document.getElementById(
																`joint-firstName-${buyer.key}`
															) as HTMLInputElement;
															const lastNameInput = document.getElementById(
																`joint-lastName-${buyer.key}`
															) as HTMLInputElement;
															const emailInput = document.getElementById(
																`joint-email-${buyer.key}`
															) as HTMLInputElement;

															const firstName = firstNameInput?.value;
															const lastName = lastNameInput?.value;
															const email = emailInput?.value;
															const phone = getE164number(
																jointBuyerPhoneValues[buyer.key] || '',
																jointBuyerPhoneCountries[buyer.key] || 'AE'
															);

															if (!firstName || !lastName || !email || !phone) {
																toast.error(
																	'Please fill in joint buyer name, email, and phone before generating AML form'
																);
																return;
															}

															amlGenerating[`joint-${buyer.key}`] = true;
															toast.info('Generating and sending AML form...');

															try {
																const jointBuyerIndex = jointBuyers.findIndex(
																	(b) => b.key === buyer.key
																);
																const result = await generateAmlForm({
																	firstName,
																	lastName,
																	email,
																	phone,
																	buyerType: 'joint' as const,
																	buyerIndex: jointBuyerIndex
																});

																if (result?.success && result?.file) {
																	// Create File object from uploaded data
																	const fileObj = new File([], result.file.name, {
																		type: result.file.contentType,
																		lastModified: result.file.lastModified
																	});

																	if (!jointBuyerFiles[buyer.key]) {
																		jointBuyerFiles[buyer.key] = {
																			passportFile: null,
																			nationalIdFile: null,
																			amlFormFile: null
																		};
																	}
																	jointBuyerFiles[buyer.key].amlFormFile = fileObj;
																	toast.success(
																		`AML form generated and sent to ${email} for signature`
																	);
																} else {
																	toast.error(result?.error || 'Failed to generate AML form');
																}
															} catch (err) {
																toast.error('Failed to generate AML form');
																console.error('Joint buyer AML generation error:', err);
															} finally {
																amlGenerating[`joint-${buyer.key}`] = false;
															}
														}}
													>
														{#if amlGenerating[`joint-${buyer.key}`]}
															<Loader2 class="h-4 w-4 animate-spin" />
															Generating...
														{:else}
															<PlusRound class="h-4 w-4" />
															Generate Now
														{/if}
													</Button>
													<span class="text-center text-xs text-muted-foreground">or</span>
													<label
														for={`joint-amlFormFile-${buyer.key}`}
														class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
													>
														<Upload class="h-5 w-5 text-gray-600" />
														<span class="text-sm font-medium">Upload manually</span>
													</label>
												</div>
											{/if}
											<Input
												id={`joint-amlFormFile-${buyer.key}`}
												name={`jointBuyers[${index}].amlFormFile`}
												class="sr-only"
												type="file"
												accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
												onchange={(e) => handleJointBuyerFileUpload(buyer.key, 'amlFormFile', e)}
											/>
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

		<!-- Saving Overlay -->
		{#if createSale.pending}
			<div
				class="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
				style="pointer-events: all;"
			>
				<div class="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 shadow-lg">
					<Loader2 class="h-8 w-8 animate-spin text-primary" />
					<p class="text-sm font-medium text-foreground">Saving sale...</p>
				</div>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
