<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AMLFormInline from '$lib/components/aml-form-inline.svelte';
	import DealPercentage from '$lib/components/deal-percentage.svelte';
	import type { SplitEntry } from '$lib/components/order-split.svelte';
	import OrderSplit from '$lib/components/order-split.svelte';
	import PhoneInput from '$lib/components/phone-input.svelte';
	import ReferralFormInline from '$lib/components/referral-form-inline.svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import CalendarComponent from '$lib/components/ui/calendar/calendar.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import {
		APARTMENT_BEDROOM_OPTIONS,
		COMMERCIAL_SUB_TYPE_OPTIONS,
		PROPERTY_TYPE_OPTIONS,
		SALE_COMMUNITY_OPTIONS,
		SALE_DEVELOPER_OPTIONS,
		SALE_TYPE_OPTIONS,
		TOWNHOUSE_VILLA_BEDROOM_OPTIONS,
		normalizeDealStageValue,
		normalizePropertyTypeValue,
		normalizeSaleDeveloperValue,
		normalizeSaleTypeValue,
		type SelectOption
	} from '$lib/listing-options';
	import HorizontalSeparator from '@/components/ui/separator/horizontal-separator.svelte';
	import { parseDate, type DateValue } from '@internationalized/date';
	import { parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js';
	import { toast } from 'svelte-sonner';
	import Building from '~icons/lucide/building';
	import CheckCircled from '~icons/lucide/check-circle-2';
	import PlusRound from '~icons/lucide/circle-fading-plus';
	import Upload from '~icons/lucide/cloud-upload';
	import ExternalLink from '~icons/lucide/external-link';
	import FileText from '~icons/lucide/file-text';
	import Hammer from '~icons/lucide/hammer';
	import Home from '~icons/lucide/home';
	import Loader2 from '~icons/lucide/loader-2';
	import Plus from '~icons/lucide/plus';
	import Save from '~icons/lucide/save';
	import PriceTag from '~icons/lucide/tag';
	import Traffic from '~icons/lucide/traffic-cone';
	import Trash2 from '~icons/lucide/trash-2';
	import X from '~icons/lucide/x';
	import { untrack } from 'svelte';
	import { deleteSale, updateSale } from '../../routes/(secure)/agent/sales-tracker/sales.remote';

	type AMLTarget =
		| { buyerType: 'primary'; jointBuyerIndex?: undefined }
		| { buyerType: 'joint'; jointBuyerIndex: number };
	type DisplayFile = File & {
		downloadURL?: string;
		docusignStatus?: string;
		referenceNo?: string;
		source?: string;
	};

	let {
		userRole,
		sale
	}: {
		userRole?: Role['accessType'];
		sale: Sale;
	} = $props();

	const canEditSale = $derived(userRole === 'admin' || userRole === 'super-admin');
	const isFinanceRole = $derived(userRole === 'finance');
	const isAgentRole = $derived(
		userRole === 'agent' || userRole === 'manager' || userRole === 'senior-manager'
	);
	const canEditFields = $derived(canEditSale || isAgentRole);
	let deleteDialogOpen = $state(false);
	let isDeletingSale = $state(false);
	let saveError = $state<string | null>(null);

	const handleDeleteSale = async () => {
		if (!sale?.id) return;
		isDeletingSale = true;
		try {
			await deleteSale({ saleId: sale.id });
			toast.success('Sale deleted successfully');
			deleteDialogOpen = false;
			await invalidateAll();
			goto(resolve('/agent/sales-tracker'));
		} catch {
			toast.error('Failed to delete sale. Please try again.');
		} finally {
			isDeletingSale = false;
		}
	};

	const canUploadManually = $derived(
		userRole === 'admin' || userRole === 'compliance' || userRole === 'super-admin'
	);

	let jointBuyers = $state<{ key: number }[]>([]);
	let nextJointKey = 0;
	let tentativeEligibilityDate = $state<DateValue | undefined>(undefined);
	let saleDateValue = $state<DateValue | undefined>(undefined);
	let saleDatePickerOpen = $state(false);
	let popoverOpen = $state(false);
	let developerPopoverOpen = $state(false);
	let developerSearchValue = $state('');
	let selectedSaleType = $state<string>('');
	let selectedDeveloper = $state<string>('');
	let selectedCommunity = $state<string | undefined>(undefined);
	let selectedDealStage = $state<string>('');
	let selectedPropertyType = $state<string>('');

	// Effective values: user selection takes precedence, prop value is always the fallback
	const effectiveSaleType = $derived(selectedSaleType || normalizeSaleTypeValue(sale?.saleType));
	const effectiveDeveloper = $derived(
		selectedDeveloper || normalizeSaleDeveloperValue(sale?.developer)
	);
	const effectiveCommunity = $derived(selectedCommunity ?? sale?.community ?? undefined);
	const effectiveDealStage = $derived(
		selectedDealStage || normalizeDealStageValue(sale?.dealStage)
	);
	const effectivePropertyType = $derived(
		selectedPropertyType || normalizePropertyTypeValue(sale?.propertyType)
	);
	const submittedSaleType = $derived(effectiveSaleType || sale?.saleType || '');
	const submittedDeveloper = $derived(effectiveDeveloper || sale?.developer || '');
	const submittedDealStage = $derived(effectiveDealStage || sale?.dealStage || '');
	const submittedPropertyType = $derived(effectivePropertyType || sale?.propertyType || '');

	// Invoice stage checkbox states
	let firstHalfChecked = $state(false);
	let secondHalfChecked = $state(false);
	let fullChecked = $state(false);
	let notEligibleChecked = $state(false);

	// Sync checkbox states with form field
	$effect(() => {
		const stages: ('first-half' | 'second-half' | 'full' | 'not-yet-eligible')[] = [];
		if (firstHalfChecked) stages.push('first-half');
		if (secondHalfChecked) stages.push('second-half');
		if (fullChecked) stages.push('full');
		if (notEligibleChecked) stages.push('not-yet-eligible');
		updateSale.fields.invoiceStage.set(stages);
	});

	// Mutual exclusivity handlers for invoice stage
	const handleFullChange = (checked: boolean) => {
		fullChecked = checked;
		if (checked) {
			firstHalfChecked = false;
			secondHalfChecked = false;
			notEligibleChecked = false;
		}
	};

	const handleNotEligibleChange = (checked: boolean) => {
		notEligibleChecked = checked;
		if (checked) {
			firstHalfChecked = false;
			secondHalfChecked = false;
			fullChecked = false;
		}
	};

	const handleHalfChange = () => {
		if (firstHalfChecked || secondHalfChecked) {
			fullChecked = false;
			notEligibleChecked = false;
		}
	};
	let communityPopoverOpen = $state(false);
	let communitySearchValue = $state('');

	// Initialize splits from existing sale data (prefer new splits[], fall back to dealOwners[])
	function initSplitsFromSale(s: Sale): SplitEntry[] {
		if (Array.isArray(s.splits) && s.splits.length > 0) {
			return s.splits.map((split, idx) => ({
				key: idx,
				agentId: split.agentId,
				agentName: split.agentName,
				agentEmail: (split as { agentEmail?: string }).agentEmail ?? '',
				agentPhotoURL: (split as { agentPhotoURL?: string }).agentPhotoURL ?? undefined,
				ownerRole: split.ownerRole,
				percentage: split.percentage,
				// Restore manager/SM data from per-split field (new model)
				managerEmail:
					split.managerEmail ??
					(split.ownerRole === 'caller'
						? s.callerManagerEmail
						: split.ownerRole === 'closer'
							? s.closerManagerEmail
							: undefined) ??
					'',
				seniorManagerEmail:
					split.seniorManagerEmail ??
					(split.ownerRole === 'caller'
						? s.callerSeniorManagerEmail
						: split.ownerRole === 'closer'
							? s.closerSeniorManagerEmail
							: undefined) ??
					''
			}));
		}
		// Fall back to legacy dealOwners
		return (s.dealOwners ?? []).map((owner, idx) => ({
			key: idx,
			agentId: owner.userId,
			agentName: owner.name,
			agentEmail: owner.email,
			agentPhotoURL: owner.photoURL ?? undefined,
			ownerRole: (idx === 0
				? 'caller'
				: idx === 1
					? 'closer'
					: idx === 2
						? 'closer2'
						: 'closer3') as 'caller' | 'closer' | 'closer2' | 'closer3',
			percentage: owner.split,
			// Fallback from top-level fields for legacy records
			managerEmail:
				(owner.ownerRole === 'caller' ? s.callerManagerEmail : s.closerManagerEmail) ?? '',
			seniorManagerEmail:
				(owner.ownerRole === 'caller' ? s.callerSeniorManagerEmail : s.closerSeniorManagerEmail) ??
				''
		}));
	}

	let dealSplits = $state<SplitEntry[]>([]);

	const syncSplits = (splits: SplitEntry[]) => {
		updateSale.fields.splits.set(
			splits.map((s) => ({
				agentId: s.agentId,
				agentName: s.agentName,
				agentEmail: s.agentEmail,
				agentPhotoURL: s.agentPhotoURL ?? '',
				ownerRole: s.ownerRole,
				percentage: Number(s.percentage) || 0,
				managerEmail: s.managerEmail ?? '',
				seniorManagerEmail: s.seniorManagerEmail ?? ''
			}))
		);
	};

	$effect(() => {
		syncSplits(dealSplits);
	});

	let initialSplitIdentities = $state<Set<string>>(new Set());
	let initialSplitHierarchyByIdentity = $state<Record<string, boolean>>({});
	const splitIdentityForEdit = (split: SplitEntry) =>
		[
			split.ownerRole,
			(split.agentId ?? '').trim().toLowerCase(),
			(split.agentEmail ?? '').trim().toLowerCase(),
			(split.agentName ?? '').trim().toLowerCase(),
			String(Number(split.percentage) || 0)
		].join('|');
	const splitHasHierarchy = (split: SplitEntry) =>
		Boolean((split.managerEmail ?? '').trim() && (split.seniorManagerEmail ?? '').trim());
	const splitMissingHierarchy = $derived(
		dealSplits.find((split) => {
			const identity = splitIdentityForEdit(split);
			const isExistingSplit = initialSplitIdentities.has(identity);
			const hadHierarchy = initialSplitHierarchyByIdentity[identity] === true;
			if (!isExistingSplit) return !splitHasHierarchy(split);
			return hadHierarchy && !splitHasHierarchy(split);
		})
	);
	const splitTotal = $derived(dealSplits.reduce((t, s) => t + (Number(s.percentage) || 0), 0));
	const splitRemaining = $derived(100 - splitTotal);

	// Track uploaded files
	let uploadedFiles = $state<Record<string, DisplayFile | null>>({
		passportFile: null,
		nationalIdFile: null,
		amlFormFile: null,
		goAmlFormFile: null,
		bookingFormFile: null,
		paymentReceiptFile: null,
		refferalAgreementFile: null
	});

	// Track uploaded files for joint buyers
	let jointBuyerFiles = $state<
		Record<
			number,
			{
				passportFile: DisplayFile | null;
				nationalIdFile: DisplayFile | null;
				amlFormFile: DisplayFile | null;
			}
		>
	>({});

	// Track phone countries and values for joint buyers
	let jointBuyerPhoneCountries = $state<Record<number, string>>({});
	let jointBuyerPhoneValues = $state<Record<number, string>>({});
	let jointBuyerDetails = $state<
		Record<number, { firstName: string; lastName: string; email: string }>
	>({});
	let clientPhoneCountry = $state<string>('AE');
	let clientPhoneValue = $state<string>('');

	// Track client details for display
	let clientFirstName = $state<string>('');
	let clientLastName = $state<string>('');
	let clientEmail = $state<string>('');

	// Sync local client details to form fields
	$effect(() => {
		updateSale.fields.firstName.set(clientFirstName);
	});

	$effect(() => {
		updateSale.fields.lastName.set(clientLastName);
	});

	$effect(() => {
		updateSale.fields.email.set(clientEmail);
	});

	// Track AML generation state
	let amlGenerating = $state<Record<string, boolean>>({
		primary: false
	});

	// Track generated AML envelope IDs
	let amlEnvelopes = $state<Record<string, { envelopeId: string; recipientEmail: string } | null>>({
		primary: null
	});

	// Track referral agreement generation state
	let referralGenerating = $state(false);
	let referralEnvelope = $state<{ envelopeId: string; recipientEmail: string } | null>(null);

	// Track inline form sheets
	let showAMLForm = $state(false);
	let showReferralForm = $state(false);
	let currentAMLTarget = $state<AMLTarget>({ buyerType: 'primary' });
	let currentBuyerData = $state<
		{ firstName?: string; lastName?: string; email?: string; phone?: string } | undefined
	>(undefined);

	const handleFileUpload = (fieldName: string, event: Event) => {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			uploadedFiles[fieldName] = input.files[0];
			removedFiles[fieldName] = false;
		}
	};

	let removedFiles = $state<Record<string, boolean>>({});
	let removedJointBuyerFiles = $state<
		Record<number, Partial<Record<'passportFile' | 'nationalIdFile' | 'amlFormFile', boolean>>>
	>({});

	const removeFile = (fieldName: string) => {
		uploadedFiles[fieldName] = null;
		removedFiles[fieldName] = true;
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
		jointBuyerDetails[newKey] = { firstName: '', lastName: '', email: '' };
		amlGenerating[`joint-${newKey}`] = false;
	};

	const removeJointBuyer = (key: number) => {
		jointBuyers = jointBuyers.filter((buyer) => buyer.key !== key);
		delete jointBuyerFiles[key];
		delete jointBuyerPhoneCountries[key];
		delete jointBuyerPhoneValues[key];
		delete jointBuyerDetails[key];
		delete removedJointBuyerFiles[key];
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
			removedJointBuyerFiles[buyerKey] = {
				...(removedJointBuyerFiles[buyerKey] ?? {}),
				[fieldName]: false
			};
		}
	};

	const removeJointBuyerFile = (
		buyerKey: number,
		fieldName: 'passportFile' | 'nationalIdFile' | 'amlFormFile'
	) => {
		if (jointBuyerFiles[buyerKey]) {
			jointBuyerFiles[buyerKey][fieldName] = null;
		}
		removedJointBuyerFiles[buyerKey] = {
			...(removedJointBuyerFiles[buyerKey] ?? {}),
			[fieldName]: true
		};
		const input = document.getElementById(`joint-${fieldName}-${buyerKey}`) as HTMLInputElement;
		if (input) input.value = '';
	};

	const saleTypes = SALE_TYPE_OPTIONS;
	const developers = SALE_DEVELOPER_OPTIONS;
	const communities = SALE_COMMUNITY_OPTIONS;
	const propertyTypes = PROPERTY_TYPE_OPTIONS;
	const apartmentBedrooms = APARTMENT_BEDROOM_OPTIONS;
	const townhouseVillaBedrooms = TOWNHOUSE_VILLA_BEDROOM_OPTIONS;
	const commercialSubTypes = COMMERCIAL_SUB_TYPE_OPTIONS;
	const optionContainsValue = (options: SelectOption[], value: string) =>
		options.some((option) => option.value === value);
	const createLegacyOption = (
		value: unknown,
		normalizedValue: string,
		options: SelectOption[]
	): SelectOption | null => {
		const raw = typeof value === 'string' ? value.trim() : '';
		if (!raw || optionContainsValue(options, normalizedValue)) return null;
		if (
			options.some(
				(option) =>
					option.value.toLowerCase() === raw.toLowerCase() ||
					option.label.toLowerCase() === raw.toLowerCase()
			)
		) {
			return null;
		}

		return { value: raw, label: `${raw} (legacy)` };
	};

	const legacySaleTypeOption = $derived(
		createLegacyOption(sale?.saleType, normalizeSaleTypeValue(sale?.saleType), saleTypes)
	);
	const legacyDeveloperOption = $derived(
		createLegacyOption(sale?.developer, normalizeSaleDeveloperValue(sale?.developer), developers)
	);
	const legacyPropertyTypeOption = $derived(
		createLegacyOption(
			sale?.propertyType,
			normalizePropertyTypeValue(sale?.propertyType),
			propertyTypes
		)
	);
	const saleTypeOptions = $derived(
		legacySaleTypeOption ? [legacySaleTypeOption, ...saleTypes] : saleTypes
	);
	const developerOptions = $derived(
		legacyDeveloperOption ? [legacyDeveloperOption, ...developers] : developers
	);
	const propertyTypeOptions = $derived(
		legacyPropertyTypeOption ? [legacyPropertyTypeOption, ...propertyTypes] : propertyTypes
	);
	const legacyFieldLabels = $derived(
		[
			legacySaleTypeOption ? 'sale type' : null,
			legacyDeveloperOption ? 'developer' : null,
			sale?.dealStage && !normalizeDealStageValue(sale.dealStage) ? 'deal stage' : null,
			legacyPropertyTypeOption ? 'property type' : null
		].filter((field): field is string => Boolean(field))
	);

	const saleTypeLabel = $derived(
		saleTypeOptions.find((d) => d.value === submittedSaleType)?.label ?? 'Sale Type'
	);
	const developerLabel = $derived(
		developerOptions.find((d) => d.value === submittedDeveloper)?.label ??
			sale?.developer ??
			'Developer'
	);
	const filteredDevelopers = $derived(
		developerSearchValue
			? developerOptions.filter((dev) =>
					dev.label.toLowerCase().includes(developerSearchValue.toLowerCase())
				)
			: developerOptions
	);
	const filteredCommunities = $derived(
		communitySearchValue
			? communities.filter((comm) =>
					comm.label.toLowerCase().includes(communitySearchValue.toLowerCase())
				)
			: communities
	);
	const communityLabel = $derived(
		communities.find((c) => c.value === effectiveCommunity)?.label ?? 'Community (Optional)'
	);
	const propertyTypeLabel = $derived(
		propertyTypeOptions.find((p) => p.value === submittedPropertyType)?.label ??
			sale?.propertyType ??
			'Property Type'
	);
	const bedroomTypeLabel = $derived(
		[...apartmentBedrooms, ...townhouseVillaBedrooms].find(
			(b) => b.value === updateSale.fields.bedroomType.value()
		)?.label ?? 'Bedrooms'
	);
	const commercialSubTypeLabel = $derived(
		commercialSubTypes.find((c) => c.value === updateSale.fields.commercialSubType.value())
			?.label ?? 'Commercial Type'
	);

	const toDisplayFile = (fileData: unknown): DisplayFile | null => {
		if (!fileData || typeof fileData !== 'object') return null;
		const data = fileData as {
			original?: { name?: string; size?: number };
			name?: string;
			size?: number;
			path?: string;
			downloadURL?: string;
			source?: string;
			referenceNo?: string;
			docusign?: { status?: string };
		};
		const originalName = data.original?.name ?? data.name;
		const originalSize = data.original?.size ?? data.size ?? 0;
		const fallbackName = data.path?.split('/').pop() ?? 'uploaded-file';
		return {
			name: originalName ?? fallbackName,
			size: originalSize,
			downloadURL: data.downloadURL,
			source: data.source,
			referenceNo: data.referenceNo,
			docusignStatus: data.docusign?.status
		} as DisplayFile;
	};

	const handleAMLGenerated = (document: SaleDocumentFile) => {
		const displayFile = toDisplayFile(document);
		if (currentAMLTarget.buyerType === 'joint') {
			const buyerKey = jointBuyers[currentAMLTarget.jointBuyerIndex]?.key;
			if (buyerKey !== undefined) {
				if (!jointBuyerFiles[buyerKey]) {
					jointBuyerFiles[buyerKey] = {
						passportFile: null,
						nationalIdFile: null,
						amlFormFile: null
					};
				}
				jointBuyerFiles[buyerKey].amlFormFile = displayFile;
				removedJointBuyerFiles[buyerKey] = {
					...(removedJointBuyerFiles[buyerKey] ?? {}),
					amlFormFile: false
				};
			}
			return;
		}

		uploadedFiles.amlFormFile = displayFile;
		removedFiles.amlFormFile = false;
	};

	const handleReferralGenerated = (document: SaleDocumentFile) => {
		uploadedFiles.refferalAgreementFile = toDisplayFile(document);
		removedFiles.refferalAgreementFile = false;
	};

	let prefillingSaleId = $state<string | null>(null);

	$effect(() => {
		const saleId = sale?.id;
		if (!saleId) return;

		untrack(() => {
			if (prefillingSaleId === saleId) return;
			prefillingSaleId = saleId;

			dealSplits = initSplitsFromSale(sale);
			initialSplitIdentities = new Set(dealSplits.map(splitIdentityForEdit));
			initialSplitHierarchyByIdentity = Object.fromEntries(
				dealSplits.map((split) => [splitIdentityForEdit(split), splitHasHierarchy(split)])
			);
			removedFiles = {};
			removedJointBuyerFiles = {};

			updateSale.fields.id.set(sale.id);
			updateSale.fields.firstName.set(sale.clientDetails.firstName);
			updateSale.fields.lastName.set(sale.clientDetails.lastName ?? '');
			updateSale.fields.email.set(sale.clientDetails.email ?? '');
			updateSale.fields.phone.set(sale.clientDetails.phone);

			// Set local variables for display
			clientFirstName = sale.clientDetails.firstName;
			clientLastName = sale.clientDetails.lastName ?? '';
			clientEmail = sale.clientDetails.email ?? '';
			clientPhoneValue = sale.clientDetails.phone;

			const normalizedDealStage = normalizeDealStageValue(sale.dealStage);
			const normalizedSaleType = normalizeSaleTypeValue(sale.saleType);
			const normalizedDeveloper = normalizeSaleDeveloperValue(sale.developer);
			const normalizedPropertyType = normalizePropertyTypeValue(sale.propertyType);

			selectedDealStage = normalizedDealStage;
			updateSale.fields.dealStage.set(
				normalizedDealStage as 'eoi' | 'booking' | 'cancelled' | undefined
			);
			updateSale.fields.paymentValue.set(sale.paymentValue);
			updateSale.fields.invoiceStage.set(sale.invoiceStage ?? []);
			firstHalfChecked = (sale.invoiceStage ?? []).includes('first-half');
			secondHalfChecked = (sale.invoiceStage ?? []).includes('second-half');
			fullChecked = (sale.invoiceStage ?? []).includes('full');
			notEligibleChecked = (sale.invoiceStage ?? []).includes('not-yet-eligible');

			selectedSaleType = normalizedSaleType;
			updateSale.fields.saleType.set(normalizedSaleType as 'off-plan' | 'secondary' | undefined);
			updateSale.fields.developer.set(normalizedDeveloper);
			selectedDeveloper = normalizedDeveloper;
			updateSale.fields.project.set(sale.project);
			updateSale.fields.community?.set(sale.community ?? undefined);
			selectedCommunity = sale.community ?? undefined;
			selectedPropertyType = normalizedPropertyType;
			updateSale.fields.propertyType.set(
				normalizedPropertyType as
					| 'apartment'
					| 'townhouse'
					| 'villa'
					| 'commercial'
					| 'plot'
					| undefined
			);
			updateSale.fields.bedroomType.set(sale.bedroomType ?? undefined);
			updateSale.fields.commercialSubType.set(sale.commercialSubType ?? undefined);
			updateSale.fields.propertySize.set(sale.propertySize ?? undefined);
			updateSale.fields.plotArea.set(sale.plotArea ?? undefined);
			updateSale.fields.builtUpArea.set(sale.builtUpArea ?? undefined);
			updateSale.fields.grossFloorArea.set(sale.grossFloorArea ?? undefined);
			updateSale.fields.unitNo.set(sale.unitNo);
			updateSale.fields.unitValue.set(sale.unitValue);
			updateSale.fields.saleDate.set(sale.saleDate);
			updateSale.fields.nationality?.set(sale.nationality ?? undefined);
			updateSale.fields.residentStatus?.set(sale.residentStatus ?? undefined);
			updateSale.fields.commissionPercentage.set(sale.commissionPercentage ?? undefined);
			updateSale.fields.passbackAmount.set(sale.passbackAmount ?? undefined);

			if (sale.saleDate) {
				saleDateValue = parseDate(sale.saleDate.slice(0, 10));
			}
			if (sale.tentativeEligibilityDate) {
				tentativeEligibilityDate = parseDate(sale.tentativeEligibilityDate.slice(0, 10));
			}

			dealSplits = initSplitsFromSale(sale);
			initialSplitIdentities = new Set(dealSplits.map(splitIdentityForEdit));
			initialSplitHierarchyByIdentity = Object.fromEntries(
				dealSplits.map((split) => [splitIdentityForEdit(split), splitHasHierarchy(split)])
			);
			syncSplits(dealSplits);

			jointBuyers = sale.jointBuyers.map((_, index) => ({ key: index }));
			nextJointKey = jointBuyers.length;
			jointBuyerFiles = Object.fromEntries(
				sale.jointBuyers.map((buyer, index) => [
					index,
					{
						passportFile: toDisplayFile(buyer.passportFile),
						nationalIdFile: toDisplayFile(buyer.nationalIdFile),
						amlFormFile: toDisplayFile(buyer.amlFormFile)
					}
				])
			);
			jointBuyerPhoneCountries = Object.fromEntries(
				sale.jointBuyers.map((_, index) => [index, 'AE'])
			);
			jointBuyerPhoneValues = Object.fromEntries(
				sale.jointBuyers.map((buyer, index) => [index, buyer.phone ?? ''])
			);
			jointBuyerDetails = Object.fromEntries(
				sale.jointBuyers.map((buyer, index) => [
					index,
					{
						firstName: buyer.firstName ?? '',
						lastName: buyer.lastName ?? '',
						email: buyer.email ?? ''
					}
				])
			);
			updateSale.fields.jointBuyers.set(
				sale.jointBuyers.map((buyer) => ({
					firstName: buyer.firstName,
					lastName: buyer.lastName,
					email: buyer.email,
					phone: buyer.phone
				}))
			);

			uploadedFiles = {
				passportFile: toDisplayFile(sale.clientDetails.passportFile),
				nationalIdFile: toDisplayFile(sale.clientDetails.nationalIdFile),
				amlFormFile: toDisplayFile(sale.clientDetails.amlFormFile),
				goAmlFormFile: toDisplayFile(sale.goAmlFormFile ?? null),
				bookingFormFile: toDisplayFile(sale.bookingFormFile),
				paymentReceiptFile: toDisplayFile(sale.paymentReceiptFile),
				refferalAgreementFile: toDisplayFile(sale.refferalAgreementFile)
			};
			updateSale.fields.goAmlStatus?.set(sale.goAmlStatus ?? undefined);
		}); // end untrack
	});
</script>

<div class="mx-auto w-full max-w-7xl p-4 sm:p-6">
	<form
		enctype="multipart/form-data"
		{...updateSale.enhance(async (f) => {
			try {
				saveError = null;
				if (splitMissingHierarchy) {
					saveError = `Manager and senior manager are required when changing the ${splitMissingHierarchy.ownerRole} split`;
					toast.error(saveError);
					return;
				}
				await f.submit();
				const issues = updateSale.fields.allIssues();
				if (issues?.length) {
					toast.error(issues[0]?.message || 'Please correct the highlighted fields');
				} else {
					toast.success('Sale updated successfully!');
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : '';
				if (message.includes('403') || message.toLowerCase().includes('permission')) {
					toast.error('You do not have permission to update this sale');
				} else if (message.includes('404')) {
					toast.error('Sale not found');
				} else if (message.includes('500') || message.toLowerCase().includes('server')) {
					toast.error('Server error while saving. Please try again.');
				} else if (message) {
					toast.error(message);
				} else {
					toast.error('Failed to update sale. Please try again.');
				}
				saveError = message || 'Failed to update sale. Please try again.';
			}
		})}
	>
		<input type="hidden" {...updateSale.fields.id.as('text')} />
		{#if removedFiles.passportFile}<input
				type="hidden"
				name="removePassportFile"
				value="true"
			/>{/if}
		{#if removedFiles.nationalIdFile}<input
				type="hidden"
				name="removeNationalIdFile"
				value="true"
			/>{/if}
		{#if removedFiles.amlFormFile}<input type="hidden" name="removeAmlFormFile" value="true" />{/if}
		{#if removedFiles.goAmlFormFile}<input
				type="hidden"
				name="removeGoAmlFormFile"
				value="true"
			/>{/if}
		{#if removedFiles.bookingFormFile}<input
				type="hidden"
				name="removeBookingFormFile"
				value="true"
			/>{/if}
		{#if removedFiles.paymentReceiptFile}<input
				type="hidden"
				name="removePaymentReceiptFile"
				value="true"
			/>{/if}
		{#if removedFiles.refferalAgreementFile}<input
				type="hidden"
				name="removeRefferalAgreementFile"
				value="true"
			/>{/if}
		<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-6">
			<h1 class="text-2xl font-medium">Edit Sale</h1>
			<div class="flex flex-row gap-2">
				{#if canEditSale}
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
						onclick={() => (deleteDialogOpen = true)}
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					</Button>
				{/if}
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={() => goto(resolve('/agent/sales-tracker'))}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={!!updateSale.pending || splitRemaining !== 0 || !!splitMissingHierarchy}
					title={splitMissingHierarchy
						? `Manager and senior manager are required for the ${splitMissingHierarchy.ownerRole} split`
						: splitRemaining !== 0
							? 'Owner split must total 100%'
							: undefined}
				>
					<Save class="mr-2 h-4 w-4" />
					{updateSale.pending ? 'Updating...' : 'Update'}
				</Button>
			</div>
		</div>
		{#each updateSale.fields.allIssues() as issue, i (i)}
			<Field.Error class="text-sm text-destructive">
				{issue.message}
			</Field.Error>
		{/each}
		{#if saveError}
			<div class="px-6 pt-4">
				<Alert.Root variant="destructive">
					<Alert.Title>Unable to save sale</Alert.Title>
					<Alert.Description>{saveError}</Alert.Description>
				</Alert.Root>
			</div>
		{/if}
		{#if legacyFieldLabels.length}
			<div class="px-6 pt-4">
				<Alert.Root class="border-amber-200 bg-amber-50 text-amber-900">
					<Alert.Title>Legacy sale data</Alert.Title>
					<Alert.Description>
						This sale has migrated {legacyFieldLabels.join(', ')} values. They are preserved unless you
						choose a replacement.
					</Alert.Description>
				</Alert.Root>
			</div>
		{/if}
		<div class="flex flex-col gap-8 p-6">
			<!-- Client Details Section -->
			<Field.Set>
				<Field.Set>
					<Field.Legend class="text-lg font-medium">Client Details</Field.Legend>
					<Field.Group>
						<div class="grid grid-cols-3 gap-4">
							<Field.Field>
								<Input
									bind:value={clientFirstName}
									placeholder="First Name"
									disabled={!canEditFields}
								/>
								{#each updateSale.fields.firstName.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<Input
									bind:value={clientLastName}
									placeholder="Last Name"
									disabled={!canEditFields}
								/>
								{#each updateSale.fields.lastName.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<Input
									bind:value={clientEmail}
									type="email"
									placeholder="Email"
									disabled={!canEditFields}
								/>
								{#each updateSale.fields.email.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						</div>
						<input type="hidden" name="firstName" value={clientFirstName} />
						<input type="hidden" name="lastName" value={clientLastName} />
						<input type="hidden" name="email" value={clientEmail} />
						<Field.Field>
							<PhoneInput
								bind:value={clientPhoneValue}
								bind:country={clientPhoneCountry}
								showCountrySelect={true}
								disabled={!canEditFields}
							/>
						</Field.Field>
						<input
							type="hidden"
							name="phone"
							value={getE164number(clientPhoneValue, clientPhoneCountry) || ''}
						/>
						<!-- Sale Date + Nationality + Resident Status -->
						<div class="grid grid-cols-3 gap-4">
							<Field.Field>
								<Field.Label for="sale-date">Sale Date</Field.Label>
								<Popover.Root bind:open={saleDatePickerOpen}>
									<Popover.Trigger class="w-full">
										<Button
											variant="outline"
											class="w-full justify-start text-left font-normal"
											id="sale-date"
											type="button"
											disabled={!canEditFields}
										>
											{#if saleDateValue}
												{new Date(
													saleDateValue.year,
													saleDateValue.month - 1,
													saleDateValue.day
												).toLocaleDateString('en-GB', {
													day: '2-digit',
													month: 'short',
													year: 'numeric'
												})}
											{:else}
												<span class="text-muted-foreground">Pick sale date</span>
											{/if}
										</Button>
									</Popover.Trigger>
									<Popover.Content class="w-auto p-0" align="start">
										<CalendarComponent
											type="single"
											bind:value={saleDateValue}
											onValueChange={(value) => {
												saleDateValue = value;
												if (value) {
													updateSale.fields.saleDate?.set(value.toString());
												}
												saleDatePickerOpen = false;
											}}
										/>
									</Popover.Content>
								</Popover.Root>
								<input
									type="hidden"
									{...updateSale.fields.saleDate?.as('text')}
									value={saleDateValue ? saleDateValue.toString() : ''}
								/>
								{#each updateSale.fields.saleDate?.issues() ?? [] as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<Field.Label for="nationality"
									>Nationality <span class="text-muted-foreground">(Optional)</span></Field.Label
								>
								<Input
									id="nationality"
									{...updateSale.fields.nationality?.as('text')}
									placeholder="e.g. Indian"
									disabled={!canEditFields}
								/>
							</Field.Field>
							<Field.Field>
								<Field.Label
									>Resident Status <span class="text-muted-foreground">(Optional)</span
									></Field.Label
								>
								<Select.Root
									type="single"
									value={updateSale.fields.residentStatus?.value() ?? ''}
									onValueChange={(v) =>
										updateSale.fields.residentStatus?.set(
											(v || undefined) as 'resident' | 'non-resident' | undefined
										)}
									disabled={!canEditFields}
								>
									<Select.Trigger>
										{#if updateSale.fields.residentStatus?.value() === 'resident'}
											Resident
										{:else if updateSale.fields.residentStatus?.value() === 'non-resident'}
											Non-Resident
										{:else}
											<span class="text-muted-foreground">Select status</span>
										{/if}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="resident">Resident</Select.Item>
										<Select.Item value="non-resident">Non-Resident</Select.Item>
									</Select.Content>
								</Select.Root>
								<input type="hidden" {...updateSale.fields.residentStatus?.as('text')} />
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
													<span class="text-sm font-medium">{uploadedFiles.passportFile.name}</span>
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
										{...updateSale.fields.passportFile.as('file')}
										files={undefined}
										accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
										onchange={(e) => handleFileUpload('passportFile', e)}
									/>
									{#each updateSale.fields.passportFile.issues() as issue, i (i)}
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
										{...updateSale.fields.nationalIdFile.as('file')}
										files={undefined}
										accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
										onchange={(e) => handleFileUpload('nationalIdFile', e)}
									/>
									{#each updateSale.fields.nationalIdFile.issues() as issue, i (i)}
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
												{#if uploadedFiles.amlFormFile.docusignStatus}
													<span class="text-xs text-muted-foreground">
														DocuSign {uploadedFiles.amlFormFile.docusignStatus}
														{uploadedFiles.amlFormFile.referenceNo
															? ` - Ref ${uploadedFiles.amlFormFile.referenceNo}`
															: ''}
													</span>
												{/if}
											</div>
										</div>
										<div class="flex items-center gap-2">
											{#if uploadedFiles.amlFormFile.downloadURL}
												<a
													href={uploadedFiles.amlFormFile.downloadURL}
													target="_blank"
													class="text-sm font-medium text-primary hover:underline"
												>
													Open
												</a>
											{/if}
											<button
												type="button"
												onclick={() => removeFile('amlFormFile')}
												class="text-destructive hover:text-destructive/80"
											>
												<Trash2 class="h-5 w-5" />
											</button>
										</div>
									</div>
								{:else}
									<div class="flex w-full flex-row gap-2">
										<Button
											variant="outline"
											type="button"
											class="flex-1 bg-orange-50/40"
											disabled={amlGenerating.primary}
											onclick={() => {
												const firstName = updateSale.fields.firstName.value();
												const lastName = updateSale.fields.lastName.value();
												const email = updateSale.fields.email.value();
												const phone = getE164number(clientPhoneValue, clientPhoneCountry);

												if (!firstName || !lastName || !email) {
													toast.error(
														'Please fill in all client details before generating AML form'
													);
													return;
												}

												// Open the inline form with buyer data
												currentAMLTarget = { buyerType: 'primary' };
												currentBuyerData = { firstName, lastName, email, phone };
												showAMLForm = true;
											}}
										>
											{#if amlGenerating.primary}
												<Loader2 class="h-4 w-4 animate-spin" />
												Generating...
											{:else if amlEnvelopes.primary}
												<CheckCircled class="h-4 w-4 text-green-600" />
												AML form sent
											{:else}
												<PlusRound class="h-4 w-4" />
												Generate Now
											{/if}
										</Button>
										{#if amlEnvelopes.primary}
											<Button
												variant="outline"
												type="button"
												class="flex-1"
												onclick={() => {
													const envelopeId = amlEnvelopes.primary?.envelopeId;
													if (envelopeId) {
														window.open(
															`/api/get-docusign-document?envelopeId=${envelopeId}`,
															'_blank'
														);
													}
												}}
											>
												<ExternalLink class="h-4 w-4" />
												Open Generated AML
											</Button>
										{/if}
										{#if canUploadManually && !amlEnvelopes.primary}
											<span class="self-center text-center text-xs text-muted-foreground">or</span>
											<label
												for="amlFormFile"
												class=" flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
											>
												<Upload class="h-5 w-5 text-gray-600" />
												<span class="text-sm font-medium">Upload manually</span>
											</label>
										{/if}
									</div>
								{/if}
								<Input
									id="amlFormFile"
									class="sr-only"
									{...updateSale.fields.amlFormFile.as('file')}
									files={undefined}
									accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
									onchange={(e) => handleFileUpload('amlFormFile', e)}
									disabled={!canUploadManually}
								/>
							</div>

							<div class="col-span-2 flex w-full flex-col items-center gap-4">
								<div class="flex w-full flex-row gap-4">
									<span
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-500"
									>
										4
									</span>
									<p class="text-sm font-medium">
										Go AML Form <span class="text-muted-foreground">(Optional)</span>
									</p>
								</div>

								{#if uploadedFiles.goAmlFormFile}
									<div
										class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
									>
										<div class="flex items-center gap-3">
											<FileText class="h-10 w-10 text-orange-500" />
											<div class="flex flex-col">
												<span class="text-sm font-medium">{uploadedFiles.goAmlFormFile.name}</span>
												<span class="text-xs text-muted-foreground"
													>{formatFileSize(uploadedFiles.goAmlFormFile.size)}</span
												>
											</div>
										</div>
										<div class="flex items-center gap-2">
											{#if uploadedFiles.goAmlFormFile.downloadURL}
												<a
													href={uploadedFiles.goAmlFormFile.downloadURL}
													target="_blank"
													class="text-sm font-medium text-primary hover:underline"
												>
													Open
												</a>
											{/if}
											{#if canUploadManually}
												<button
													type="button"
													onclick={() => {
														removeFile('goAmlFormFile');
														updateSale.fields.goAmlStatus?.set(undefined);
													}}
													class="text-destructive hover:text-destructive/80"
												>
													<Trash2 class="h-5 w-5" />
												</button>
											{/if}
										</div>
									</div>
									<div class="flex w-full items-center gap-3">
										<span class="text-sm text-muted-foreground">Status:</span>
										<button
											type="button"
											disabled={!canUploadManually}
											class="rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:pointer-events-none {updateSale.fields.goAmlStatus?.value() ===
											'red-flag'
												? 'border-red-600 bg-red-100 text-red-700'
												: 'border-muted-foreground/40 text-muted-foreground hover:border-red-400 hover:text-red-600'}"
											onclick={() => updateSale.fields.goAmlStatus?.set('red-flag')}
										>
											Red Flag
										</button>
										<button
											type="button"
											disabled={!canUploadManually}
											class="rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:pointer-events-none {updateSale.fields.goAmlStatus?.value() ===
											'green-flag'
												? 'border-green-600 bg-green-100 text-green-700'
												: 'border-muted-foreground/40 text-muted-foreground hover:border-green-500 hover:text-green-600'}"
											onclick={() => updateSale.fields.goAmlStatus?.set('green-flag')}
										>
											Green Flag
										</button>
									</div>
								{:else if canUploadManually}
									<label
										for="goAmlFormFile"
										class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
									>
										<Upload class="h-5 w-5 text-gray-600" />
										<span class="text-sm font-medium">Upload Go AML form</span>
									</label>
								{:else}
									<div
										class="flex w-full items-center justify-center rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground"
									>
										Go AML form can be uploaded by an admin at any time
									</div>
								{/if}
								<Input
									id="goAmlFormFile"
									class="sr-only"
									{...updateSale.fields.goAmlFormFile?.as('file')}
									files={undefined}
									accept="application/pdf"
									onchange={(e) => handleFileUpload('goAmlFormFile', e)}
									disabled={!canUploadManually}
								/>
								<input type="hidden" {...updateSale.fields.goAmlStatus?.as('text')} />
								{#each updateSale.fields.goAmlFormFile?.issues() ?? [] as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
								{#each updateSale.fields.goAmlStatus?.issues() ?? [] as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
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
								value={submittedSaleType}
								onValueChange={(v) => {
									updateSale.fields.saleType.set(v as 'off-plan' | 'secondary');
									selectedSaleType = v;
								}}
								disabled={!canEditFields}
							>
								<Select.Trigger id="dealype">
									<div class="flex items-center gap-2">
										<Traffic />
										{saleTypeLabel}
									</div>
								</Select.Trigger>
								<Select.Content>
									{#each saleTypeOptions as saleType (saleType.value)}
										<Select.Item {...saleType} />
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="saleType" value={submittedSaleType} />
							{#each updateSale.fields.saleType.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field id="developer">
							<Popover.Root bind:open={developerPopoverOpen}>
								<Popover.Trigger class="w-full">
									<Button
										variant="outline"
										type="button"
										role="combobox"
										aria-expanded={developerPopoverOpen}
										class="w-full justify-start gap-2"
										disabled={!canEditFields}
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
												{#each filteredDevelopers as developer (developer.value)}
													<Command.Item
														value={developer.value}
														onSelect={() => {
															updateSale.fields.developer.set(developer.value);
															selectedDeveloper = developer.value;
															developerPopoverOpen = false;
															developerSearchValue = '';
														}}
													>
														{developer.label}
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
							<input type="hidden" name="developer" value={submittedDeveloper} />
							{#each updateSale.fields.developer.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>

						<Field.Field id="community">
							<Popover.Root bind:open={communityPopoverOpen}>
								<Popover.Trigger class="w-full">
									<Button
										variant="outline"
										type="button"
										role="combobox"
										aria-expanded={communityPopoverOpen}
										class="w-full justify-start gap-2"
										disabled={!canEditFields}
									>
										<Home class="h-4 w-4" />
										<span class="truncate">{communityLabel}</span>
									</Button>
								</Popover.Trigger>
								<Popover.Content class="w-50 p-0" align="start">
									<Command.Root>
										<Command.Input
											placeholder="Search community..."
											bind:value={communitySearchValue}
										/>
										<Command.List>
											<Command.Empty>No community found.</Command.Empty>
											<Command.Group>
												{#each filteredCommunities as community (community.value)}
													<Command.Item
														value={community.value}
														onSelect={() => {
															updateSale.fields.community?.set(community.value);
															selectedCommunity = community.value;
															communityPopoverOpen = false;
															communitySearchValue = '';
														}}
													>
														{community.label}
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
							{#if effectiveCommunity}
								<input type="hidden" name="community" value={effectiveCommunity} />
							{/if}
							{#each updateSale.fields.community?.issues() ?? [] as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>

				<Field.Group>
					<div class="grid grid-cols-2 gap-4">
						<Field.Field id="propertyType">
							<Select.Root
								type="single"
								value={submittedPropertyType}
								onValueChange={(v) => {
									updateSale.fields.propertyType.set(
										v as 'apartment' | 'townhouse' | 'villa' | 'commercial' | 'plot'
									);
									selectedPropertyType = v;
								}}
								disabled={!canEditFields}
							>
								<Select.Trigger id="propertyType">
									<div class="flex items-center gap-2">
										<Building />
										{propertyTypeLabel}
									</div>
								</Select.Trigger>
								<Select.Content>
									{#each propertyTypeOptions as propertyType (propertyType.value)}
										<Select.Item {...propertyType} />
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="propertyType" value={submittedPropertyType} />
							{#each updateSale.fields.propertyType.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>

					<!-- Conditional Fields Based on Property Type -->
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<!-- Apartment Fields -->
						{#if effectivePropertyType === 'apartment'}
							<Field.Field id="bedroomType">
								<Select.Root
									type="single"
									value={updateSale.fields.bedroomType.value() ?? ''}
									onValueChange={(v) =>
										updateSale.fields.bedroomType.set(
											v as unknown as NonNullable<
												Parameters<typeof updateSale.fields.bedroomType.set>[0]
											>
										)}
									disabled={!canEditFields}
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
								<input type="hidden" {...updateSale.fields.bedroomType.as('text')} />
								{#each updateSale.fields.bedroomType.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<InputGroup.Root id="propertySize">
									<InputGroup.Input
										{...updateSale.fields.propertySize.as('number')}
										placeholder="Property Size"
									/>
									<InputGroup.Addon>
										<span class="text-xs">Sqft</span>
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each updateSale.fields.propertySize.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						{/if}

						<!-- Townhouse/Villa Fields -->
						{#if effectivePropertyType === 'townhouse' || effectivePropertyType === 'villa'}
							<Field.Field id="bedroomType">
								<Select.Root
									type="single"
									value={updateSale.fields.bedroomType.value() ?? ''}
									onValueChange={(v) =>
										updateSale.fields.bedroomType.set(
											v as unknown as NonNullable<
												Parameters<typeof updateSale.fields.bedroomType.set>[0]
											>
										)}
									disabled={!canEditFields}
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
								<input type="hidden" {...updateSale.fields.bedroomType.as('text')} />
								{#each updateSale.fields.bedroomType.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<InputGroup.Root id="plotArea">
									<InputGroup.Input
										{...updateSale.fields.plotArea.as('number')}
										placeholder="Plot Area"
									/>
									<InputGroup.Addon>
										<span class="text-xs">Sqft</span>
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each updateSale.fields.plotArea.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<InputGroup.Root id="builtUpArea">
									<InputGroup.Input
										{...updateSale.fields.builtUpArea.as('number')}
										placeholder="Built Up Area"
									/>
									<InputGroup.Addon>
										<span class="text-xs">Sqft</span>
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each updateSale.fields.builtUpArea.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						{/if}

						<!-- Commercial Fields -->
						{#if effectivePropertyType === 'commercial'}
							<Field.Field id="commercialSubType">
								<Select.Root
									type="single"
									value={updateSale.fields.commercialSubType.value() ?? ''}
									onValueChange={(v) =>
										updateSale.fields.commercialSubType.set(v as 'office' | 'warehouse')}
									disabled={!canEditFields}
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
								<input type="hidden" {...updateSale.fields.commercialSubType.as('text')} />
								{#each updateSale.fields.commercialSubType.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							<Field.Field>
								<InputGroup.Root id="propertySize">
									<InputGroup.Input
										{...updateSale.fields.propertySize.as('number')}
										placeholder="Property Size"
									/>
									<InputGroup.Addon>
										<span class="text-xs">Sqft</span>
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each updateSale.fields.propertySize.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
							{#if updateSale.fields.commercialSubType.value() === 'warehouse'}
								<Field.Field>
									<InputGroup.Root id="grossFloorArea">
										<InputGroup.Input
											{...updateSale.fields.grossFloorArea.as('number')}
											placeholder="Gross Floor Area"
										/>
										<InputGroup.Addon>
											<span class="text-xs">Sqft</span>
										</InputGroup.Addon>
									</InputGroup.Root>
									{#each updateSale.fields.grossFloorArea.issues() as issue, i (i)}
										<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
									{/each}
								</Field.Field>
							{/if}
						{/if}

						<!-- Plot Fields -->
						{#if effectivePropertyType === 'plot'}
							<Field.Field>
								<InputGroup.Root id="propertySize">
									<InputGroup.Input
										{...updateSale.fields.propertySize.as('number')}
										placeholder="Property Size"
									/>
									<InputGroup.Addon>
										<span class="text-xs">Sqft</span>
									</InputGroup.Addon>
								</InputGroup.Root>
								{#each updateSale.fields.propertySize.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						{/if}
					</div>
					<div class="grid grid-cols-3 gap-4">
						<Field.Field>
							<InputGroup.Root id="project">
								<InputGroup.Input
									{...updateSale.fields.project.as('text')}
									placeholder="Select Project"
									disabled={!canEditFields}
								/>
								<InputGroup.Addon>
									<Building />
								</InputGroup.Addon>
							</InputGroup.Root>
							{#each updateSale.fields.project.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<InputGroup.Root id="unitNo">
								<InputGroup.Input
									{...updateSale.fields.unitNo.as('text')}
									placeholder="Unit No"
									disabled={!canEditFields}
								/>
								<InputGroup.Addon>
									<Home />
								</InputGroup.Addon>
							</InputGroup.Root>
							{#each updateSale.fields.unitNo.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<InputGroup.Root id="unitValue">
								<InputGroup.Input
									{...updateSale.fields.unitValue.as('text')}
									placeholder="Unit Value"
									disabled={!canEditFields}
								/>
								<InputGroup.Addon>
									<PriceTag />
								</InputGroup.Addon>
							</InputGroup.Root>
							{#each updateSale.fields.unitValue.issues() as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
						<Field.Field>
							<Field.Label for="commissionPercentage">Commission %</Field.Label>
							<InputGroup.Root id="commissionPercentage">
								<InputGroup.Input
									{...updateSale.fields.commissionPercentage?.as('number')}
									type="number"
									min="0"
									max="100"
									step="0.01"
									placeholder="e.g. 5"
									disabled={!canEditSale && !isFinanceRole}
								/>
								<InputGroup.Addon>%</InputGroup.Addon>
							</InputGroup.Root>
							{#each updateSale.fields.commissionPercentage?.issues() ?? [] as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>

					{@const commissionPct = updateSale.fields.commissionPercentage?.value()}
					{@const rawUnitValue = parseFloat(
						(updateSale.fields.unitValue.value() ?? '').replace(/,/g, '')
					)}
					{@const revenueAchieved =
						commissionPct && !isNaN(rawUnitValue)
							? Math.round((rawUnitValue * commissionPct) / 100)
							: null}
					{@const passback = updateSale.fields.passbackAmount?.value()}
					{@const revenueAfterPassback =
						revenueAchieved !== null ? Math.round(revenueAchieved - (passback ?? 0)) : null}

					{#if revenueAchieved !== null}
						<div class="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4">
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Revenue Achieved</p>
								<p class="font-semibold">
									AED {new Intl.NumberFormat('en-US').format(revenueAchieved)}
								</p>
							</div>
							<div class="space-y-1">
								<p class="text-xs text-muted-foreground">Revenue After Passback</p>
								<p class="font-semibold">
									{#if revenueAfterPassback !== null}
										AED {new Intl.NumberFormat('en-US').format(revenueAfterPassback)}
									{:else}
										—
									{/if}
								</p>
							</div>
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<Field.Field>
							<Field.Label for="passbackAmount"
								>Passback Amount <span class="text-muted-foreground">(Optional)</span></Field.Label
							>
							<InputGroup.Root id="passbackAmount">
								<InputGroup.Addon>AED</InputGroup.Addon>
								<InputGroup.Input
									{...updateSale.fields.passbackAmount?.as('number')}
									type="number"
									min="0"
									step="0.01"
									placeholder="e.g. 55500"
									disabled={!canEditSale && !isFinanceRole}
								/>
							</InputGroup.Root>
							{#each updateSale.fields.passbackAmount?.issues() ?? [] as issue, i (i)}
								<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
							{/each}
						</Field.Field>
					</div>
				</Field.Group>
			</Field.Set>
			<Field.Separator />

			<!-- Deal Status Section -->
			<Field.Set>
				<Field.Legend class="flex items-center gap-4 text-lg font-medium">Deal Status</Field.Legend>
				{#each updateSale.fields.dealStage.issues() as issue, i (i)}
					<Field.Error class="text-sm text-destructive">
						{issue.message}
					</Field.Error>
				{/each}
				<Field.Group class="space-y-4">
					<RadioGroup.Root
						bind:value={
							() => effectiveDealStage,
							(v) => {
								selectedDealStage = v;
								updateSale.fields.dealStage.set(v || undefined);
								if (v === 'cancelled') updateSale.fields.paymentValue.set(0);
							}
						}
						class="grid w-full grid-cols-1 gap-4 xl:grid-cols-3"
					>
						<div class="flex min-w-0 flex-col gap-3 rounded-lg border border-border/60 p-4">
							<Field.Field orientation="horizontal">
								<RadioGroup.Item value="eoi" id="deal-eoi" />
								<Field.Label for="deal-eoi" class="font-normal">EOI</Field.Label>
							</Field.Field>
							<Field.Field>
								<DealPercentage
									bind:value={
										() => updateSale.fields.paymentValue.value() ?? 0,
										(v) => updateSale.fields.paymentValue.set(Number(v) || 0)
									}
									disabled={effectiveDealStage !== 'eoi'}
								/>
								<input class="sr-only" {...updateSale.fields.paymentValue.as('number')} />
								{#each updateSale.fields.paymentValue.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						</div>
						<div class="flex min-w-0 flex-col gap-3 rounded-lg border border-border/60 p-4">
							<Field.Field orientation="horizontal">
								<RadioGroup.Item value="booking" id="deal-booking" />
								<Field.Label for="deal-booking" class="font-normal">Booking Stage</Field.Label>
							</Field.Field>
							<Field.Field>
								<DealPercentage
									bind:value={
										() => updateSale.fields.paymentValue.value() ?? 0,
										(v) => updateSale.fields.paymentValue.set(Number(v) || 0)
									}
									disabled={effectiveDealStage !== 'booking'}
								/>
								{#each updateSale.fields.paymentValue.issues() as issue, i (i)}
									<Field.Error class="text-sm text-destructive">{issue.message}</Field.Error>
								{/each}
							</Field.Field>
						</div>
						<div class="flex min-w-0 flex-col gap-3 rounded-lg border border-border/60 p-4">
							<Field.Field orientation="horizontal">
								<RadioGroup.Item value="cancelled" id="deal-cancelled" />
								<Field.Label for="deal-cancelled" class="font-normal">Cancelled Deal</Field.Label>
							</Field.Field>
						</div>
					</RadioGroup.Root>
					<input type="hidden" name="dealStage" value={submittedDealStage} />

					<!-- File Uploads - Only show when a stage is selected -->
					{#if effectiveDealStage && effectiveDealStage !== 'cancelled'}
						<div class="space-y-4 pt-2">
							<Field.Field class="w-full">
								{#if uploadedFiles.bookingFormFile}
									<h3 class="text-sm font-medium">
										{effectiveDealStage === 'eoi' ? 'EOI Form' : 'Booking Form'}
									</h3>

									<div
										class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
									>
										<div class="flex items-center gap-3">
											<FileText class="h-10 w-10 text-orange-500" />
											<div class="flex flex-col">
												<span class="text-sm font-medium">{uploadedFiles.bookingFormFile.name}</span
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
											{effectiveDealStage === 'eoi' ? 'Upload EOI form' : 'Upload booking form'}
										</span>
									</label>
								{/if}
								<Input
									id="bookingFormFile"
									class="sr-only"
									{...updateSale.fields.bookingFormFile.as('file')}
									files={undefined}
									accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
									onchange={(e) => handleFileUpload('bookingFormFile', e)}
								/>
								{#each updateSale.fields.bookingFormFile.issues() as issue, i (i)}
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
									{...updateSale.fields.paymentReceiptFile.as('file')}
									files={undefined}
									accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
									onchange={(e) => handleFileUpload('paymentReceiptFile', e)}
								/>
								{#each updateSale.fields.paymentReceiptFile.issues() as issue, i (i)}
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
					{#if uploadedFiles.refferalAgreementFile}
						<h3 class="text-sm font-medium">Referral Agreement</h3>
						<div
							class="flex w-full items-center justify-between gap-3 rounded-lg border border-muted-foreground/40 bg-background p-3"
						>
							<div class="flex items-center gap-3">
								<FileText class="h-10 w-10 text-orange-500" />
								<div class="flex flex-col">
									<span class="text-sm font-medium">{uploadedFiles.refferalAgreementFile.name}</span
									>
									<span class="text-xs text-muted-foreground"
										>{formatFileSize(uploadedFiles.refferalAgreementFile.size)}</span
									>
									{#if uploadedFiles.refferalAgreementFile.docusignStatus}
										<span class="text-xs text-muted-foreground">
											DocuSign {uploadedFiles.refferalAgreementFile.docusignStatus}
											{uploadedFiles.refferalAgreementFile.referenceNo
												? ` - Ref ${uploadedFiles.refferalAgreementFile.referenceNo}`
												: ''}
										</span>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if uploadedFiles.refferalAgreementFile.downloadURL}
									<a
										href={uploadedFiles.refferalAgreementFile.downloadURL}
										target="_blank"
										class="text-sm font-medium text-primary hover:underline"
									>
										Open
									</a>
								{/if}
								<button
									type="button"
									onclick={() => removeFile('refferalAgreementFile')}
									class="text-destructive hover:text-destructive/80"
								>
									<Trash2 class="h-5 w-5" />
								</button>
							</div>
						</div>
					{:else}
						<div class="flex w-full flex-row gap-2">
							<Button
								variant="outline"
								type="button"
								class="flex-1 bg-orange-50/40"
								disabled={referralGenerating}
								onclick={() => {
									const firstName = updateSale.fields.firstName.value();
									const lastName = updateSale.fields.lastName.value();
									const email = updateSale.fields.email.value();

									if (!firstName || !lastName || !email) {
										toast.error(
											'Please fill in client details before generating referral agreement'
										);
										return;
									}

									// Open the inline form with buyer data
									currentBuyerData = { firstName, lastName, email };
									showReferralForm = true;
								}}
							>
								{#if referralGenerating}
									<Loader2 class="h-4 w-4 animate-spin" />
									Generating...
								{:else if referralEnvelope}
									<CheckCircled class="h-4 w-4 text-green-600" />
									Referral agreement sent
								{:else}
									<PlusRound class="h-4 w-4" />
									Generate Referral Agreement
								{/if}
							</Button>
							{#if referralEnvelope}
								<Button
									variant="outline"
									type="button"
									class="flex-1"
									onclick={() => {
										if (referralEnvelope?.envelopeId) {
											window.open(
												`/api/get-docusign-document?envelopeId=${referralEnvelope.envelopeId}`,
												'_blank'
											);
										}
									}}
								>
									<ExternalLink class="h-4 w-4" />
									Open Generated Agreement
								</Button>
							{/if}
							{#if canUploadManually && !referralEnvelope}
								<span class="self-center text-center text-xs text-muted-foreground">or</span>
								<label
									for="refferalAgreementFile"
									class="flex w-full flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
								>
									<Upload class="h-5 w-5 text-gray-600" />
									<span class="text-sm font-medium">Upload manually</span>
								</label>
							{/if}
						</div>
					{/if}
					<Input
						id="refferalAgreementFile"
						class="sr-only"
						{...updateSale.fields.refferalAgreementFile.as('file')}
						files={undefined}
						accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
						onchange={(e) => handleFileUpload('refferalAgreementFile', e)}
						disabled={!canUploadManually}
					/>
				</Field.Group>
			</Field.Set>
			<Field.Separator />

			<!-- Invoicing Stage Section -->
			<Field.Set>
				<Field.Legend class="text-lg font-medium">Invoicing Stage</Field.Legend>
				{#each updateSale.fields.invoiceStage.issues() as issue, i (i)}
					<Field.Error class="text-sm text-destructive">
						{issue.message}
					</Field.Error>
				{/each}

				<div class="flex w-full flex-row items-start gap-4">
					<div class="flex w-full flex-col gap-4">
						<Field.Field orientation="horizontal" class="items-start space-x-3">
							<Checkbox
								id="eligible-first-half"
								bind:checked={firstHalfChecked}
								onCheckedChange={handleHalfChange}
								disabled={!canEditSale && !isFinanceRole}
							/>
							<div class="flex flex-col gap-1">
								<Field.Label for="eligible-first-half" class="text-sm font-normal">
									Eligible for first half
								</Field.Label>
								<span class="text-sm text-muted-foreground">10 + 4% paid</span>
							</div>
						</Field.Field>
						<Field.Field orientation="horizontal" class="items-start space-x-3">
							<Checkbox
								id="eligible-second-half"
								bind:checked={secondHalfChecked}
								onCheckedChange={handleHalfChange}
								disabled={!canEditSale && !isFinanceRole}
							/>
							<div class="flex flex-col gap-1">
								<Field.Label for="eligible-second-half" class="text-sm font-normal">
									Eligible for second half
								</Field.Label>
								<span class="text-sm text-muted-foreground">20 + 4% paid</span>
							</div>
						</Field.Field>
					</div>

					<HorizontalSeparator text="OR" class="mx-4" />

					<div class="flex w-full flex-col gap-4">
						<Field.Field orientation="horizontal" class="items-start space-x-3">
							<Checkbox
								id="eligible-full"
								bind:checked={fullChecked}
								onCheckedChange={handleFullChange}
								disabled={!canEditSale && !isFinanceRole}
							/>
							<div class="flex flex-col gap-1">
								<Field.Label for="eligible-full" class="text-sm font-normal">
									Eligible for full
								</Field.Label>
								<span class="text-sm text-muted-foreground">20 + 4% paid</span>
							</div>
						</Field.Field>
					</div>

					<HorizontalSeparator text="OR" class="mx-4" />

					<div class="flex w-full flex-col gap-4">
						<Field.Field orientation="horizontal" class="items-start space-x-3">
							<Checkbox
								id="not-yet-eligible"
								bind:checked={notEligibleChecked}
								onCheckedChange={handleNotEligibleChange}
								disabled={!canEditSale && !isFinanceRole}
							/>
							<div class="flex flex-col gap-1">
								<Field.Label for="not-yet-eligible" class="text-sm font-normal">
									Not Eligible
								</Field.Label>
							</div>
						</Field.Field>
					</div>
				</div>

				{#if updateSale.fields.invoiceStage.value()?.includes('not-yet-eligible')}
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
												hiddenInput.value = value.toString();
											}
											popoverOpen = false;
										}}
									/>
								</Popover.Content>
							</Popover.Root>
							<input
								type="hidden"
								name="tentativeEligibilityDate"
								value={tentativeEligibilityDate ? tentativeEligibilityDate.toString() : ''}
							/>
						</Field.Field>
					</div>
				{/if}

				{#each updateSale.fields.invoiceStage.value() ?? [] as stage (stage)}
					<input type="hidden" name="invoiceStage[]" value={stage} />
				{/each}
			</Field.Set>
			<Field.Separator />

			<!-- Deal Owners Section -->
			<Field.Set>
				<Field.Legend class="text-lg font-medium">Deal Owners</Field.Legend>
				<OrderSplit
					bind:splits={dealSplits}
					disabled={!canEditFields}
					onsplitschange={(s) => syncSplits(s)}
				/>
				{#if splitMissingHierarchy}
					<Field.Error class="text-sm text-destructive">
						Manager and senior manager are required for the {splitMissingHierarchy.ownerRole} split.
					</Field.Error>
				{/if}
				{#each dealSplits as split, index (split.key)}
					<input type="hidden" name="splits[{index}].agentId" value={split.agentId} />
					<input type="hidden" name="splits[{index}].agentEmail" value={split.agentEmail} />
					<input type="hidden" name="splits[{index}].agentName" value={split.agentName} />
					<input
						type="hidden"
						name="splits[{index}].agentPhotoURL"
						value={split.agentPhotoURL ?? ''}
					/>
					<input type="hidden" name="splits[{index}].ownerRole" value={split.ownerRole} />
					<input type="hidden" name="n:splits[{index}].percentage" value={split.percentage} />
					<input
						type="hidden"
						name="splits[{index}].managerEmail"
						value={split.managerEmail ?? ''}
					/>
					<input
						type="hidden"
						name="splits[{index}].seniorManagerEmail"
						value={split.seniorManagerEmail ?? ''}
					/>
				{/each}
			</Field.Set>
			<Field.Separator />

			<!-- Joint Buyers Sections-->
			<Field.Set>
				<Field.Legend class="text-lg font-medium">Joint Buyers</Field.Legend>

				{#each jointBuyers as buyer, index (buyer.key)}
					<div class="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/80 p-4">
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
									<Input
										id={`joint-firstName-${buyer.key}`}
										bind:value={jointBuyerDetails[buyer.key].firstName}
										placeholder="First Name"
										disabled={!canEditFields}
									/>
								</Field.Field>
								<Field.Field>
									<Input
										id={`joint-lastName-${buyer.key}`}
										bind:value={jointBuyerDetails[buyer.key].lastName}
										placeholder="Last Name"
										disabled={!canEditFields}
									/>
								</Field.Field>
								<Field.Field>
									<Input
										id={`joint-email-${buyer.key}`}
										bind:value={jointBuyerDetails[buyer.key].email}
										placeholder="Email"
										type="email"
										disabled={!canEditFields}
									/>
								</Field.Field>
							</div>

							<Field.Field>
								<PhoneInput
									bind:value={jointBuyerPhoneValues[buyer.key]}
									bind:country={jointBuyerPhoneCountries[buyer.key]}
									showCountrySelect={true}
									disabled={!canEditFields}
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
							<input
								type="hidden"
								name={`jointBuyers[${index}].firstName`}
								value={jointBuyerDetails[buyer.key]?.firstName ?? ''}
							/>
							<input
								type="hidden"
								name={`jointBuyers[${index}].lastName`}
								value={jointBuyerDetails[buyer.key]?.lastName ?? ''}
							/>
							<input
								type="hidden"
								name={`jointBuyers[${index}].email`}
								value={jointBuyerDetails[buyer.key]?.email ?? ''}
							/>
							{#if removedJointBuyerFiles[buyer.key]?.passportFile}
								<input
									type="hidden"
									name={`jointBuyers[${index}].removePassportFile`}
									value="true"
								/>
							{/if}
							{#if removedJointBuyerFiles[buyer.key]?.nationalIdFile}
								<input
									type="hidden"
									name={`jointBuyers[${index}].removeNationalIdFile`}
									value="true"
								/>
							{/if}
							{#if removedJointBuyerFiles[buyer.key]?.amlFormFile}
								<input
									type="hidden"
									name={`jointBuyers[${index}].removeAmlFormFile`}
									value="true"
								/>
							{/if}
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
													onchange={(e) => handleJointBuyerFileUpload(buyer.key, 'passportFile', e)}
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
																? formatFileSize(jointBuyerFiles[buyer.key]?.amlFormFile?.size ?? 0)
																: ''}</span
														>
														{#if jointBuyerFiles[buyer.key]?.amlFormFile?.docusignStatus}
															<span class="text-xs text-muted-foreground">
																DocuSign {jointBuyerFiles[buyer.key]?.amlFormFile?.docusignStatus}
																{jointBuyerFiles[buyer.key]?.amlFormFile?.referenceNo
																	? ` - Ref ${jointBuyerFiles[buyer.key]?.amlFormFile?.referenceNo}`
																	: ''}
															</span>
														{/if}
													</div>
												</div>
												<div class="flex items-center gap-2">
													{#if jointBuyerFiles[buyer.key]?.amlFormFile?.downloadURL}
														<a
															href={jointBuyerFiles[buyer.key]?.amlFormFile?.downloadURL}
															target="_blank"
															class="text-sm font-medium text-primary hover:underline"
														>
															Open
														</a>
													{/if}
													<button
														type="button"
														onclick={() => removeJointBuyerFile(buyer.key, 'amlFormFile')}
														class="text-destructive hover:text-destructive/80"
													>
														<Trash2 class="h-5 w-5" />
													</button>
												</div>
											</div>
										{:else}
											<div class="flex w-full flex-col gap-2">
												<Button
													variant="outline"
													type="button"
													class="w-full bg-orange-50/40"
													disabled={amlGenerating[`joint-${buyer.key}`]}
													onclick={() => {
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

														if (!firstName || !lastName || !email) {
															toast.error(
																'Please fill in joint buyer name and email before generating AML form'
															);
															return;
														}

														// Open the inline form with buyer data
														currentAMLTarget = { buyerType: 'joint', jointBuyerIndex: index };
														currentBuyerData = { firstName, lastName, email, phone };
														showAMLForm = true;
													}}
												>
													{#if amlGenerating[`joint-${buyer.key}`]}
														<Loader2 class="h-4 w-4 animate-spin" />
														Generating...
													{:else if amlEnvelopes[`joint-${buyer.key}`]}
														<CheckCircled class="h-4 w-4 text-green-600" />
														AML form sent
													{:else}
														<PlusRound class="h-4 w-4" />
														Generate Now
													{/if}
												</Button>
												{#if amlEnvelopes[`joint-${buyer.key}`]}
													<Button
														variant="outline"
														type="button"
														class="w-full"
														onclick={() => {
															const envelopeId = amlEnvelopes[`joint-${buyer.key}`]?.envelopeId;
															if (envelopeId) {
																window.open(
																	`/api/get-docusign-document?envelopeId=${envelopeId}`,
																	'_blank'
																);
															}
														}}
													>
														<ExternalLink class="h-4 w-4" />
														Open Generated AML
													</Button>
												{/if}
												{#if canUploadManually && !amlEnvelopes[`joint-${buyer.key}`]}
													<span class="text-center text-xs text-muted-foreground">or</span>
													<label
														for={`joint-amlFormFile-${buyer.key}`}
														class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-lg font-semibold text-foreground transition hover:border-foreground/60"
													>
														<Upload class="h-5 w-5 text-gray-600" />
														<span class="text-sm font-medium">Upload manually</span>
													</label>
												{/if}
											</div>
										{/if}
										<Input
											id={`joint-amlFormFile-${buyer.key}`}
											name={`jointBuyers[${index}].amlFormFile`}
											class="sr-only"
											type="file"
											accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
											onchange={(e) => handleJointBuyerFileUpload(buyer.key, 'amlFormFile', e)}
											disabled={!canUploadManually}
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
	{#if updateSale.pending}
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
</div>

<!-- AML Form Inline Sheet -->
<AMLFormInline
	bind:open={showAMLForm}
	buyerData={currentBuyerData}
	saleId={sale?.id}
	target={currentAMLTarget}
	onGenerated={handleAMLGenerated}
/>

<!-- Referral Form Inline Sheet -->
<ReferralFormInline
	bind:open={showReferralForm}
	buyerData={currentBuyerData}
	saleId={sale?.id}
	propertyName={sale?.project}
	onGenerated={handleReferralGenerated}
/>

<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Sale</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete sale
				<span class="font-semibold">{sale?.id ?? ''}</span>
				for
				<span class="font-semibold">
					{sale?.clientDetails.firstName ?? ''}
					{sale?.clientDetails.lastName ?? ''}
				</span>
				? This will hide the sale from normal sales views, but keep its documents and audit history.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isDeletingSale}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="text-destructive-foreground bg-destructive hover:bg-destructive/90"
				disabled={isDeletingSale}
				onclick={handleDeleteSale}
			>
				{isDeletingSale ? 'Deleting...' : 'Delete'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
