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
	import { getInitials } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import Building from '~icons/lucide/building';
	import FileText from '~icons/lucide/file-text';
	import Hammer from '~icons/lucide/hammer';
	import Home from '~icons/lucide/home';
	import Loader2 from '~icons/lucide/loader-2';
	import Save from '~icons/lucide/save';
	import Trash2 from '~icons/lucide/trash-2';
	import Upload from '~icons/lucide/upload';
	import UserRound from '~icons/lucide/user-round';
	import { searchUsers as searchUsersRemote } from '../../users.remote';
	import { updateListing } from './listing.remote';

	type PropertyType = 'apartment' | 'townhouse' | 'villa' | 'commercial' | 'plot';
	type ListingType = Listing['listingType'];
	type CommercialSubType = 'office' | 'warehouse';

	let {
		listing,
		open = $bindable(false)
	}: {
		listing: Listing;
		open: boolean;
	} = $props();

	// Split clientName back into first/last
	function splitName(fullName: string): [string, string] {
		const parts = fullName.trim().split(' ');
		const last = parts.length > 1 ? parts.slice(1).join(' ') : '';
		return [parts[0] ?? '', last];
	}

	let listingType = $state<ListingType>('internal');
	let availableFor = $state('');
	let furnishing = $state('');
	let sampleCity = $state('');
	let sampleLocation = $state('');
	let agentEmail = $state('');
	let agentMobile = $state('');
	let reportingManager = $state('');
	let reportingManagerName = $state('');
	let seniorManager = $state('');
	let seniorManagerName = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let clientPhone = $state('');
	let clientEmail = $state('');
	let developer = $state('');
	let community = $state('');
	let project = $state('');
	let unitNo = $state('');
	let projectType = $state('');
	let unitType = $state('');
	let unitTypeOther = $state('');
	let bedrooms = $state('');
	let propertyType = $state<PropertyType>('apartment');
	let commercialSubType = $state<CommercialSubType>('office');
	let bedroomType = $state<string>('studio');
	let propertySize = $state<number | ''>('');
	let unitArea = $state<number | ''>('');
	let internalArea = $state<number | ''>('');
	let balconyArea = $state<number | ''>('');
	let plotSize = $state<number | ''>('');
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
	// File name display state – pre-filled from existing listing data
	let titleDeedFileName = $state('');
	let passportFileName = $state('');
	let emiratesIdFileName = $state('');
	let buyingPrice = $state<number | ''>(0);
	let liquidityInvested = $state<number | ''>(0);
	let sellingPrice = $state<number | ''>(0);
	let dxbPrice = $state<number | ''>('');
	let unitStatus = $state('');
	let paymentType = $state('');
	let rentAmount = $state<number | ''>('');
	let vacantDate = $state('');
	let handoverYear = $state('');
	let handoverQuarter = $state('');
	let paymentPlan = $state('');
	let originalPrice = $state<number | ''>('');
	let purchasePrice = $state<number | ''>('');
	let amountPaid = $state<number | ''>('');
	let listedByEmails = $state<string[]>(['']);

	// Track whether a new file was picked for each attachment (so we can clear the existing display)
	let titleDeedReplaced = $state(false);
	let passportReplaced = $state(false);
	let emiratesIdReplaced = $state(false);

	let mediaAssets = $state<
		{ id: number; type: 'photo' | 'video'; file: File; fileName: string; previewUrl?: string }[]
	>([]);
	let existingMediaAssets = $state<{ type: 'photo' | 'video'; fileName: string; url: string }[]>(
		[]
	);
	let existingFloorPlanAssets = $state<{ fileName: string; url: string }[]>([]);
	let nextAssetId = $state(1);
	let errors = $state<Record<string, string>>({});
	let saving = $state(false);
	let developerPopoverOpen = $state(false);
	let pictureInputRef: HTMLInputElement | undefined = $state(undefined);
	let videoInputRef: HTMLInputElement | undefined = $state(undefined);
	let developerSearchValue = $state('');
	let managerPopoverOpen = $state(false);
	let seniorManagerPopoverOpen = $state(false);
	let managerSearchValue = $state('');
	let seniorManagerSearchValue = $state('');
	let managerSearchResults = $state<UserResult[]>([]);
	let seniorManagerSearchResults = $state<UserResult[]>([]);
	let managerSearchLoading = $state(false);
	let seniorManagerSearchLoading = $state(false);
	let managerDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let seniorManagerDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let activeTab = $state<'property-details' | 'property-photo-videos'>('property-details');
	let initializedListingId = $state<string | null>(null);
	let agentHierarchyDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let agentHierarchyRequest = 0;

	type UserResult = {
		id: string;
		email: string | null;
		displayName?: string | null;
		photoURL?: string | null;
		reportingManagerEmail?: string | null;
		seniorManagerEmail?: string | null;
	};

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

	const normalizeEmail = (value: string) => value.trim().toLowerCase();
	const isValidEmail = (value: string) => /.+@.+\..+/.test(value.trim());

	async function autoPopulateManagersFromAgentEmail(email: string) {
		const term = email.trim();
		if (!isValidEmail(term)) return;
		const requestId = ++agentHierarchyRequest;
		try {
			const users = await searchUsersRemote({ q: term });
			if (requestId !== agentHierarchyRequest) return;
			const match = users.find(
				(user: UserResult) => normalizeEmail(user.email ?? '') === normalizeEmail(term)
			);
			if (!match) return;

			if (!reportingManager.trim()) {
				reportingManager = (match.reportingManagerEmail ?? '').trim();
				reportingManagerName = reportingManager;
			}
			if (!seniorManager.trim()) {
				seniorManager = (match.seniorManagerEmail ?? '').trim();
				seniorManagerName = seniorManager;
			}
		} catch {
			// Keep existing values on lookup failure.
		}
	}

	$effect(() => {
		if (agentHierarchyDebounceTimer) clearTimeout(agentHierarchyDebounceTimer);
		agentHierarchyDebounceTimer = setTimeout(() => {
			void autoPopulateManagersFromAgentEmail(agentEmail);
		}, 300);
	});

	// Re-populate fields when opening or switching to another listing.
	// Guarding by open + listing id avoids update loops and prevents tab resets while editing.
	$effect(() => {
		if (!open) return;
		if (initializedListingId === listing.id) return;
		initializedListingId = listing.id;

		const l = listing;
		const [fn, ln] = splitName(l.clientName);
		listingType = l.listingType;
		availableFor = l.availableFor ?? 'Sell';
		furnishing = l.furnishing ?? 'Unfurnished';
		sampleCity = l.city ?? l.propertyAddress?.city ?? '';
		sampleLocation = l.location ?? l.location ?? l.propertyAddress?.area ?? '';
		agentEmail = l.agentEmail ?? l.createdByEmail ?? '';
		agentMobile = l.agentMobile ?? '';
		reportingManager = l.reportingManager ?? '';
		reportingManagerName = l.reportingManager ?? '';
		seniorManager = l.seniorManager ?? '';
		seniorManagerName = l.seniorManager ?? '';
		firstName = fn;
		lastName = ln;
		clientPhone = l.clientPhone;
		clientEmail = l.clientEmail;
		developer = l.developerName;
		community = l.location ?? '';
		project = l.projectName;
		unitNo = l.unitNo;
		projectType = l.projectType ?? 'Ready Property';
		unitType = l.unitType ?? (l.unitType === 'apartment' ? 'Apartment' : l.unitType);
		unitTypeOther = l.unitTypeOther ?? '';
		bedrooms = l.bedrooms ?? '';
		propertyType =
			l.unitType === 'Townhouse'
				? 'townhouse'
				: l.unitType === 'Villa' || l.unitType === 'Mansion'
					? 'villa'
					: l.unitType === 'Commercial' || l.unitType === 'Retail'
						? 'commercial'
						: l.unitType === 'Plot'
							? 'plot'
							: 'apartment';
		commercialSubType = 'office';
		bedroomType = l.bedrooms ?? 'studio';
		propertySize = l.unitArea ?? '';
		unitArea = l.unitArea ?? l.unitArea ?? l.builtUpArea ?? l.plotSize ?? '';
		internalArea = l.internalArea ?? '';
		balconyArea = l.balconyArea ?? '';
		plotSize = l.plotSize ?? l.plotSize ?? '';
		plotArea = l.plotSize ?? '';
		builtUpArea = l.builtUpArea ?? '';
		grossFloorArea = l.builtUpArea ?? '';
		addressLine1 = l.propertyAddress?.addressLine1 ?? '';
		addressLine2 = l.propertyAddress?.addressLine2 ?? '';
		buildingName = l.propertyAddress?.buildingName ?? '';
		street = l.propertyAddress?.street ?? '';
		area = l.propertyAddress?.area ?? '';
		city = l.propertyAddress?.city ?? '';
		country = l.propertyAddress?.country ?? '';
		postalCode = l.propertyAddress?.postalCode ?? '';
		landmark = l.propertyAddress?.landmark ?? '';
		titleDeedFileName = l.titleDeedFileName ?? '';
		passportFileName = l.passportFileName ?? '';
		emiratesIdFileName = l.emiratesIdFileName ?? '';
		buyingPrice = l.purchasePrice ?? '';
		liquidityInvested = l.amountPaid ?? '';
		sellingPrice = l.price;
		dxbPrice = l.originalPrice ?? '';
		unitStatus = l.unitStatus ?? (l.projectType === 'Off-Plan Property' ? 'Off-Plan' : 'Vacant');
		paymentType = l.paymentType ?? 'Cash';
		rentAmount = l.rentAmount ?? '';
		vacantDate = l.vacantDate ?? '';
		handoverYear = l.handoverYear ?? '';
		handoverQuarter = l.handoverQuarter ?? '';
		paymentPlan = l.paymentPlan ?? '';
		originalPrice = l.originalPrice ?? l.originalPrice ?? '';
		purchasePrice = l.purchasePrice ?? l.purchasePrice ?? '';
		amountPaid = l.amountPaid ?? l.amountPaid ?? '';
		listedByEmails = l.listedByEmails?.length ? [...l.listedByEmails] : [''];
		titleDeedReplaced = false;
		passportReplaced = false;
		emiratesIdReplaced = false;
		existingMediaAssets = (l.mediaAssets ?? []).filter(
			(asset): asset is { type: 'photo' | 'video'; fileName: string; url: string } =>
				!!asset?.url && !!asset?.fileName && (asset.type === 'photo' || asset.type === 'video')
		);
		existingFloorPlanAssets = (l.floorPlanAssets ?? []).filter(
			(asset): asset is { fileName: string; url: string } => !!asset?.url && !!asset?.fileName
		);
		mediaAssets = [];
		managerSearchValue = '';
		seniorManagerSearchValue = '';
		managerSearchResults = [];
		seniorManagerSearchResults = [];
		managerPopoverOpen = false;
		seniorManagerPopoverOpen = false;
		activeTab = 'property-details';
		errors = {};
	});

	const apartmentBedroomTypes: string[] = [
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
	const villaTownhouseBedroomTypes: string[] = ['2bed', '3bed', '4bed', '5bed', '6-7bed'];
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
		developers.find((item) => item.value === developer)?.label ?? (developer || 'Developer')
	);
	const sanitizedListedByEmails = $derived(listedByEmails.map((e) => e.trim()).filter(Boolean));
	const retainedMediaUrls = $derived(existingMediaAssets.map((asset) => asset.url));
	const retainedFloorPlanUrls = $derived(existingFloorPlanAssets.map((asset) => asset.url));
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
		if (key === 'titleDeed') {
			titleDeedFileName = fileName;
			titleDeedReplaced = true;
		}
		if (key === 'passport') {
			passportFileName = fileName;
			passportReplaced = true;
		}
		if (key === 'emiratesId') {
			emiratesIdFileName = fileName;
			emiratesIdReplaced = true;
		}
	}

	function removeFile(key: 'titleDeed' | 'passport' | 'emiratesId') {
		if (key === 'titleDeed') {
			titleDeedFileName = '';
			titleDeedReplaced = false;
		}
		if (key === 'passport') {
			passportFileName = '';
			passportReplaced = false;
		}
		if (key === 'emiratesId') {
			emiratesIdFileName = '';
			emiratesIdReplaced = false;
		}
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
		if (incoming.length > 0) mediaAssets = [...mediaAssets, ...incoming];
	}

	function onMediaInputChange(event: Event) {
		addMediaFiles((event.currentTarget as HTMLInputElement).files);
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

	function removeExistingMediaAsset(url: string) {
		existingMediaAssets = existingMediaAssets.filter((asset) => asset.url !== url);
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
		if (dxbPrice !== '' && Number(dxbPrice) < 0)
			nextErrors.dxbPrice = 'DxB price must be 0 or greater';
		const validListedBy = listedByEmails.map((v) => v.trim()).filter(Boolean);
		if (!validListedBy.length)
			nextErrors.listedByEmails = 'At least one listed by email is required';
		if (propertyType === 'apartment' && !propertySize && propertySize !== 0)
			nextErrors.propertySize = 'Property size is required for apartment';
		if (propertyType === 'townhouse' || propertyType === 'villa') {
			if (!plotArea && plotArea !== 0) nextErrors.plotArea = 'Plot area is required';
			if (!builtUpArea && builtUpArea !== 0) nextErrors.builtUpArea = 'Built up area is required';
		}
		if (propertyType === 'commercial') {
			if (!propertySize && propertySize !== 0)
				nextErrors.propertySize = 'Property size is required';
			if (commercialSubType === 'warehouse' && !grossFloorArea && grossFloorArea !== 0)
				nextErrors.grossFloorArea = 'Gross floor area is required for warehouse';
		}
		if (propertyType === 'plot' && !plotArea && plotArea !== 0)
			nextErrors.plotArea = 'Plot area is required for plot';
		if (listingType === 'portal') {
			if (!titleDeedFileName)
				nextErrors.titleDeedFileName = 'Title deed/Qood is required for portal listing';
			if (!passportFileName)
				nextErrors.passportFileName = 'Passport is required for portal listing';
		}
		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		if (!nextOpen) initializedListingId = null;
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content side="right" class="w-200 max-w-200 overflow-y-auto sm:w-200 sm:max-w-200">
		<form
			enctype="multipart/form-data"
			{...updateListing.enhance(async ({ form, submit }) => {
				if (!validate()) return;
				saving = true;
				try {
					await submit();
					const issues = updateListing.fields.allIssues();
					if (!issues?.length) {
						form.reset();
						open = false;
						toast.success('Listing updated successfully');
						await invalidateAll();
					}
				} catch {
					toast.error('Failed to update listing. Please try again.');
				} finally {
					saving = false;
				}
			})}
		>
			<!-- Hidden fields -->
			<input type="hidden" name="listingId" value={listing.id} />
			<input type="hidden" name="listingType" value={listingType} />
			<input type="hidden" name="developerName" value={developer} />
			<input type="hidden" name="availableFor" value={availableFor} />
			<input type="hidden" name="furnishing" value={furnishing} />
			<input type="hidden" name="city" value={sampleCity} />
			<input type="hidden" name="location" value={sampleLocation} />
			<input type="hidden" name="agentEmail" value={agentEmail} />
			<input type="hidden" name="agentMobile" value={agentMobile || clientPhone} />
			<input
				type="hidden"
				name="reportingManager"
				value={reportingManager || listing.createdByEmail}
			/>
			<input type="hidden" name="seniorManager" value={seniorManager || listing.createdByEmail} />
			<input type="hidden" name="projectType" value={projectType} />
			<input type="hidden" name="unitType" value={unitType} />
			<input type="hidden" name="unitTypeOther" value={unitTypeOther} />
			<input type="hidden" name="bedrooms" value={bedrooms} />
			<input type="hidden" name="unitArea" value={unitArea} />
			<input type="hidden" name="internalArea" value={internalArea} />
			<input type="hidden" name="balconyArea" value={balconyArea} />
			<input type="hidden" name="plotSize" value={plotSize} />
			<input type="hidden" name="unitStatus" value={unitStatus} />
			<input type="hidden" name="paymentType" value={paymentType} />
			<input type="hidden" name="rentAmount" value={rentAmount} />
			<input type="hidden" name="vacantDate" value={vacantDate} />
			<input type="hidden" name="handoverYear" value={handoverYear} />
			<input type="hidden" name="handoverQuarter" value={handoverQuarter} />
			<input type="hidden" name="paymentPlan" value={paymentPlan} />
			<input type="hidden" name="originalPrice" value={originalPrice} />
			<input type="hidden" name="purchasePrice" value={purchasePrice} />
			<input type="hidden" name="amountPaid" value={amountPaid} />
			<input type="hidden" name="price" value={sellingPrice} />
			<input type="hidden" name="listedByEmails" value={JSON.stringify(sanitizedListedByEmails)} />
			<input type="hidden" name="retainedMediaUrls" value={JSON.stringify(retainedMediaUrls)} />
			<input
				type="hidden"
				name="retainedFloorPlanUrls"
				value={JSON.stringify(retainedFloorPlanUrls)}
			/>
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
				name="videoFiles[]"
				multiple
				bind:this={videoInputRef}
				class="sr-only"
				tabindex="-1"
				aria-hidden="true"
			/>

			<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
				<Sheet.Title class="text-2xl font-medium">Edit Property Listing</Sheet.Title>
				<div class="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={saving}
						onclick={() => (open = false)}
					>
						Cancel
					</Button>
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

			{#if (updateListing.fields.allIssues()?.length ?? 0) > 0}
				<div class="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
					{#each updateListing.fields.allIssues() as issue, i (i)}
						<p class="text-sm text-destructive">{issue.message}</p>
					{/each}
				</div>
			{/if}

			<div class="flex flex-col gap-8 p-6">
				<!-- Tab bar -->
				<div class="border-b border-border/60">
					<div class="flex items-center gap-8">
						<button
							type="button"
							class={`border-b-2 px-1 py-3 text-base font-medium transition-colors ${activeTab === 'property-details' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
							onclick={() => (activeTab = 'property-details')}
						>
							Property Details
						</button>
						<button
							type="button"
							class={`border-b-2 px-1 py-3 text-base font-medium transition-colors ${activeTab === 'property-photo-videos' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
							onclick={() => (activeTab = 'property-photo-videos')}
						>
							Property Photo/Videos
						</button>
					</div>
				</div>

				<div class:hidden={activeTab !== 'property-details'}>
					<!-- Listing Type -->
					<Field.Set>
						<Field.Legend class="text-lg font-medium">Listing Type</Field.Legend>
						<div class="mt-3 flex gap-2">
							<Button
								type="button"
								variant={listingType === 'internal' ? 'default' : 'outline'}
								onclick={() => (listingType = 'internal')}>Internal</Button
							>
							<Button
								type="button"
								variant={listingType === 'portal' ? 'default' : 'outline'}
								onclick={() => (listingType = 'portal')}>Portal</Button
							>
						</div>
					</Field.Set>

					<!-- Client Details -->
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

					<!-- Agent & Reporting -->
					<Field.Set>
						<Field.Legend class="text-lg font-medium">Agent & Reporting</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-2 gap-4">
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
											class="flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-accent"
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
											class="flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm hover:bg-accent"
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

					<!-- Property Details -->
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
										<InputGroup.Input bind:value={community} placeholder="Community (Optional)" />
										<InputGroup.Addon><Home /></InputGroup.Addon>
									</InputGroup.Root>
								</Field.Field>
								<Field.Field>
									<Field.Label>Project Name</Field.Label>
									<InputGroup.Root id="project">
										<InputGroup.Input
											name="projectName"
											bind:value={project}
											placeholder="Select Project"
										/>
										<InputGroup.Addon><Building /></InputGroup.Addon>
									</InputGroup.Root>
									{#if errors.project}<Field.Error class="text-sm text-destructive"
											>{errors.project}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Unit No</Field.Label>
									<InputGroup.Root id="unitNo">
										<InputGroup.Input name="unitNo" bind:value={unitNo} placeholder="Unit No" />
										<InputGroup.Addon><Home /></InputGroup.Addon>
									</InputGroup.Root>
									{#if errors.unitNo}<Field.Error class="text-sm text-destructive"
											>{errors.unitNo}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Property Type</Field.Label>
									<select
										bind:value={propertyType}
										class="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
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
											bind:value={commercialSubType}
											class="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
										>
											<option value="office">Office</option>
											<option value="warehouse">Warehouse</option>
										</select>
									</Field.Field>
								{/if}
								{#if propertyType === 'apartment' || propertyType === 'townhouse' || propertyType === 'villa'}
									<Field.Field>
										<Field.Label>Bedroom Type</Field.Label>
										<select
											bind:value={bedroomType}
											class="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
										>
											{#each propertyType === 'apartment' ? apartmentBedroomTypes : villaTownhouseBedroomTypes as bt (bt)}
												<option value={bt}>{formatBedroomLabel(bt)}</option>
											{/each}
										</select>
									</Field.Field>
								{/if}
								{#if propertyType === 'apartment' || propertyType === 'commercial' || propertyType === 'plot'}
									<Field.Field>
										<Field.Label>Property Size (sqft)</Field.Label>
										<Input type="number" bind:value={propertySize} placeholder="Property Size" />
										{#if errors.propertySize}<Field.Error class="text-sm text-destructive"
												>{errors.propertySize}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
								{#if propertyType === 'townhouse' || propertyType === 'villa' || propertyType === 'plot'}
									<Field.Field>
										<Field.Label>Plot Area (sqft)</Field.Label>
										<Input type="number" bind:value={plotArea} placeholder="Plot Area" />
										{#if errors.plotArea}<Field.Error class="text-sm text-destructive"
												>{errors.plotArea}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
								{#if propertyType === 'townhouse' || propertyType === 'villa'}
									<Field.Field>
										<Field.Label>Built Up Area (sqft)</Field.Label>
										<Input
											name="builtUpArea"
											type="number"
											bind:value={builtUpArea}
											placeholder="Built Up Area"
										/>
										{#if errors.builtUpArea}<Field.Error class="text-sm text-destructive"
												>{errors.builtUpArea}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
								{#if propertyType === 'commercial' && commercialSubType === 'warehouse'}
									<Field.Field>
										<Field.Label>Gross Floor Area (sqft)</Field.Label>
										<Input
											type="number"
											bind:value={grossFloorArea}
											placeholder="Gross Floor Area"
										/>
										{#if errors.grossFloorArea}<Field.Error class="text-sm text-destructive"
												>{errors.grossFloorArea}</Field.Error
											>{/if}
									</Field.Field>
								{/if}
							</div>
						</Field.Group>
					</Field.Set>

					<!-- Address -->
					<Field.Set>
						<Field.Legend class="text-lg font-medium"
							>Property Address <span class="text-sm font-normal text-muted-foreground"
								>(Optional)</span
							></Field.Legend
						>
						<Field.Group>
							<div class="grid grid-cols-2 gap-4">
								<Field.Field class="col-span-2">
									<Input
										name="addressLine1"
										bind:value={addressLine1}
										placeholder="Address Line 1"
									/>
								</Field.Field>
								<Field.Field class="col-span-2">
									<Input
										name="addressLine2"
										bind:value={addressLine2}
										placeholder="Address Line 2"
									/>
								</Field.Field>
								<Field.Field>
									<Input
										name="buildingName"
										bind:value={buildingName}
										placeholder="Building Name"
									/>
								</Field.Field>
								<Field.Field>
									<Input name="street" bind:value={street} placeholder="Street" />
								</Field.Field>
								<Field.Field>
									<Input name="area" bind:value={area} placeholder="Area" />
								</Field.Field>
								<Field.Field>
									<Input name="city" bind:value={city} placeholder="City" />
								</Field.Field>
								<Field.Field>
									<Input name="country" bind:value={country} placeholder="Country" />
								</Field.Field>
								<Field.Field>
									<Input name="postalCode" bind:value={postalCode} placeholder="Postal Code" />
								</Field.Field>
								<Field.Field class="col-span-2">
									<Input name="landmark" bind:value={landmark} placeholder="Landmark" />
								</Field.Field>
							</div>
						</Field.Group>
					</Field.Set>

					<!-- Attachments -->
					<Field.Set>
						<Field.Legend class="text-lg font-medium">Documents</Field.Legend>
						<Field.Group>
							<div class="flex flex-col gap-4">
								{#each [{ key: 'titleDeed' as const, label: 'Title Deed / Qood', fileName: titleDeedFileName, replaced: titleDeedReplaced, inputId: 'edit-titleDeed', inputName: 'titleDeedFile', errorKey: 'titleDeedFileName' }, { key: 'passport' as const, label: 'Passport', fileName: passportFileName, replaced: passportReplaced, inputId: 'edit-passport', inputName: 'passportFile', errorKey: 'passportFileName' }, { key: 'emiratesId' as const, label: 'Emirates ID', fileName: emiratesIdFileName, replaced: emiratesIdReplaced, inputId: 'edit-emiratesId', inputName: 'emiratesIdFile', errorKey: 'emiratesIdFileName' }] as doc, i (doc.key)}
									<div class="flex items-center gap-4">
										<span
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
											>{i + 1}</span
										>
										<Field.Field class="w-full">
											{#if doc.fileName}
												<div
													class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
												>
													<div class="flex items-center gap-3">
														<FileText class="h-9 w-9 text-orange-500" />
														<div class="flex flex-col">
															<span class="text-sm font-medium">{doc.fileName}</span>
															<span class="text-xs text-muted-foreground"
																>{doc.label}{doc.replaced ? '' : ' (existing)'}</span
															>
														</div>
													</div>
													<button
														type="button"
														onclick={() => removeFile(doc.key)}
														class="text-destructive hover:text-destructive/80"
													>
														<Trash2 class="h-5 w-5" />
													</button>
												</div>
											{:else}
												<label
													for={doc.inputId}
													class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
												>
													<Upload class="h-5 w-5 text-gray-600" />
													<span class="text-sm font-medium">Upload {doc.label}</span>
												</label>
											{/if}
											<Input
												id={doc.inputId}
												name={doc.inputName}
												class="sr-only"
												type="file"
												onchange={(event) => onFileSelect(event, doc.key)}
											/>
											<p class="text-xs text-muted-foreground">
												{doc.key === 'emiratesId'
													? 'Optional'
													: listingType === 'portal'
														? 'Required for portal listing'
														: 'Optional'}
											</p>
											{#if errors[doc.errorKey]}<Field.Error class="text-sm text-destructive"
													>{errors[doc.errorKey]}</Field.Error
												>{/if}
										</Field.Field>
									</div>
								{/each}
							</div>
						</Field.Group>
					</Field.Set>

					<!-- Financial Details -->
					<Field.Set>
						<Field.Legend class="text-lg font-medium">Financial Details</Field.Legend>
						<Field.Group>
							<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
								<Field.Field>
									<Field.Label>Buying Price</Field.Label>
									<Input type="number" bind:value={buyingPrice} placeholder="Buying Price" />
									{#if errors.buyingPrice}<Field.Error class="text-sm text-destructive"
											>{errors.buyingPrice}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label>Liquidity Invested</Field.Label>
									<Input
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
									<Input type="number" bind:value={sellingPrice} placeholder="Selling Price" />
									{#if errors.sellingPrice}<Field.Error class="text-sm text-destructive"
											>{errors.sellingPrice}</Field.Error
										>{/if}
								</Field.Field>
								<Field.Field>
									<Field.Label
										>DxB Price <span class="text-muted-foreground">(Optional)</span></Field.Label
									>
									<Input type="number" bind:value={dxbPrice} placeholder="DxB Price" />
									{#if errors.dxbPrice}<Field.Error class="text-sm text-destructive"
											>{errors.dxbPrice}</Field.Error
										>{/if}
								</Field.Field>
							</div>
						</Field.Group>
					</Field.Set>

					<!-- Listed By -->
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
											onclick={() => removeListedByEmail(index)}>Remove</Button
										>
									</div>
								{/each}
								<div>
									<Button type="button" variant="outline" size="sm" onclick={addListedByEmail}
										>+ Add Agent</Button
									>
								</div>
								{#if errors.listedByEmails}<Field.Error class="text-sm text-destructive"
										>{errors.listedByEmails}</Field.Error
									>{/if}
							</div>
						</Field.Group>
					</Field.Set>
				</div>

				<!-- Media Tab -->
				<div class:hidden={activeTab !== 'property-photo-videos'}>
					<Field.Set>
						<Field.Legend class="text-lg font-medium">Property Photo/Videos</Field.Legend>
						<Field.Group>
							{#if existingMediaAssets.length}
								<p class="text-sm text-muted-foreground">
									{existingMediaAssets.length} existing media file(s). Remove any item to exclude it,
									then save.
								</p>
								<div class="grid grid-cols-2 gap-3">
									{#each existingMediaAssets as asset (asset.url)}
										<div class="rounded-lg border border-border/60 bg-muted/30 p-2">
											{#if asset.url && asset.type === 'photo'}
												<img
													src={asset.url}
													alt={asset.fileName}
													class="h-32 w-full rounded-md object-cover"
												/>
											{:else if asset.url && asset.type === 'video'}
												<video src={asset.url} class="h-32 w-full rounded-md object-cover" controls>
													<track kind="captions" />
												</video>
											{/if}
											<div class="mt-2 flex items-center justify-between gap-2">
												<p class="truncate text-xs text-muted-foreground">{asset.fileName}</p>
												<button
													type="button"
													class="text-destructive hover:text-destructive/80"
													onclick={() => removeExistingMediaAsset(asset.url)}
												>
													<Trash2 class="h-4 w-4" />
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}

							<div
								role="region"
								aria-label="Media upload area"
								class="rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/10 p-8 text-center"
								ondragover={(event) => event.preventDefault()}
								ondrop={onMediaDrop}
							>
								<label for="edit-property-media-input" class="cursor-pointer">
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
									id="edit-property-media-input"
									class="sr-only"
									type="file"
									accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm"
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
				</div>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
