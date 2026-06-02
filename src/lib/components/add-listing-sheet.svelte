<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import {
		BEDROOM_OPTIONS,
		DUBAI_COMMUNITIES,
		HANDOVER_QUARTERS,
		HANDOVER_YEARS,
		LISTING_CITIES,
		LISTING_DEVELOPERS,
		PAYMENT_PLANS,
		UNIT_TYPES
	} from '$lib/listing-options';
	import { getInitials } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import Building from '~icons/lucide/building';
	import PlusRound from '~icons/lucide/circle-fading-plus';
	import FileText from '~icons/lucide/file-text';
	import Hammer from '~icons/lucide/hammer';
	import Home from '~icons/lucide/home';
	import Loader2 from '~icons/lucide/loader-2';
	import Save from '~icons/lucide/save';
	import Trash2 from '~icons/lucide/trash-2';
	import Upload from '~icons/lucide/upload';
	import UserRound from '~icons/lucide/user-round';
	import { createListing } from '../../routes/(secure)/listing/listing-management/listing.remote';
	import { searchUsers as searchUsersRemote } from '../../routes/(secure)/users.remote';

	type ListingType = Listing['listingType'];
	type ClientDocumentKey = 'titleDeed' | 'passport' | 'emiratesId';
	type AdditionalClient = {
		key: number;
		firstName: string;
		lastName: string;
		phone: string;
		email: string;
		titleDeedFileName: string;
		passportFileName: string;
		emiratesIdFileName: string;
	};

	let {
		currentUserEmail = '',
		currentUserUid = ''
	}: { currentUserEmail?: string; currentUserUid?: string } = $props();

	let open = $state(false);
	let listingType = $state<ListingType>('internal');
	let availableFor = $state('');
	let furnishing = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let clientPhone = $state('');
	let clientEmail = $state('');
	let agentEmail = $state('');
	let agentMobile = $state('');
	let reportingManager = $state('');
	let reportingManagerName = $state('');
	let seniorManager = $state('');
	let seniorManagerName = $state('');
	let developerName = $state('');
	let community = $state('');
	let customCommunity = $state('');
	let projectName = $state('');
	let unitNo = $state('');
	let projectType = $state('');
	let unitType = $state('');
	let unitTypeOther = $state('');
	let bedrooms = $state('');
	let unitArea = $state<number | ''>('');
	let internalArea = $state<number | ''>('');
	let balconyArea = $state<number | ''>('');
	let plotSize = $state<number | ''>('');
	let builtUpArea = $state<number | ''>('');
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
	let additionalClients = $state<AdditionalClient[]>([]);
	let nextClientKey = $state(2);
	let unitStatus = $state('');
	let paymentType = $state('');
	let rentAmount = $state<number | ''>('');
	let vacantDate = $state('');
	let handoverYear = $state('');
	let handoverQuarter = $state('');
	let paymentPlan = $state('');
	let paymentPlanOther = $state('');
	let originalPrice = $state<number | ''>('');
	let purchasePrice = $state<number | ''>('');
	let amountPaid = $state<number | ''>('');
	let price = $state<number | ''>('');
	$effect(() => {
		if (currentUserEmail && !agentEmail) agentEmail = currentUserEmail;
	});

	// Keep hidden file inputs in sync with mediaAssets BEFORE the form submit event fires.
	// The form() API captures FormData on submit, before the enhance callback runs,
	// so DataTransfer assignment inside the callback would be too late.
	$effect(() => {
		if (!pictureInputRef) return;
		const dt = new DataTransfer();
		for (const a of mediaAssets.filter((a) => a.type === 'photo')) dt.items.add(a.file);
		pictureInputRef.files = dt.files;
	});

	$effect(() => {
		if (!videoInputRef) return;
		const dt = new DataTransfer();
		for (const a of mediaAssets.filter((a) => a.type === 'video')) dt.items.add(a.file);
		videoInputRef.files = dt.files;
	});
	$effect(() => {
		if (!floorPlanInputRef) return;
		const dt = new DataTransfer();
		for (const a of floorPlanAssets) dt.items.add(a.file);
		floorPlanInputRef.files = dt.files;
	});
	let mediaAssets = $state<
		{ id: number; type: 'photo' | 'video'; file: File; fileName: string; previewUrl?: string }[]
	>([]);
	let floorPlanAssets = $state<{ id: number; file: File; fileName: string; previewUrl?: string }[]>(
		[]
	);
	let nextAssetId = $state(1);
	let nextFloorPlanId = $state(1);
	let errors = $state<Record<string, string>>({});
	let saving = $state(false);
	let developerPopoverOpen = $state(false);
	let managerPopoverOpen = $state(false);
	let seniorManagerPopoverOpen = $state(false);
	let pictureInputRef: HTMLInputElement | undefined = $state(undefined);
	let videoInputRef: HTMLInputElement | undefined = $state(undefined);
	let floorPlanInputRef: HTMLInputElement | undefined = $state(undefined);
	let developerSearchValue = $state('');
	let managerSearchValue = $state('');
	let seniorManagerSearchValue = $state('');
	let activeTab = $state<'property-details' | 'property-photo-videos'>('property-details');

	type UserResult = {
		id: string;
		email: string | null;
		displayName?: string | null;
		photoURL?: string | null;
		reportingManagerEmail?: string | null;
		seniorManagerEmail?: string | null;
	};

	let managerSearchResults = $state<UserResult[]>([]);
	let seniorManagerSearchResults = $state<UserResult[]>([]);
	let managerSearchLoading = $state(false);
	let seniorManagerSearchLoading = $state(false);
	let managerDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let seniorManagerDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let agentHierarchyDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let agentHierarchyRequest = 0;

	const developers = LISTING_DEVELOPERS.map((label) => ({ value: label, label }));
	const clientDocumentConfigs: {
		key: ClientDocumentKey;
		label: string;
		uploadLabel: string;
		inputName: 'titleDeedFile' | 'passportFile' | 'emiratesIdFile';
		errorKey: 'titleDeedFileName' | 'passportFileName' | 'emiratesIdFileName';
	}[] = [
		{
			key: 'titleDeed',
			label: 'Title Deed / Qood',
			uploadLabel: 'Upload Title Deed / Qood',
			inputName: 'titleDeedFile',
			errorKey: 'titleDeedFileName'
		},
		{
			key: 'passport',
			label: 'Passport',
			uploadLabel: 'Upload Passport',
			inputName: 'passportFile',
			errorKey: 'passportFileName'
		},
		{
			key: 'emiratesId',
			label: 'Emirates ID',
			uploadLabel: 'Upload Emirates ID',
			inputName: 'emiratesIdFile',
			errorKey: 'emiratesIdFileName'
		}
	];

	const developerLabel = $derived(
		developers.find((item) => item.value === developerName)?.label ?? (developerName || 'Developer')
	);

	const isOffPlan = $derived(projectType === 'Off-Plan Property');
	const isReady = $derived(projectType === 'Ready Property');
	const isRented = $derived(isReady && unitStatus === 'Rented');
	const requiresBedrooms = $derived(
		['Apartment', 'Villa', 'Townhouse', 'Mansion'].includes(unitType)
	);
	const selectedPaymentPlan = $derived(
		paymentPlan === 'Others' ? paymentPlanOther.trim() : paymentPlan
	);
	const selectedLocation = $derived(community === 'Others' ? customCommunity.trim() : community);
	const photoCount = $derived(mediaAssets.filter((asset) => asset.type === 'photo').length);

	const filteredDevelopers = $derived(
		developers.filter((item) =>
			item.label.toLowerCase().includes(developerSearchValue.toLowerCase())
		)
	);

	async function doUserSearch(
		term: string,
		roleFilter: 'manager' | 'senior-manager',
		setLoading: (value: boolean) => void,
		setResults: (value: UserResult[]) => void
	) {
		setLoading(true);
		try {
			setResults(await searchUsersRemote({ q: term.trim(), roleFilter }));
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	}

	function handleManagerSearchInput(value: string) {
		managerSearchValue = value;
		if (managerDebounceTimer) clearTimeout(managerDebounceTimer);
		managerDebounceTimer = setTimeout(
			() =>
				doUserSearch(
					value,
					'manager',
					(next) => (managerSearchLoading = next),
					(next) => (managerSearchResults = next)
				),
			300
		);
	}

	function handleSeniorManagerSearchInput(value: string) {
		seniorManagerSearchValue = value;
		if (seniorManagerDebounceTimer) clearTimeout(seniorManagerDebounceTimer);
		seniorManagerDebounceTimer = setTimeout(
			() =>
				doUserSearch(
					value,
					'senior-manager',
					(next) => (seniorManagerSearchLoading = next),
					(next) => (seniorManagerSearchResults = next)
				),
			300
		);
	}

	function selectManager(user: UserResult) {
		reportingManager = user.email ?? '';
		reportingManagerName = user.displayName ?? reportingManager;
		managerPopoverOpen = false;
	}

	function selectSeniorManager(user: UserResult) {
		seniorManager = user.email ?? '';
		seniorManagerName = user.displayName ?? seniorManager;
		seniorManagerPopoverOpen = false;
	}

	const normalizeEmail = (value: string) => value.trim().toLowerCase();
	const isValidEmail = (value: string) => /.+@.+\..+/.test(value.trim());

	async function autoPopulateManagersFromAgentEmail(email: string) {
		const term = email.trim();
		if (!isValidEmail(term)) return;
		const requestId = ++agentHierarchyRequest;
		try {
			const users = await searchUsersRemote({ q: term });
			if (requestId !== agentHierarchyRequest) return;
			const match = users.find((user) => normalizeEmail(user.email ?? '') === normalizeEmail(term));
			if (!match) return;

			reportingManager = (match.reportingManagerEmail ?? '').trim();
			reportingManagerName = reportingManager;
			seniorManager = (match.seniorManagerEmail ?? '').trim();
			seniorManagerName = seniorManager;
		} catch {
			// Keep current manual values if profile lookup fails.
		}
	}

	$effect(() => {
		if (agentHierarchyDebounceTimer) clearTimeout(agentHierarchyDebounceTimer);
		agentHierarchyDebounceTimer = setTimeout(() => {
			void autoPopulateManagersFromAgentEmail(agentEmail);
		}, 300);
	});

	function createAdditionalClient(): AdditionalClient {
		return {
			key: nextClientKey++,
			firstName: '',
			lastName: '',
			phone: '',
			email: '',
			titleDeedFileName: '',
			passportFileName: '',
			emiratesIdFileName: ''
		};
	}

	function addClient() {
		additionalClients = [...additionalClients, createAdditionalClient()];
	}

	function removeClient(key: number) {
		additionalClients = additionalClients.filter((client) => client.key !== key);
	}

	function setClientDocumentName(
		client: AdditionalClient | null,
		key: ClientDocumentKey,
		fileName: string
	) {
		if (!client) {
			if (key === 'titleDeed') titleDeedFileName = fileName;
			if (key === 'passport') passportFileName = fileName;
			if (key === 'emiratesId') emiratesIdFileName = fileName;
			return;
		}

		additionalClients = additionalClients.map((item) => {
			if (item.key !== client.key) return item;
			return {
				...item,
				...(key === 'titleDeed' && { titleDeedFileName: fileName }),
				...(key === 'passport' && { passportFileName: fileName }),
				...(key === 'emiratesId' && { emiratesIdFileName: fileName })
			};
		});
	}

	function getClientDocumentName(client: AdditionalClient | null, key: ClientDocumentKey) {
		if (!client) {
			if (key === 'titleDeed') return titleDeedFileName;
			if (key === 'passport') return passportFileName;
			return emiratesIdFileName;
		}
		if (key === 'titleDeed') return client.titleDeedFileName;
		if (key === 'passport') return client.passportFileName;
		return client.emiratesIdFileName;
	}

	function onFileSelect(
		event: Event,
		key: ClientDocumentKey,
		client: AdditionalClient | null = null
	) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		const fileName = file?.name ?? '';
		setClientDocumentName(client, key, fileName);
	}

	function removeFile(key: ClientDocumentKey, client: AdditionalClient | null = null) {
		setClientDocumentName(client, key, '');
	}

	function revokePreviewUrl(url?: string) {
		if (url) URL.revokeObjectURL(url);
	}

	function addMediaFiles(files: FileList | null) {
		if (!files || files.length === 0) return;

		const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
		const rejected: string[] = [];

		const incoming = Array.from(files)
			.filter((file) => {
				if (file.type.startsWith('video/') && !SUPPORTED_VIDEO_TYPES.includes(file.type)) {
					rejected.push(file.name);
					return false;
				}
				return true;
			})
			.map((file) => ({
				id: nextAssetId++,
				type: file.type.startsWith('video/') ? ('video' as const) : ('photo' as const),
				file,
				fileName: file.name,
				previewUrl: URL.createObjectURL(file)
			}));

		if (rejected.length > 0) {
			toast.error(`Unsupported video format: ${rejected.join(', ')}. Please use MP4 or WebM.`);
		}

		if (incoming.length > 0) {
			mediaAssets = [...mediaAssets, ...incoming];
		}
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

	function addFloorPlanFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		const incoming = Array.from(files)
			.filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf')
			.map((file) => ({
				id: nextFloorPlanId++,
				file,
				fileName: file.name,
				previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
			}));
		if (incoming.length > 0) {
			floorPlanAssets = [...floorPlanAssets, ...incoming];
		}
	}

	function onFloorPlanInputChange(event: Event) {
		addFloorPlanFiles((event.currentTarget as HTMLInputElement).files);
	}

	function removeFloorPlanAsset(id: number) {
		const assetToRemove = floorPlanAssets.find((asset) => asset.id === id);
		revokePreviewUrl(assetToRemove?.previewUrl);
		floorPlanAssets = floorPlanAssets.filter((asset) => asset.id !== id);
	}

	function resetForm() {
		listingType = 'internal';
		availableFor = '';
		furnishing = '';
		firstName = '';
		lastName = '';
		clientPhone = '';
		clientEmail = '';
		agentEmail = currentUserEmail || '';
		agentMobile = '';
		reportingManager = '';
		reportingManagerName = '';
		seniorManager = '';
		seniorManagerName = '';
		developerName = '';
		community = '';
		customCommunity = '';
		projectName = '';
		unitNo = '';
		projectType = '';
		unitType = '';
		unitTypeOther = '';
		bedrooms = '';
		unitArea = '';
		internalArea = '';
		balconyArea = '';
		plotSize = '';
		builtUpArea = '';
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
		additionalClients = [];
		nextClientKey = 2;
		unitStatus = '';
		paymentType = '';
		rentAmount = '';
		vacantDate = '';
		handoverYear = '';
		handoverQuarter = '';
		paymentPlan = '';
		paymentPlanOther = '';
		originalPrice = '';
		purchasePrice = '';
		amountPaid = '';
		price = '';
		for (const asset of mediaAssets) {
			revokePreviewUrl(asset.previewUrl);
		}
		for (const asset of floorPlanAssets) {
			revokePreviewUrl(asset.previewUrl);
		}
		mediaAssets = [];
		floorPlanAssets = [];
		activeTab = 'property-details';
		errors = {};
	}

	function validate() {
		const nextErrors: Record<string, string> = {};

		if (!availableFor) nextErrors.availableFor = 'Property available for is required';
		if (!furnishing) nextErrors.furnishing = 'Furnishing status is required';
		if (!city) nextErrors.city = 'City is required';
		if (!selectedLocation) nextErrors.location = 'Community is required';
		if (!agentEmail.trim()) nextErrors.agentEmail = 'Agent email is required';
		if (!agentMobile.trim()) nextErrors.agentMobile = 'Agent mobile number is required';
		if (!clientPhone.trim()) nextErrors.clientPhone = 'Mobile number is required';
		if (clientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim()))
			nextErrors.clientEmail = 'Valid email is required';
		for (const [index, client] of additionalClients.entries()) {
			const label = `Client ${index + 2}`;
			if (!client.phone.trim())
				nextErrors[`clients.${index}.phone`] = `${label} mobile number is required`;
			if (client.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim())) {
				nextErrors[`clients.${index}.email`] = `${label} valid email is required`;
			}
			if (!client.titleDeedFileName)
				nextErrors[`clients.${index}.titleDeedFileName`] = `${label} title deed/Qood is required`;
			if (listingType === 'portal' && !client.passportFileName) {
				nextErrors[`clients.${index}.passportFileName`] =
					`${label} passport is required for portal listing`;
			}
		}
		if (!reportingManager) nextErrors.reportingManager = 'Reporting manager is required';
		if (!seniorManager) nextErrors.seniorManager = 'Senior manager is required';
		if (!developerName.trim()) nextErrors.developerName = 'Developer name is required';
		if (!projectName.trim()) nextErrors.projectName = 'Project name is required';
		if (!projectType) nextErrors.projectType = 'Project type is required';
		if (!unitType) nextErrors.unitType = 'Unit type is required';
		if (unitType === 'Others' && !unitTypeOther.trim())
			nextErrors.unitTypeOther = 'Please specify unit type';
		if (requiresBedrooms && !bedrooms) nextErrors.bedrooms = 'Bedrooms are required';
		if (!unitArea && unitArea !== 0) nextErrors.unitArea = 'Unit area is required';
		if (!paymentType) nextErrors.paymentType = 'Payment type is required';
		if (isOffPlan) {
			if (!handoverYear) nextErrors.handoverYear = 'Handover year is required';
			if (!handoverQuarter) nextErrors.handoverQuarter = 'Handover quarter is required';
			if (!selectedPaymentPlan) nextErrors.paymentPlan = 'Payment plan is required';
			if (!amountPaid && amountPaid !== 0) nextErrors.amountPaid = 'Amount paid is required';
		}
		if (isReady) {
			if (!unitStatus) nextErrors.unitStatus = 'Unit status is required';
			if (unitStatus === 'Rented' && !rentAmount && rentAmount !== 0)
				nextErrors.rentAmount = 'Monthly rent is required';
		}
		if (!price && price !== 0) nextErrors.price = 'Expected selling price is required';

		if (!titleDeedFileName) nextErrors.titleDeedFileName = 'Title deed/Qood is required';
		if (!floorPlanAssets.length) nextErrors.floorPlanFiles = 'Floor plan is required';
		if (photoCount === 0) nextErrors.pictureFiles = 'At least one property photo is required';
		if (listingType === 'portal') {
			if (!passportFileName)
				nextErrors.passportFileName = 'Passport is required for portal listing';
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		if (!nextOpen) resetForm();
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
				// Client-side pre-validation for instant UX feedback
				if (!validate()) return;

				saving = true;
				try {
					await submit();
					const issues = createListing.fields.allIssues();
					if (!issues?.length) {
						form.reset();
						open = false;
						toast.success('Property listing added');
						resetForm();
						await invalidateAll();
					}
				} catch {
					toast.error('Failed to add listing. Please try again.');
				} finally {
					saving = false;
				}
			})}
		>
			<!-- Hidden inputs for programmatic fields -->
			<input type="hidden" name="createdByUid" value={currentUserUid} />
			<input type="hidden" name="createdByEmail" value={currentUserEmail} />
			<input type="hidden" name="listingType" value={listingType} />
			<input type="hidden" name="developerName" value={developerName} />
			<input type="hidden" name="availableFor" value={availableFor} />
			<input type="hidden" name="furnishing" value={furnishing} />
			<input type="hidden" name="city" value={city} />
			<input type="hidden" name="location" value={selectedLocation} />
			<input type="hidden" name="agentEmail" value={agentEmail} />
			<input type="hidden" name="agentMobile" value={agentMobile} />
			<input type="hidden" name="reportingManager" value={reportingManager} />
			<input type="hidden" name="seniorManager" value={seniorManager} />
			<input type="hidden" name="projectType" value={projectType} />
			<input type="hidden" name="unitType" value={unitType} />
			<input type="hidden" name="unitTypeOther" value={unitTypeOther} />
			<input type="hidden" name="bedrooms" value={bedrooms} />
			<input type="hidden" name="unitArea" value={unitArea} />
			<input type="hidden" name="internalArea" value={internalArea} />
			<input type="hidden" name="balconyArea" value={balconyArea} />
			<input type="hidden" name="plotSize" value={plotSize} />
			<input type="hidden" name="unitStatus" value={isOffPlan ? 'Off-Plan' : unitStatus} />
			<input type="hidden" name="paymentType" value={paymentType} />
			<input type="hidden" name="rentAmount" value={rentAmount} />
			<input type="hidden" name="vacantDate" value={vacantDate} />
			<input type="hidden" name="handoverYear" value={handoverYear} />
			<input type="hidden" name="handoverQuarter" value={handoverQuarter} />
			<input type="hidden" name="paymentPlan" value={selectedPaymentPlan} />
			<input type="hidden" name="originalPrice" value={originalPrice} />
			<input type="hidden" name="purchasePrice" value={purchasePrice} />
			<input type="hidden" name="amountPaid" value={amountPaid} />
			<input type="hidden" name="price" value={price} />
			<input
				type="file"
				name="pictureFiles[]"
				multiple
				bind:this={pictureInputRef}
				class="sr-only"
				tabindex="-1"
				aria-hidden="true"
			/>
			<input
				type="file"
				name="floorPlanFiles[]"
				multiple
				bind:this={floorPlanInputRef}
				class="sr-only"
				tabindex="-1"
				aria-hidden="true"
			/>
			<input
				type="file"
				name="videoFiles[]"
				multiple
				bind:this={videoInputRef}
				class="sr-only"
				tabindex="-1"
				aria-hidden="true"
			/>

			<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
				<Sheet.Title class="text-2xl font-medium">Add Property Listing</Sheet.Title>
				<div class="flex flex-row gap-2">
					<Button type="submit" size="sm" disabled={saving}>
						{#if saving}
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

				<div class="space-y-8" class:hidden={activeTab !== 'property-details'}>
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

					<Field.Set>
						<Field.Legend class="text-lg font-medium">Listing Overview</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
								<Field.Field>
									<Field.Label>Property Available For</Field.Label>
									<select
										bind:value={availableFor}
										class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
									>
										<option value="">Select Availability</option>
										<option>Sell</option>
										<option>Rent</option>
										<option>Both</option>
									</select>
									{#if errors.availableFor}<Field.Error class="text-sm text-destructive"
											>{errors.availableFor}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Furnishing Status</Field.Label>
									<select
										bind:value={furnishing}
										class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
									>
										<option value="">Select Furnishing</option>
										<option>Furnished</option>
										<option>Unfurnished</option>
										<option>Semi-Furnished</option>
									</select>
									{#if errors.furnishing}<Field.Error class="text-sm text-destructive"
											>{errors.furnishing}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>City</Field.Label>
									<select
										bind:value={city}
										class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
									>
										<option value="">Select City</option>
										{#each LISTING_CITIES as option (option)}
											<option>{option}</option>
										{/each}
									</select>
									{#if errors.city}<Field.Error class="text-sm text-destructive"
											>{errors.city}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Community Name</Field.Label>
									{#if city === 'Dubai'}
										<select
											bind:value={community}
											class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
										>
											<option value="">Select Community</option>
											{#each DUBAI_COMMUNITIES as option (option)}
												<option>{option}</option>
											{/each}
										</select>
									{:else}
										<Input bind:value={community} placeholder="e.g. Corniche, Al Reem Island" />
									{/if}
									{#if community === 'Others'}
										<Input
											class="mt-2"
											bind:value={customCommunity}
											placeholder="Specify community"
										/>
									{/if}
									{#if errors.location}<Field.Error class="text-sm text-destructive"
											>{errors.location}</Field.Error
										>{/if}
								</Field.Field>
							</div>
						</Field.Group>
					</Field.Set>

					<Field.Set>
						<div class="flex items-center justify-between gap-3">
							<Field.Legend class="text-lg font-medium">Client Details</Field.Legend>
							<Button type="button" variant="outline" size="sm" class="gap-2" onclick={addClient}>
								<PlusRound class="h-4 w-4" />
								Add Client
							</Button>
						</div>
						<Field.Group class="space-y-5">
							<div class="rounded-xl border border-border/60 bg-background/80 p-4">
								<div class="mb-4 flex items-center justify-between">
									<p class="text-base font-semibold">Client 1</p>
								</div>
								<div class="grid grid-cols-1 gap-x-4 gap-y-5 xl:grid-cols-3">
									<Field.Field>
										<Field.Label>First Name</Field.Label>
										<Input name="firstName" bind:value={firstName} placeholder="First Name" />
										{#if errors.firstName}<Field.Error class="text-sm text-destructive"
												>{errors.firstName}</Field.Error
											>{/if}
									</Field.Field>
									<Field.Field>
										<Field.Label>Last Name</Field.Label>
										<Input name="lastName" bind:value={lastName} placeholder="Last Name" />
										{#if errors.lastName}<Field.Error class="text-sm text-destructive"
												>{errors.lastName}</Field.Error
											>{/if}
									</Field.Field>
									<Field.Field>
										<Field.Label>Client Email</Field.Label>
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
									<Field.Field>
										<Field.Label>Client Mobile No</Field.Label>
										<Input
											name="clientPhone"
											bind:value={clientPhone}
											placeholder="Enter a phone number"
										/>
										{#if errors.clientPhone}<Field.Error class="text-sm text-destructive"
												>{errors.clientPhone}</Field.Error
											>{/if}
									</Field.Field>
								</div>
								<div class="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
									{#each clientDocumentConfigs as doc, documentIndex (doc.key)}
										<div class="flex min-w-0 items-start gap-4">
											<span
												class="mt-3.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
												>{documentIndex + 1}</span
											>
											<Field.Field class="min-w-0 flex-1">
												{#if getClientDocumentName(null, doc.key)}
													<div
														class="flex min-h-14 w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-muted-foreground/40 bg-background p-3"
													>
														<FileText class="h-9 w-9 shrink-0 text-orange-500" />
														<div class="min-w-0 flex-1">
															<span
																class="block max-w-full truncate text-sm font-medium"
																title={getClientDocumentName(null, doc.key)}
																>{getClientDocumentName(null, doc.key)}</span
															>
															<span class="block truncate text-xs text-muted-foreground"
																>{doc.label}</span
															>
														</div>
														<button
															type="button"
															onclick={() => removeFile(doc.key)}
															class="shrink-0 text-destructive hover:text-destructive/80"
															aria-label={`Remove ${doc.label}`}
														>
															<Trash2 class="h-5 w-5" />
														</button>
													</div>
												{:else}
													<label
														for={`client-1-${doc.key}`}
														class="flex min-h-14 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
													>
														<Upload class="h-5 w-5 shrink-0 text-gray-600" />
														<span class="truncate text-sm font-medium">{doc.uploadLabel}</span>
													</label>
												{/if}
												<Input
													id={`client-1-${doc.key}`}
													name={doc.inputName}
													class="sr-only"
													type="file"
													onchange={(event) => onFileSelect(event, doc.key)}
												/>
												{#if doc.key === 'titleDeed'}
													<p class="min-h-5 text-xs text-muted-foreground">Optional</p>
												{:else if listingType === 'portal'}
													<p class="min-h-5 text-xs text-muted-foreground">
														Required for portal listing
													</p>
												{:else}
													<p class="min-h-5 text-xs text-muted-foreground" aria-hidden="true">
														&nbsp;
													</p>
												{/if}
												{#if errors[doc.errorKey]}<Field.Error class="text-sm text-destructive"
														>{errors[doc.errorKey]}</Field.Error
													>{/if}
											</Field.Field>
										</div>
									{/each}
								</div>
							</div>

							{#each additionalClients as client, index (client.key)}
								<div class="rounded-xl border border-border/60 bg-background/80 p-4">
									<div class="mb-4 flex items-center justify-between">
										<p class="text-base font-semibold">Client {index + 2}</p>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onclick={() => removeClient(client.key)}
											aria-label={`Remove client ${index + 2}`}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
									<div class="grid grid-cols-1 gap-x-4 gap-y-5 xl:grid-cols-3">
										<Field.Field>
											<Field.Label>First Name</Field.Label>
											<Input
												name={`clients[${index}].firstName`}
												bind:value={client.firstName}
												placeholder="First Name"
											/>
										</Field.Field>
										<Field.Field>
											<Field.Label>Last Name</Field.Label>
											<Input
												name={`clients[${index}].lastName`}
												bind:value={client.lastName}
												placeholder="Last Name"
											/>
										</Field.Field>
										<Field.Field>
											<Field.Label>Client Email</Field.Label>
											<Input
												type="email"
												name={`clients[${index}].email`}
												bind:value={client.email}
												placeholder="Email"
											/>
											{#if errors[`clients.${index}.email`]}<Field.Error
													class="text-sm text-destructive"
													>{errors[`clients.${index}.email`]}</Field.Error
												>{/if}
										</Field.Field>
										<Field.Field>
											<Field.Label>Client Mobile No</Field.Label>
											<Input
												name={`clients[${index}].phone`}
												bind:value={client.phone}
												placeholder="Enter a phone number"
											/>
											{#if errors[`clients.${index}.phone`]}<Field.Error
													class="text-sm text-destructive"
													>{errors[`clients.${index}.phone`]}</Field.Error
												>{/if}
										</Field.Field>
									</div>
									<div class="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
										{#each clientDocumentConfigs as doc, documentIndex (doc.key)}
											<div class="flex min-w-0 items-start gap-4">
												<span
													class="mt-3.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
													>{documentIndex + 1}</span
												>
												<Field.Field class="min-w-0 flex-1">
													{#if getClientDocumentName(client, doc.key)}
														<div
															class="flex min-h-14 w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-muted-foreground/40 bg-background p-3"
														>
															<FileText class="h-9 w-9 shrink-0 text-orange-500" />
															<div class="min-w-0 flex-1">
																<span
																	class="block max-w-full truncate text-sm font-medium"
																	title={getClientDocumentName(client, doc.key)}
																	>{getClientDocumentName(client, doc.key)}</span
																>
																<span class="block truncate text-xs text-muted-foreground"
																	>{doc.label}</span
																>
															</div>
															<button
																type="button"
																onclick={() => removeFile(doc.key, client)}
																class="shrink-0 text-destructive hover:text-destructive/80"
																aria-label={`Remove ${doc.label}`}
															>
																<Trash2 class="h-5 w-5" />
															</button>
														</div>
													{:else}
														<label
															for={`client-${client.key}-${doc.key}`}
															class="flex min-h-14 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
														>
															<Upload class="h-5 w-5 shrink-0 text-gray-600" />
															<span class="truncate text-sm font-medium">{doc.uploadLabel}</span>
														</label>
													{/if}
													<Input
														id={`client-${client.key}-${doc.key}`}
														name={`clients[${index}].${doc.inputName}`}
														class="sr-only"
														type="file"
														onchange={(event) => onFileSelect(event, doc.key, client)}
													/>
													{#if doc.key === 'titleDeed'}
														<p class="min-h-5 text-xs text-muted-foreground">Optional</p>
													{:else if listingType === 'portal'}
														<p class="min-h-5 text-xs text-muted-foreground">
															Required for portal listing
														</p>
													{:else}
														<p class="min-h-5 text-xs text-muted-foreground" aria-hidden="true">
															&nbsp;
														</p>
													{/if}
													{#if errors[`clients.${index}.${doc.errorKey}`]}<Field.Error
															class="text-sm text-destructive"
															>{errors[`clients.${index}.${doc.errorKey}`]}</Field.Error
														>{/if}
												</Field.Field>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</Field.Group>
					</Field.Set>

					<Field.Set>
						<Field.Legend class="text-lg font-medium">Agent & Reporting</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
								<Field.Field>
									<Field.Label>Agent Official Email</Field.Label>
									<Input
										type="email"
										bind:value={agentEmail}
										placeholder="agent@indglobalrealty.com"
									/>
									{#if errors.agentEmail}<Field.Error class="text-sm text-destructive"
											>{errors.agentEmail}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Agent Mobile Number</Field.Label>
									<Input bind:value={agentMobile} placeholder="+971 52 123 4567" />
									{#if errors.agentMobile}<Field.Error class="text-sm text-destructive"
											>{errors.agentMobile}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Reporting Manager</Field.Label>
									<Popover.Root bind:open={managerPopoverOpen}>
										<Popover.Trigger
											class="flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
										>
											{#if reportingManager}
												<Avatar.Root class="h-5 w-5">
													<Avatar.Fallback class="text-[10px]">
														{getInitials(reportingManagerName || reportingManager)}
													</Avatar.Fallback>
												</Avatar.Root>
												<span class="truncate">{reportingManagerName || reportingManager}</span>
											{:else}
												<UserRound class="h-4 w-4 text-muted-foreground" />
												<span class="text-muted-foreground">Select manager...</span>
											{/if}
										</Popover.Trigger>
										<Popover.Content class="w-72 p-0" align="start">
											<Command.Root>
												<Command.Input
													placeholder="Search managers..."
													value={managerSearchValue}
													oninput={(event) =>
														handleManagerSearchInput((event.target as HTMLInputElement).value)}
												/>
												<Command.List>
													{#if managerSearchLoading}
														<div class="flex items-center justify-center py-4">
															<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
														</div>
													{:else if managerSearchResults.length === 0}
														<Command.Empty>
															{managerSearchValue.trim() ? 'No users found.' : 'Type to search...'}
														</Command.Empty>
													{:else}
														<Command.Group>
															{#each managerSearchResults as user (user.id)}
																<Command.Item value={user.id} onSelect={() => selectManager(user)}>
																	<Avatar.Root class="h-5 w-5">
																		{#if user.photoURL}
																			<Avatar.Image src={user.photoURL} alt={user.displayName} />
																		{/if}
																		<Avatar.Fallback class="text-[10px]">
																			{getInitials(user.displayName ?? user.email ?? 'User')}
																		</Avatar.Fallback>
																	</Avatar.Root>
																	<div class="ml-2 min-w-0">
																		<div class="truncate text-sm font-medium">
																			{user.displayName ?? user.email ?? 'User'}
																		</div>
																		<div class="truncate text-xs text-muted-foreground">
																			{user.email}
																		</div>
																	</div>
																</Command.Item>
															{/each}
														</Command.Group>
													{/if}
												</Command.List>
											</Command.Root>
										</Popover.Content>
									</Popover.Root>
									{#if errors.reportingManager}<Field.Error class="text-sm text-destructive"
											>{errors.reportingManager}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Senior Manager</Field.Label>
									<Popover.Root bind:open={seniorManagerPopoverOpen}>
										<Popover.Trigger
											class="flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
										>
											{#if seniorManager}
												<Avatar.Root class="h-5 w-5">
													<Avatar.Fallback class="text-[10px]">
														{getInitials(seniorManagerName || seniorManager)}
													</Avatar.Fallback>
												</Avatar.Root>
												<span class="truncate">{seniorManagerName || seniorManager}</span>
											{:else}
												<UserRound class="h-4 w-4 text-muted-foreground" />
												<span class="text-muted-foreground">Select senior manager...</span>
											{/if}
										</Popover.Trigger>
										<Popover.Content class="w-72 p-0" align="start">
											<Command.Root>
												<Command.Input
													placeholder="Search senior managers..."
													value={seniorManagerSearchValue}
													oninput={(event) =>
														handleSeniorManagerSearchInput(
															(event.target as HTMLInputElement).value
														)}
												/>
												<Command.List>
													{#if seniorManagerSearchLoading}
														<div class="flex items-center justify-center py-4">
															<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
														</div>
													{:else if seniorManagerSearchResults.length === 0}
														<Command.Empty>
															{seniorManagerSearchValue.trim()
																? 'No users found.'
																: 'Type to search...'}
														</Command.Empty>
													{:else}
														<Command.Group>
															{#each seniorManagerSearchResults as user (user.id)}
																<Command.Item
																	value={user.id}
																	onSelect={() => selectSeniorManager(user)}
																>
																	<Avatar.Root class="h-5 w-5">
																		{#if user.photoURL}
																			<Avatar.Image src={user.photoURL} alt={user.displayName} />
																		{/if}
																		<Avatar.Fallback class="text-[10px]">
																			{getInitials(user.displayName ?? user.email ?? 'User')}
																		</Avatar.Fallback>
																	</Avatar.Root>
																	<div class="ml-2 min-w-0">
																		<div class="truncate text-sm font-medium">
																			{user.displayName ?? user.email ?? 'User'}
																		</div>
																		<div class="truncate text-xs text-muted-foreground">
																			{user.email}
																		</div>
																	</div>
																</Command.Item>
															{/each}
														</Command.Group>
													{/if}
												</Command.List>
											</Command.Root>
										</Popover.Content>
									</Popover.Root>
									{#if errors.seniorManager}<Field.Error class="text-sm text-destructive"
											>{errors.seniorManager}</Field.Error
										>{/if}
								</Field.Field>
							</div>
						</Field.Group>
					</Field.Set>

					<Field.Set>
						<Field.Legend class="text-lg font-medium">Property Details</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
								<Field.Field>
									<Field.Label>Developer Name</Field.Label>
									<Popover.Root bind:open={developerPopoverOpen}>
										<Popover.Trigger class="w-full">
											<Button
												variant="outline"
												type="button"
												role="combobox"
												aria-expanded={developerPopoverOpen}
												class="h-9 w-full justify-start gap-2"
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
																	developerName = item.value;
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
									{#if errors.developerName}<Field.Error class="text-sm text-destructive"
											>{errors.developerName}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Project Name</Field.Label>
									<InputGroup.Root id="project">
										<InputGroup.Input
											name="projectName"
											bind:value={projectName}
											placeholder="Select Project"
										/>
										<InputGroup.Addon>
											<Building />
										</InputGroup.Addon>
									</InputGroup.Root>
									{#if errors.projectName}<Field.Error class="text-sm text-destructive"
											>{errors.projectName}</Field.Error
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
									<Field.Label>Project Type</Field.Label>
									<select
										bind:value={projectType}
										class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
									>
										<option value="">Select Type</option>
										<option>Off-Plan Property</option>
										<option>Ready Property</option>
									</select>
									{#if errors.projectType}<Field.Error class="text-sm text-destructive"
											>{errors.projectType}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Unit Type</Field.Label>
									<select
										bind:value={unitType}
										class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
									>
										<option value="">Select Unit Type</option>
										{#each UNIT_TYPES as option (option)}
											<option>{option}</option>
										{/each}
									</select>
									{#if errors.unitType}<Field.Error class="text-sm text-destructive"
											>{errors.unitType}</Field.Error
										>{/if}
								</Field.Field>
								{#if unitType === 'Others'}
									<Field.Field>
										<Field.Label>Please specify Unit Type</Field.Label>
										<Input bind:value={unitTypeOther} placeholder="e.g. Penthouse, Plot" />
										{#if errors.unitTypeOther}<Field.Error class="text-sm text-destructive"
												>{errors.unitTypeOther}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
								{#if requiresBedrooms}
									<Field.Field>
										<Field.Label>No. of Bedrooms</Field.Label>
										<select
											bind:value={bedrooms}
											class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
										>
											<option value="">Select Bedrooms</option>
											{#each BEDROOM_OPTIONS as option (option)}
												<option>{option}</option>
											{/each}
										</select>
										{#if errors.bedrooms}<Field.Error class="text-sm text-destructive"
												>{errors.bedrooms}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
								<Field.Field>
									<Field.Label>Unit Area (sqft)</Field.Label>
									<Input type="number" bind:value={unitArea} placeholder="e.g. 1200" />
									{#if errors.unitArea}<Field.Error class="text-sm text-destructive"
											>{errors.unitArea}</Field.Error
										>{/if}
								</Field.Field>
								{#if unitType === 'Apartment' || unitType === 'Studio'}
									<Field.Field>
										<Field.Label>Internal Area (sqft)</Field.Label>
										<Input type="number" bind:value={internalArea} placeholder="e.g. 950" />
									</Field.Field>
									<Field.Field>
										<Field.Label>Balcony Area (sqft)</Field.Label>
										<Input type="number" bind:value={balconyArea} placeholder="e.g. 250" />
									</Field.Field>
								{/if}
								{#if unitType === 'Villa' || unitType === 'Townhouse' || unitType === 'Mansion'}
									<Field.Field>
										<Field.Label>Plot Size (sqft)</Field.Label>
										<Input type="number" bind:value={plotSize} placeholder="e.g. 4500" />
									</Field.Field>
									<Field.Field>
										<Field.Label>Built Up Area (sqft)</Field.Label>
										<Input name="builtUpArea" type="number" bind:value={builtUpArea} />
									</Field.Field>
								{/if}
								<Field.Field>
									<Field.Label>Payment Type</Field.Label>
									<select
										bind:value={paymentType}
										class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
									>
										<option value="">Select Payment Type</option>
										<option>Cash</option>
										<option>Finance (Cash + Mortgage)</option>
									</select>
									{#if errors.paymentType}<Field.Error class="text-sm text-destructive"
											>{errors.paymentType}</Field.Error
										>{/if}
								</Field.Field>
								{#if isReady}
									<Field.Field>
										<Field.Label>Unit Status</Field.Label>
										<select
											bind:value={unitStatus}
											class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
										>
											<option value="">Select Status</option>
											<option>Rented</option>
											<option>Vacant</option>
										</select>
										{#if errors.unitStatus}<Field.Error class="text-sm text-destructive"
												>{errors.unitStatus}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
								{#if isRented}
									<Field.Field>
										<Field.Label>Current Monthly Rent (AED)</Field.Label>
										<Input type="number" bind:value={rentAmount} />
										{#if errors.rentAmount}<Field.Error class="text-sm text-destructive"
												>{errors.rentAmount}</Field.Error
											>{/if}
									</Field.Field>
									<Field.Field>
										<Field.Label>Expected Vacancy Date</Field.Label>
										<Input type="date" bind:value={vacantDate} />
									</Field.Field>
								{/if}
								{#if isOffPlan}
									<Field.Field>
										<Field.Label>Handover Year</Field.Label>
										<select
											bind:value={handoverYear}
											class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
										>
											<option value="">Select Year</option>
											{#each HANDOVER_YEARS as option (option)}
												<option>{option}</option>
											{/each}
										</select>
										{#if errors.handoverYear}<Field.Error class="text-sm text-destructive"
												>{errors.handoverYear}</Field.Error
											>{/if}
									</Field.Field>
									<Field.Field>
										<Field.Label>Handover Quarter</Field.Label>
										<select
											bind:value={handoverQuarter}
											class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
										>
											<option value="">Select Quarter</option>
											{#each HANDOVER_QUARTERS as option (option)}
												<option>{option}</option>
											{/each}
										</select>
										{#if errors.handoverQuarter}<Field.Error class="text-sm text-destructive"
												>{errors.handoverQuarter}</Field.Error
											>{/if}
									</Field.Field>
									<Field.Field>
										<Field.Label>Payment Plan</Field.Label>
										<select
											bind:value={paymentPlan}
											class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#F04C06] focus-visible:ring-[3px] focus-visible:ring-[#FFD3A8]"
										>
											<option value="">Select Payment Plan</option>
											{#each PAYMENT_PLANS as option (option)}
												<option>{option}</option>
											{/each}
										</select>
										{#if errors.paymentPlan}<Field.Error class="text-sm text-destructive"
												>{errors.paymentPlan}</Field.Error
											>{/if}
									</Field.Field>
									{#if paymentPlan === 'Others'}
										<Field.Field>
											<Field.Label>Please specify Payment Plan</Field.Label>
											<Input bind:value={paymentPlanOther} placeholder="e.g. Custom Plan" />
										</Field.Field>
									{/if}
									<Field.Field>
										<Field.Label>Amount Paid Till Now (AED)</Field.Label>
										<Input type="number" bind:value={amountPaid} />
										{#if errors.amountPaid}<Field.Error class="text-sm text-destructive"
												>{errors.amountPaid}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
								<Field.Field>
									<Field.Label>Last Transaction Price as per DLD/DXB Interact (AED)</Field.Label>
									<Input type="number" bind:value={originalPrice} />
								</Field.Field>
								<Field.Field>
									<Field.Label>Original Price (AED)</Field.Label>
									<Input type="number" bind:value={purchasePrice} />
								</Field.Field>
								<Field.Field>
									<Field.Label>Expected Selling Price (AED)</Field.Label>
									<Input type="number" bind:value={price} />
									{#if errors.price}<Field.Error class="text-sm text-destructive"
											>{errors.price}</Field.Error
										>{/if}
								</Field.Field>
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
									<Input bind:value={city} placeholder="City" />
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
				</div>
				<div class:hidden={activeTab !== 'property-photo-videos'}>
					<Field.Set>
						<Field.Legend class="text-lg font-medium">Floor Plans</Field.Legend>
						<Field.Group>
							<label
								for="floor-plan-input"
								class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm font-semibold text-foreground transition hover:border-foreground/60"
							>
								<Upload class="h-5 w-5 text-gray-600" />
								Upload Floor Plan
							</label>
							<Input
								id="floor-plan-input"
								class="sr-only"
								type="file"
								accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
								multiple
								onchange={onFloorPlanInputChange}
							/>
							{#if errors.floorPlanFiles}<Field.Error class="text-sm text-destructive"
									>{errors.floorPlanFiles}</Field.Error
								>{/if}
							{#if floorPlanAssets.length > 0}
								<div class="grid gap-3 xl:grid-cols-2">
									{#each floorPlanAssets as asset (asset.id)}
										<div
											class="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-2"
										>
											{#if asset.previewUrl}
												<img
													src={asset.previewUrl}
													alt={asset.fileName}
													class="h-16 w-20 shrink-0 rounded-md object-cover"
												/>
											{:else}
												<div
													class="flex h-16 w-20 shrink-0 items-center justify-center rounded-md bg-muted text-xs"
												>
													<FileText class="h-6 w-6 text-muted-foreground" />
												</div>
											{/if}
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-medium" title={asset.fileName}>
													{asset.fileName}
												</p>
												<p class="truncate text-xs text-muted-foreground">Floor plan</p>
											</div>
											<button
												type="button"
												class="shrink-0 text-destructive hover:text-destructive/80"
												onclick={() => removeFloorPlanAsset(asset.id)}
												aria-label={`Remove ${asset.fileName}`}
											>
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</Field.Group>
					</Field.Set>
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
									accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm"
									multiple
									onchange={onMediaInputChange}
								/>
							</div>
							{#if errors.pictureFiles}<Field.Error class="text-sm text-destructive"
									>{errors.pictureFiles}</Field.Error
								>{/if}

							{#if mediaAssets.length > 0}
								<div class="grid gap-3 xl:grid-cols-2">
									{#each mediaAssets as asset (asset.id)}
										<div
											class="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-2"
										>
											{#if asset.type === 'photo' && asset.previewUrl}
												<img
													src={asset.previewUrl}
													alt={asset.fileName}
													class="h-16 w-20 shrink-0 rounded-md object-cover"
												/>
											{:else if asset.type === 'video' && asset.previewUrl}
												<video
													src={asset.previewUrl}
													class="h-16 w-20 shrink-0 rounded-md object-cover"
													controls
												>
													<track kind="captions" />
												</video>
											{/if}
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-medium" title={asset.fileName}>
													{asset.fileName}
												</p>
												<p class="truncate text-xs text-muted-foreground">
													{asset.type === 'photo' ? 'Property photo' : 'Property video'}
												</p>
											</div>
											<button
												type="button"
												class="shrink-0 text-destructive hover:text-destructive/80"
												onclick={() => removeMediaAsset(asset.id)}
												aria-label={`Remove ${asset.fileName}`}
											>
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</Field.Group>
					</Field.Set>
				</div>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
