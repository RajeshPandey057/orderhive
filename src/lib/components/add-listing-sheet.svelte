<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { toast } from 'svelte-sonner';
	import Building from '~icons/lucide/building';
	import PlusRound from '~icons/lucide/circle-fading-plus';
	import FileText from '~icons/lucide/file-text';
	import Hammer from '~icons/lucide/hammer';
	import Home from '~icons/lucide/home';
	import Loader2 from '~icons/lucide/loader-2';
	import Pencil from '~icons/lucide/pencil';
	import Save from '~icons/lucide/save';
	import Trash2 from '~icons/lucide/trash-2';
	import Upload from '~icons/lucide/upload';
	import { createListing } from '../../routes/(secure)/listing/listing-management/listing.remote';

	type PropertyType = Listing['propertyType'];
	type ListingType = Listing['listingType'];
	type CommercialSubType = NonNullable<Listing['commercialSubType']>;

	let {
		currentUserEmail = '',
		currentUserUid = ''
	}: { currentUserEmail?: string; currentUserUid?: string } = $props();

	let open = $state(false);
	let listingType = $state<ListingType>('internal');
	let firstName = $state('');
	let lastName = $state('');
	let clientPhone = $state('');
	let clientEmail = $state('');
	let developer = $state('');
	let community = $state('');
	let project = $state('');
	let unitNo = $state('');
	let propertyType = $state<PropertyType>('apartment');
	let commercialSubType = $state<CommercialSubType>('office');
	let bedroomType = $state<NonNullable<Listing['bedroomType']>>('studio');
	let propertySize = $state<number | ''>('');
	let plotArea = $state<number | ''>('');
	let builtUpArea = $state<number | ''>('');
	let grossFloorArea = $state<number | ''>('');
	let addressLine1 = $state('');
	let addressLine2 = $state('');
	let buildingName = $state('');
	let street = $state('');
	let area = $state('');
	let city = $state('');
	let country = $state('');
	let postalCode = $state('');
	let landmark = $state('');
	let titleDeedFileName = $state('');
	let passportFileName = $state('');
	let emiratesIdFileName = $state('');
	let buyingPrice = $state<number | ''>('');
	let liquidityInvested = $state<number | ''>('');
	let sellingPrice = $state<number | ''>('');
	let listedByEmails = $state<string[]>(['']);
	$effect(() => {
		if (currentUserEmail && listedByEmails[0] === '') {
			listedByEmails = [currentUserEmail];
		}
	});
	let mediaAssets = $state<
		{ id: number; type: 'photo' | 'video'; file: File; fileName: string; previewUrl?: string }[]
	>([]);
	let nextAssetId = $state(1);
	let errors = $state<Record<string, string>>({});
	let developerPopoverOpen = $state(false);
	let pictureInputRef: HTMLInputElement | undefined = $state(undefined);
	let videoInputRef: HTMLInputElement | undefined = $state(undefined);
	let developerSearchValue = $state('');
	let activeTab = $state<'property-details' | 'property-photo-videos'>('property-details');

	const apartmentBedroomTypes: NonNullable<Listing['bedroomType']>[] = [
		'studio',
		'1bed',
		'2bed',
		'2bed+maid',
		'3bed',
		'3bed+maid',
		'4bed',
		'duplex',
		'penthouse',
		'podium-townhouse'
	];

	const villaTownhouseBedroomTypes: NonNullable<Listing['bedroomType']>[] = [
		'2bed',
		'3bed',
		'4bed',
		'5bed',
		'6-7bed'
	];

	const developers = [
		{ value: 'emaar', label: 'Emaar' },
		{ value: 'damac', label: 'DAMAC' },
		{ value: 'nakheel', label: 'Nakheel' },
		{ value: 'sobha', label: 'Sobha Realty' },
		{ value: 'meraas', label: 'Meraas' },
		{ value: 'aldar', label: 'Aldar' },
		{ value: 'azizi', label: 'Azizi' }
	];

	const developerLabel = $derived(
		developers.find((item) => item.value === developer)?.label ?? 'Developer'
	);

	const filteredDevelopers = $derived(
		developers.filter((item) =>
			item.label.toLowerCase().includes(developerSearchValue.toLowerCase())
		)
	);

	function formatBedroomLabel(value: string) {
		return value
			.replace('+', ' + ')
			.replace('-', '/')
			.replace('bed', ' Bed')
			.replace('studio', 'Studio')
			.replace('duplex', 'Duplex')
			.replace('penthouse', 'Penthouse')
			.replace('podium townhouse', 'Podium Townhouse');
	}

	function onFileSelect(event: Event, key: 'titleDeed' | 'passport' | 'emiratesId') {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		const fileName = file?.name ?? '';

		if (key === 'titleDeed') titleDeedFileName = fileName;
		if (key === 'passport') passportFileName = fileName;
		if (key === 'emiratesId') emiratesIdFileName = fileName;
	}

	function removeFile(key: 'titleDeed' | 'passport' | 'emiratesId') {
		if (key === 'titleDeed') titleDeedFileName = '';
		if (key === 'passport') passportFileName = '';
		if (key === 'emiratesId') emiratesIdFileName = '';
	}

	function revokePreviewUrl(url?: string) {
		if (url) URL.revokeObjectURL(url);
	}

	function addMediaFiles(files: FileList | null) {
		if (!files || files.length === 0) return;

		const incoming = Array.from(files).map((file) => ({
			id: nextAssetId++,
			type: file.type.startsWith('video/') ? ('video' as const) : ('photo' as const),
			file,
			fileName: file.name,
			previewUrl: URL.createObjectURL(file)
		}));

		mediaAssets = [...mediaAssets, ...incoming];
	}

	function onMediaInputChange(event: Event) {
		const files = (event.currentTarget as HTMLInputElement).files;
		addMediaFiles(files);
	}

	function onMediaDrop(event: DragEvent) {
		event.preventDefault();
		addMediaFiles(event.dataTransfer?.files ?? null);
	}

	function removeMediaAsset(id: number) {
		const assetToRemove = mediaAssets.find((asset) => asset.id === id);
		revokePreviewUrl(assetToRemove?.previewUrl);
		mediaAssets = mediaAssets.filter((asset) => asset.id !== id);
	}

	function resetForm() {
		listingType = 'internal';
		firstName = '';
		lastName = '';
		clientPhone = '';
		clientEmail = '';
		developer = '';
		community = '';
		project = '';
		unitNo = '';
		propertyType = 'apartment';
		commercialSubType = 'office';
		bedroomType = 'studio';
		propertySize = '';
		plotArea = '';
		builtUpArea = '';
		grossFloorArea = '';
		addressLine1 = '';
		addressLine2 = '';
		buildingName = '';
		street = '';
		area = '';
		city = '';
		country = '';
		postalCode = '';
		landmark = '';
		titleDeedFileName = '';
		passportFileName = '';
		emiratesIdFileName = '';
		buyingPrice = '';
		liquidityInvested = '';
		sellingPrice = '';
		listedByEmails = [currentUserEmail || ''];
		for (const asset of mediaAssets) {
			revokePreviewUrl(asset.previewUrl);
		}
		mediaAssets = [];
		activeTab = 'property-details';
		errors = {};
	}

	function validate() {
		const nextErrors: Record<string, string> = {};

		if (!firstName.trim()) nextErrors.firstName = 'First name is required';
		if (!lastName.trim()) nextErrors.lastName = 'Last name is required';
		if (!clientPhone.trim()) nextErrors.clientPhone = 'Mobile number is required';
		if (!clientEmail.trim()) nextErrors.clientEmail = 'Email is required';
		if (!developer.trim()) nextErrors.developer = 'Developer name is required';
		if (!project.trim()) nextErrors.project = 'Project name is required';
		if (!unitNo.trim()) nextErrors.unitNo = 'Unit no is required';
		if (!buyingPrice && buyingPrice !== 0) nextErrors.buyingPrice = 'Buying price is required';
		if (!liquidityInvested && liquidityInvested !== 0)
			nextErrors.liquidityInvested = 'Liquidity invested is required';
		if (!sellingPrice && sellingPrice !== 0) nextErrors.sellingPrice = 'Selling price is required';
		const validListedBy = listedByEmails.map((value) => value.trim()).filter(Boolean);
		if (!validListedBy.length) {
			nextErrors.listedByEmails = 'At least one listed by email is required';
		}

		if (propertyType === 'apartment') {
			if (!propertySize && propertySize !== 0)
				nextErrors.propertySize = 'Property size is required for apartment';
		}
		if (propertyType === 'townhouse' || propertyType === 'villa') {
			if (!plotArea && plotArea !== 0) nextErrors.plotArea = 'Plot area is required';
			if (!builtUpArea && builtUpArea !== 0) nextErrors.builtUpArea = 'Built up area is required';
		}
		if (propertyType === 'commercial') {
			if (!propertySize && propertySize !== 0)
				nextErrors.propertySize = 'Property size is required';
			if (commercialSubType === 'warehouse' && !grossFloorArea && grossFloorArea !== 0) {
				nextErrors.grossFloorArea = 'Gross floor area is required for warehouse';
			}
		}
		if (propertyType === 'plot' && !plotArea && plotArea !== 0) {
			nextErrors.plotArea = 'Plot area is required for plot';
		}
		if (listingType === 'portal') {
			if (!titleDeedFileName)
				nextErrors.titleDeedFileName = 'Title deed/Qood is required for portal listing';
			if (!passportFileName)
				nextErrors.passportFileName = 'Passport is required for portal listing';
			if (!emiratesIdFileName)
				nextErrors.emiratesIdFileName = 'Emirates ID is required for portal listing';
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		if (!nextOpen) resetForm();
	}

	function addListedByEmail() {
		listedByEmails = [...listedByEmails, ''];
	}

	function updateListedByEmail(index: number, value: string) {
		listedByEmails = listedByEmails.map((email, i) => (i === index ? value : email));
	}

	function removeListedByEmail(index: number) {
		if (listedByEmails.length === 1) {
			listedByEmails = [''];
			return;
		}
		listedByEmails = listedByEmails.filter((_, i) => i !== index);
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Trigger>
		{#snippet child({ props })}
			<Button {...props} class="gap-2">
				<PlusRound class="h-4 w-4" />
				Add Property
			</Button>
		{/snippet}
	</Sheet.Trigger>
	<Sheet.Content side="right" class="w-200 max-w-200 overflow-y-auto sm:w-200 sm:max-w-200">
		<form
			enctype="multipart/form-data"
			{...createListing.enhance(async ({ form, submit }) => {
				// Populate hidden file inputs via DataTransfer for media assets
				const photos = mediaAssets.filter((a) => a.type === 'photo').map((a) => a.file);
				const videos = mediaAssets.filter((a) => a.type === 'video').map((a) => a.file);
				if (photos.length && pictureInputRef) {
					const dt = new DataTransfer();
					photos.forEach((f) => dt.items.add(f));
					pictureInputRef.files = dt.files;
				}
				if (videos.length && videoInputRef) {
					const dt = new DataTransfer();
					videos.forEach((f) => dt.items.add(f));
					videoInputRef.files = dt.files;
				}

				// Client-side pre-validation for instant UX feedback
				if (!validate()) return;

				try {
					await submit();
					const issues = createListing.fields.allIssues();
					if (!issues?.length) {
						form.reset();
						open = false;
						toast.success('Property listing added');
						resetForm();
					}
				} catch {
					toast.error('Failed to add listing. Please try again.');
				}
			})}
		>
			<!-- Hidden inputs for programmatic fields -->
			<input type="hidden" name="createdByUid" value={currentUserUid} />
			<input type="hidden" name="createdByEmail" value={currentUserEmail} />
			<input type="hidden" name="listingType" value={listingType} />
			<input type="hidden" name="developer" value={developer} />
			{#each listedByEmails.map((e) => e.trim()).filter(Boolean) as email}
				<input type="hidden" name="listedByEmails" value={email} />
			{/each}
			<input
				type="file"
				name="pictureFiles"
				multiple
				bind:this={pictureInputRef}
				class="sr-only"
				tabindex="-1"
				aria-hidden="true"
			/>
			<input
				type="file"
				name="videoFiles"
				multiple
				bind:this={videoInputRef}
				class="sr-only"
				tabindex="-1"
				aria-hidden="true"
			/>

			<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
				<Sheet.Title class="text-2xl font-medium">Add Property Listing</Sheet.Title>
				<div class="flex flex-row gap-2">
					<Sheet.Close class={buttonVariants({ variant: 'outline', size: 'sm' })}>
						<Pencil class="mr-2 h-4 w-4" /> Save as Draft
					</Sheet.Close>
					<Button type="submit" size="sm" disabled={!!createListing.pending}>
						{#if createListing.pending}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Saving...
						{:else}
							<Save class="mr-2 h-4 w-4" />
							Save
						{/if}
					</Button>
				</div>
			</div>

			{#if (createListing.fields.allIssues()?.length ?? 0) > 0}
				<div class="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
					{#each createListing.fields.allIssues() as issue, i (i)}
						<p class="text-sm text-destructive">{issue.message}</p>
					{/each}
				</div>
			{/if}

			<div class="flex flex-col gap-8 p-6">
				<div class="border-b border-border/60">
					<div class="flex items-center gap-8">
						<button
							type="button"
							class={`border-b-2 px-1 py-3 text-base font-medium transition-colors ${
								activeTab === 'property-details'
									? 'border-primary text-foreground'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							}`}
							onclick={() => (activeTab = 'property-details')}
						>
							Property Details
						</button>
						<button
							type="button"
							class={`border-b-2 px-1 py-3 text-base font-medium transition-colors ${
								activeTab === 'property-photo-videos'
									? 'border-primary text-foreground'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							}`}
							onclick={() => (activeTab = 'property-photo-videos')}
						>
							Property Photo/Videos
						</button>
					</div>
				</div>

				{#if activeTab === 'property-details'}
					<!--
			<Field.Set>
				<Field.Legend class="text-lg font-medium">Listing Type</Field.Legend>
				<div class="mt-3 flex gap-2">
					<Button
						type="button"
						variant={listingType === 'internal' ? 'default' : 'outline'}
						onclick={() => (listingType = 'internal')}
					>
						Internal
					</Button>
					<Button
						type="button"
						variant={listingType === 'portal' ? 'default' : 'outline'}
						onclick={() => (listingType = 'portal')}
					>
						Portal
					</Button>
				</div>
			</Field.Set>
			-->

					<Field.Set>
						<Field.Legend class="text-lg font-medium">Client Details</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-3 gap-4">
								<Field.Field>
									<Input name="firstName" bind:value={firstName} placeholder="First Name" />
									{#if errors.firstName}<Field.Error class="text-sm text-destructive"
											>{errors.firstName}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Input name="lastName" bind:value={lastName} placeholder="Last Name" />
									{#if errors.lastName}<Field.Error class="text-sm text-destructive"
											>{errors.lastName}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Input
										type="email"
										name="clientEmail"
										bind:value={clientEmail}
										placeholder="Email"
									/>
									{#if errors.clientEmail}<Field.Error class="text-sm text-destructive"
											>{errors.clientEmail}</Field.Error
										>{/if}
								</Field.Field>
							</div>
							<Field.Field>
								<Field.Label>Phone Number</Field.Label>
								<Input
									name="clientPhone"
									bind:value={clientPhone}
									placeholder="Enter a phone number"
								/>
								{#if errors.clientPhone}<Field.Error class="text-sm text-destructive"
										>{errors.clientPhone}</Field.Error
									>{/if}
							</Field.Field>
						</Field.Group>
					</Field.Set>

					<Field.Set>
						<Field.Legend class="text-lg font-medium">Property Details</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-2 gap-4">
								<Field.Field>
									<Field.Label>Developer Name</Field.Label>
									<Popover.Root bind:open={developerPopoverOpen}>
										<Popover.Trigger class="w-full">
											<Button
												variant="outline"
												type="button"
												role="combobox"
												aria-expanded={developerPopoverOpen}
												class="w-full justify-start gap-2"
											>
												<Hammer class="h-4 w-4" />
												<span class="truncate">{developerLabel}</span>
											</Button>
										</Popover.Trigger>
										<Popover.Content class="w-50 p-0" align="start">
											<Command.Root>
												<Command.Input
													placeholder="Search developer..."
													bind:value={developerSearchValue}
												/>
												<Command.List>
													<Command.Empty>No developer found.</Command.Empty>
													<Command.Group>
														{#each filteredDevelopers as item (item.value)}
															<Command.Item
																value={item.value}
																onSelect={() => {
																	developer = item.value;
																	developerPopoverOpen = false;
																	developerSearchValue = '';
																}}
															>
																{item.label}
															</Command.Item>
														{/each}
													</Command.Group>
												</Command.List>
											</Command.Root>
										</Popover.Content>
									</Popover.Root>
									{#if errors.developer}<Field.Error class="text-sm text-destructive"
											>{errors.developer}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label
										>Community <span class="text-muted-foreground">(Optional)</span></Field.Label
									>
									<InputGroup.Root id="community">
										<InputGroup.Input
											name="community"
											bind:value={community}
											placeholder="Community (Optional)"
										/>
										<InputGroup.Addon>
											<Home />
										</InputGroup.Addon>
									</InputGroup.Root>
								</Field.Field>
								<Field.Field>
									<Field.Label>Project Name</Field.Label>
									<InputGroup.Root id="project">
										<InputGroup.Input
											name="project"
											bind:value={project}
											placeholder="Select Project"
										/>
										<InputGroup.Addon>
											<Building />
										</InputGroup.Addon>
									</InputGroup.Root>
									{#if errors.project}<Field.Error class="text-sm text-destructive"
											>{errors.project}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Unit No</Field.Label>
									<InputGroup.Root id="unitNo">
										<InputGroup.Input name="unitNo" bind:value={unitNo} placeholder="Unit No" />
										<InputGroup.Addon>
											<Home />
										</InputGroup.Addon>
									</InputGroup.Root>
									{#if errors.unitNo}<Field.Error class="text-sm text-destructive"
											>{errors.unitNo}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Property Type</Field.Label>
									<select
										name="propertyType"
										class="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
										bind:value={propertyType}
									>
										<option value="apartment">Apartment</option>
										<option value="townhouse">Townhouse</option>
										<option value="villa">Villa</option>
										<option value="commercial">Commercial</option>
										<option value="plot">Plot</option>
									</select>
								</Field.Field>
								{#if propertyType === 'commercial'}
									<Field.Field>
										<Field.Label>Commercial Type</Field.Label>
										<select
											name="commercialSubType"
											class="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
											bind:value={commercialSubType}
										>
											<option value="office">Office Space</option>
											<option value="warehouse">Warehouse</option>
										</select>
									</Field.Field>
								{/if}

								{#if propertyType === 'apartment'}
									<Field.Field>
										<Field.Label>No of Bedrooms</Field.Label>
										<select
											name="bedroomType"
											class="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
											bind:value={bedroomType}
										>
											{#each apartmentBedroomTypes as option}
												<option value={option}>{formatBedroomLabel(option)}</option>
											{/each}
										</select>
									</Field.Field>
									<Field.Field>
										<Field.Label>Property Size (Sqft)</Field.Label>
										<Input name="propertySize" type="number" bind:value={propertySize} />
										{#if errors.propertySize}<Field.Error class="text-sm text-destructive"
												>{errors.propertySize}</Field.Error
											>{/if}
									</Field.Field>
								{/if}

								{#if propertyType === 'townhouse' || propertyType === 'villa'}
									<Field.Field>
										<Field.Label>No of Bedrooms</Field.Label>
										<select
											name="bedroomType"
											class="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
											bind:value={bedroomType}
										>
											{#each villaTownhouseBedroomTypes as option}
												<option value={option}>{formatBedroomLabel(option)}</option>
											{/each}
										</select>
									</Field.Field>
									<Field.Field>
										<Field.Label>Plot Area</Field.Label>
										<Input name="plotArea" type="number" bind:value={plotArea} />
										{#if errors.plotArea}<Field.Error class="text-sm text-destructive"
												>{errors.plotArea}</Field.Error
											>{/if}
									</Field.Field>
									<Field.Field>
										<Field.Label>Built Up Area</Field.Label>
										<Input name="builtUpArea" type="number" bind:value={builtUpArea} />
										{#if errors.builtUpArea}<Field.Error class="text-sm text-destructive"
												>{errors.builtUpArea}</Field.Error
											>{/if}
									</Field.Field>
								{/if}

								{#if propertyType === 'commercial'}
									<Field.Field>
										<Field.Label>Property Size (Sqft)</Field.Label>
										<Input name="propertySize" type="number" bind:value={propertySize} />
										{#if errors.propertySize}<Field.Error class="text-sm text-destructive"
												>{errors.propertySize}</Field.Error
											>{/if}
									</Field.Field>
									{#if commercialSubType === 'warehouse'}
										<Field.Field>
											<Field.Label>Gross Floor Area (GFA)</Field.Label>
											<Input name="grossFloorArea" type="number" bind:value={grossFloorArea} />
											{#if errors.grossFloorArea}<Field.Error class="text-sm text-destructive"
													>{errors.grossFloorArea}</Field.Error
												>{/if}
										</Field.Field>
									{/if}
								{/if}

								{#if propertyType === 'plot'}
									<Field.Field>
										<Field.Label>Plot Area (Sqft)</Field.Label>
										<Input name="plotArea" type="number" bind:value={plotArea} />
										{#if errors.plotArea}<Field.Error class="text-sm text-destructive"
												>{errors.plotArea}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
							</div>
						</Field.Group>
					</Field.Set>

					<Field.Set>
						<Field.Legend class="text-lg font-medium">Property Address</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-2 gap-4">
								<Field.Field>
									<Field.Label>Address Line 1</Field.Label>
									<Input
										name="addressLine1"
										bind:value={addressLine1}
										placeholder="Address line 1"
									/>
								</Field.Field>
								<Field.Field>
									<Field.Label>Address Line 2</Field.Label>
									<Input
										name="addressLine2"
										bind:value={addressLine2}
										placeholder="Address line 2"
									/>
								</Field.Field>
								<Field.Field>
									<Field.Label>Building Name</Field.Label>
									<Input
										name="buildingName"
										bind:value={buildingName}
										placeholder="Building / Tower"
									/>
								</Field.Field>
								<Field.Field>
									<Field.Label>Street</Field.Label>
									<Input name="street" bind:value={street} placeholder="Street" />
								</Field.Field>
								<Field.Field>
									<Field.Label>Area</Field.Label>
									<Input name="area" bind:value={area} placeholder="Area / Locality" />
								</Field.Field>
								<Field.Field>
									<Field.Label>City</Field.Label>
									<Input name="city" bind:value={city} placeholder="City" />
								</Field.Field>
								<Field.Field>
									<Field.Label>Country</Field.Label>
									<Input name="country" bind:value={country} placeholder="Country" />
								</Field.Field>
								<Field.Field>
									<Field.Label>Postal Code</Field.Label>
									<Input name="postalCode" bind:value={postalCode} placeholder="Postal code" />
								</Field.Field>
								<Field.Field>
									<Field.Label>Landmark</Field.Label>
									<Input name="landmark" bind:value={landmark} placeholder="Nearby landmark" />
								</Field.Field>
							</div>
						</Field.Group>
					</Field.Set>

					<Field.Set>
						<Field.Legend class="flex items-center gap-4 text-lg font-medium">
							<div
								class="grid h-8 w-8 place-items-center rounded-lg border border-white/5 bg-orange-100 p-0"
							>
								<Upload class="h-4 w-4 text-orange-500" stroke-width="4" />
							</div>
							Attachments
						</Field.Legend>
						<Field.Group class="space-y-4">
							<div class="grid gap-4 xl:grid-cols-2">
								<div class="flex items-center gap-4">
									<span
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
										>1</span
									>
									<Field.Field class="w-full">
										{#if titleDeedFileName}
											<div
												class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
											>
												<div class="flex items-center gap-3">
													<FileText class="h-9 w-9 text-orange-500" />
													<div class="flex flex-col">
														<span class="text-sm font-medium">{titleDeedFileName}</span>
														<span class="text-xs text-muted-foreground">Title Deed / Qood</span>
													</div>
												</div>
												<button
													type="button"
													onclick={() => removeFile('titleDeed')}
													class="text-destructive hover:text-destructive/80"
												>
													<Trash2 class="h-5 w-5" />
												</button>
											</div>
										{:else}
											<label
												for="titleDeed"
												class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
											>
												<Upload class="h-5 w-5 text-gray-600" />
												<span class="text-sm font-medium">Upload Title Deed / Qood</span>
											</label>
										{/if}
										<Input
											id="titleDeed"
											name="titleDeedFile"
											class="sr-only"
											type="file"
											onchange={(event) => onFileSelect(event, 'titleDeed')}
										/>
										{#if listingType === 'portal'}
											<p class="text-xs text-muted-foreground">Required for portal listing</p>
										{/if}
										{#if errors.titleDeedFileName}<Field.Error class="text-sm text-destructive"
												>{errors.titleDeedFileName}</Field.Error
											>{/if}
									</Field.Field>
								</div>

								<div class="flex items-center gap-4">
									<span
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
										>2</span
									>
									<Field.Field class="w-full">
										{#if passportFileName}
											<div
												class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
											>
												<div class="flex items-center gap-3">
													<FileText class="h-9 w-9 text-orange-500" />
													<div class="flex flex-col">
														<span class="text-sm font-medium">{passportFileName}</span>
														<span class="text-xs text-muted-foreground">Passport</span>
													</div>
												</div>
												<button
													type="button"
													onclick={() => removeFile('passport')}
													class="text-destructive hover:text-destructive/80"
												>
													<Trash2 class="h-5 w-5" />
												</button>
											</div>
										{:else}
											<label
												for="passport"
												class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
											>
												<Upload class="h-5 w-5 text-gray-600" />
												<span class="text-sm font-medium">Upload Passport</span>
											</label>
										{/if}
										<Input
											id="passport"
											name="passportFile"
											class="sr-only"
											type="file"
											onchange={(event) => onFileSelect(event, 'passport')}
										/>
										{#if listingType === 'portal'}
											<p class="text-xs text-muted-foreground">Required for portal listing</p>
										{/if}
										{#if errors.passportFileName}<Field.Error class="text-sm text-destructive"
												>{errors.passportFileName}</Field.Error
											>{/if}
									</Field.Field>
								</div>

								<div class="flex items-center gap-4">
									<span
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
										>3</span
									>
									<Field.Field class="w-full">
										{#if emiratesIdFileName}
											<div
												class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
											>
												<div class="flex items-center gap-3">
													<FileText class="h-9 w-9 text-orange-500" />
													<div class="flex flex-col">
														<span class="text-sm font-medium">{emiratesIdFileName}</span>
														<span class="text-xs text-muted-foreground">Emirates ID</span>
													</div>
												</div>
												<button
													type="button"
													onclick={() => removeFile('emiratesId')}
													class="text-destructive hover:text-destructive/80"
												>
													<Trash2 class="h-5 w-5" />
												</button>
											</div>
										{:else}
											<label
												for="emiratesId"
												class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
											>
												<Upload class="h-5 w-5 text-gray-600" />
												<span class="text-sm font-medium">Upload Emirates ID</span>
											</label>
										{/if}
										<Input
											id="emiratesId"
											name="emiratesIdFile"
											class="sr-only"
											type="file"
											onchange={(event) => onFileSelect(event, 'emiratesId')}
										/>
										{#if listingType === 'portal'}
											<p class="text-xs text-muted-foreground">Required for portal listing</p>
										{/if}
										{#if errors.emiratesIdFileName}<Field.Error class="text-sm text-destructive"
												>{errors.emiratesIdFileName}</Field.Error
											>{/if}
									</Field.Field>
								</div>
							</div>
						</Field.Group>
					</Field.Set>

					<Field.Set>
						<Field.Legend class="text-lg font-medium">Financial Details</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-3 gap-4">
								<Field.Field>
									<Field.Label>Buying Price</Field.Label>
									<Input
										name="buyingPrice"
										type="number"
										bind:value={buyingPrice}
										placeholder="Buying Price"
									/>
									{#if errors.buyingPrice}<Field.Error class="text-sm text-destructive"
											>{errors.buyingPrice}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Liquidity Invested</Field.Label>
									<Input
										name="liquidityInvested"
										type="number"
										bind:value={liquidityInvested}
										placeholder="Liquidity Invested"
									/>
									{#if errors.liquidityInvested}<Field.Error class="text-sm text-destructive"
											>{errors.liquidityInvested}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Selling Price</Field.Label>
									<Input
										name="sellingPrice"
										type="number"
										bind:value={sellingPrice}
										placeholder="Selling Price"
									/>
									{#if errors.sellingPrice}<Field.Error class="text-sm text-destructive"
											>{errors.sellingPrice}</Field.Error
										>{/if}
								</Field.Field>
							</div>
						</Field.Group>
					</Field.Set>

					<Field.Set>
						<Field.Legend class="text-lg font-medium">Listed by</Field.Legend>
						<Field.Group>
							<div class="flex flex-col gap-3">
								{#each listedByEmails as email, index (index)}
									<div class="flex items-center gap-2">
										<Input
											type="email"
											placeholder="agent@example.com"
											value={email}
											oninput={(event) => updateListedByEmail(index, event.currentTarget.value)}
										/>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onclick={() => removeListedByEmail(index)}
										>
											Remove
										</Button>
									</div>
								{/each}
								<div class="flex items-center gap-2">
									<Button type="button" variant="outline" size="sm" onclick={addListedByEmail}>
										+ Add Agent
									</Button>
								</div>
								{#if errors.listedByEmails}
									<Field.Error class="text-sm text-destructive">{errors.listedByEmails}</Field.Error
									>
								{/if}
							</div>
						</Field.Group>
					</Field.Set>
				{:else}
					<Field.Set>
						<Field.Legend class="text-lg font-medium">Property Photo/Videos</Field.Legend>
						<Field.Group>
							<div
								role="region"
								aria-label="Media upload area"
								class="rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/10 p-8 text-center"
								ondragover={(event) => event.preventDefault()}
								ondrop={onMediaDrop}
							>
								<label for="property-media-input" class="cursor-pointer">
									<div
										class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted"
									>
										<Upload class="h-6 w-6 text-muted-foreground" />
									</div>
									<p class="text-sm font-semibold">Drag and drop images/videos here</p>
									<p class="mt-1 text-xs text-muted-foreground">
										or click to browse from your files
									</p>
								</label>
								<Input
									id="property-media-input"
									class="sr-only"
									type="file"
									accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
									multiple
									onchange={onMediaInputChange}
								/>
							</div>

							{#if mediaAssets.length > 0}
								<div class="grid grid-cols-2 gap-3">
									{#each mediaAssets as asset (asset.id)}
										<div class="rounded-lg border border-border/60 bg-background/60 p-2">
											{#if asset.type === 'photo' && asset.previewUrl}
												<img
													src={asset.previewUrl}
													alt={asset.fileName}
													class="h-32 w-full rounded-md object-cover"
												/>
											{:else if asset.type === 'video' && asset.previewUrl}
												<video
													src={asset.previewUrl}
													class="h-32 w-full rounded-md object-cover"
													controls
												>
													<track kind="captions" />
												</video>
											{/if}
											<div class="mt-2 flex items-center justify-between gap-2">
												<p class="truncate text-xs text-muted-foreground">{asset.fileName}</p>
												<button
													type="button"
													class="text-destructive hover:text-destructive/80"
													onclick={() => removeMediaAsset(asset.id)}
												>
													<Trash2 class="h-4 w-4" />
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</Field.Group>
					</Field.Set>
				{/if}
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
