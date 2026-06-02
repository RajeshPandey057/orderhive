import 'unplugin-icons/types/svelte';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	type Role = {
		uid?: string;
		email: string;
		team?: string[];
		lastName?: string;
		photoURL?: string;
		firstName?: string;
		createdAt?: FieldValue;
		updatedAt?: FieldValue;
		seniorManagerEmail?: string;
		accessType:
			| 'admin'
			| 'agent'
			| 'finance'
			| 'compliance'
			| 'super-admin'
			| 'manager'
			| 'senior-manager'
			| 'general';
		managedTeamIds?: string[];
	};
	type EmployeeStatus = 'active' | 'inactive' | 'archived';
	type EmployeeAccessStatus = 'enabled' | 'disabled' | 'missing';
	type EmployeeDocumentKind =
		| 'offerLetter'
		| 'passport'
		| 'visitOrResidenceVisa'
		| 'nationalId'
		| 'educationalCertificates'
		| 'passportSizePhoto'
		| 'lastThreeMonthsSalarySlips'
		| 'relievingLetter'
		| 'experienceLetter'
		| 'signedNdaFile';
	type EmployeeStoredFile = {
		path: string;
		downloadURL: string;
		token: string;
		contentType: string;
		size: number;
		name: string;
		lastModified: number;
		original?: {
			name: string;
			size: number;
			type: string;
			lastModified: number;
		};
		uploadedAt?: string;
		uploadedByEmail?: string;
	};
	type Employee = {
		id: string;
		email: string;
		name: string;
		code: string;
		department: string;
		designation: string;
		location: string;
		status: EmployeeStatus;
		reportingManagerEmail?: string;
		seniorManagerEmail?: string;
		doj?: string;
		probationEndingDate?: string;
		lastWorkingDay?: string;
		compensationAED?: number;
		compensationINR?: number;
		mobileNumber?: string;
		countryCode?: string;
		personalEmail?: string;
		maritalStatus?: string;
		spouseName?: string;
		fatherName?: string;
		motherName?: string;
		addressUAE?: string;
		homeCountryAddress?: string;
		emergencyContactName?: string;
		emergencyContactNumber?: string;
		emergencyRelationship?: string;
		nationality?: string;
		gender?: string;
		dateOfBirth?: string;
		visaType?: string;
		visaEndingDate?: string;
		fresherOrExperienced?: string;
		documents?: Partial<Record<EmployeeDocumentKind, EmployeeStoredFile>>;
		accessType?: Role['accessType'];
		managedTeamIds?: string[];
		accessStatus: EmployeeAccessStatus;
		createdAt?: string;
		updatedAt?: string;
		createdByEmail?: string;
		updatedByEmail?: string;
		archivedAt?: string;
		archivedByEmail?: string;
	};
	type Holiday = {
		id: string;
		name: string;
		date: string;
		type: 'mandatory' | 'optional';
		year: number;
		createdAt?: string;
		createdByEmail?: string;
	};
	type LeaveStatus = 'pending' | 'approved' | 'rejected';
	type LeaveRequest = {
		id: string;
		employeeEmail: string;
		employeeName: string;
		type: string;
		startDate: string;
		endDate: string;
		reason: string;
		status: LeaveStatus;
		days: number;
		paidSickDays?: number;
		lopDays?: number;
		reviewerEmail?: string;
		reviewedAt?: string;
		createdAt?: string;
		updatedAt?: string;
	};
	type AttendanceStatus = 'present' | 'late' | 'absent' | 'on-leave' | 'holiday';
	type AttendanceLog = {
		id: string;
		employeeEmail: string;
		employeeName: string;
		employeeCode?: string;
		date: string;
		branch?: string;
		punchIn?: string;
		punchOut?: string;
		workingMinutes?: number;
		overtimeMinutes?: number;
		shortByMinutes?: number;
		status: AttendanceStatus;
		source?: 'manual' | 'import' | 'biometric';
		corrected?: boolean;
		updatedAt?: string;
	};
	type AttendanceCorrection = {
		id: string;
		attendanceLogId: string;
		employeeEmail: string;
		correctedPunchIn?: string;
		correctedPunchOut?: string;
		reason: string;
		createdAt?: string;
		createdByEmail: string;
	};
	type BiometricPunch = {
		id: string;
		deviceSn: string;
		deviceUserId: string;
		employeeEmail: string | null;
		employeeName: string | null;
		date: string;
		timeStr: string;
		timestamp: string;
		inOutMode: number;
		verifyType: number;
		processed: boolean;
		branch?: string;
	};
	type SaleDocumentStatus = 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
	type SaleDocumentFile = {
		financeStatus: SaleDocumentStatus;
		complianceStatus: SaleDocumentStatus;
		original?: {
			name: string;
			size: number;
			type: string;
			lastModified: number;
		};
		path?: string;
		downloadURL?: string;
		token?: string;
		contentType?: string;
		size?: number;
		name?: string;
		lastModified?: number;
		source?: 'upload' | 'docusign';
		referenceNo?: string;
		generatedAt?: string;
		docusign?: {
			envelopeId: string;
			status: string;
			statusDateTime?: string;
			uri?: string;
			recipientEmail?: string;
			recipientName?: string;
			documentId?: string;
		};
	};
	type ListingDocumentFile = {
		original?: {
			name: string;
			size: number;
			type: string;
			lastModified: number;
		};
		path?: string;
		downloadURL?: string;
		token?: string;
		contentType?: string;
		size?: number;
		name?: string;
	};
	type Sale = {
		id: string;
		commnets: {
			authourName: string;
			authourUid: string;
			team: 'finance' | 'compliance' | 'admin' | 'agent';
			authorEmail: string;
			authourPhotoURL: string;
			section:
				| 'client-details'
				| 'project-details'
				| 'deal-status'
				| 'refferal-agreement'
				| 'invoicing-stage'
				| 'deal-owners'
				| 'joint-buyers';
			message: string;
			createdAt: FieldValue;
		}[];
		status: 'pending' | 'approved' | 'rejected';
		financeStatus: 'pending' | 'approved' | 'not-eligible' | 'rejected';
		complianceStatus: 'pending' | 'approved' | 'not-eligible' | 'rejected';
		invoiceFile: SaleDocumentFile | null;
		clientDetails: {
			firstName: string;
			lastName: string;
			email: string;
			phone: string;
			passportFile: SaleDocumentFile | null;
			amlFormFile: SaleDocumentFile | null;
			nationalIdFile: SaleDocumentFile | null;
		};
		refferalAgreementFile: SaleDocumentFile | null;
		jointBuyers: {
			firstName: string;
			lastName: string;
			email: string;
			phone: string;
			amlFormFile: SaleDocumentFile | null;
			passportFile: SaleDocumentFile | null;
			nationalIdFile: SaleDocumentFile | null;
		}[];
		dealOwners: {
			userId: string;
			email: string;
			name: string;
			photoURL: string;
			ownerRole: 'caller' | 'closer' | 'closer2' | 'closer3';
			split: number;
		}[];
		dealOwnerIds: string[];
		splits?: {
			agentId: string;
			agentName: string;
			agentEmail?: string;
			agentPhotoURL?: string;
			percentage: number;
			ownerRole: 'caller' | 'closer' | 'closer2' | 'closer3';
			managerEmail?: string;
			seniorManagerEmail?: string;
		}[];
		splitAgentIds?: string[];
		dealStage: 'eoi' | 'booking' | 'cancelled';
		paymentValue: number;
		bookingFormFile: SaleDocumentFile | null;
		paymentReceiptFile: SaleDocumentFile | null;

		saleType: 'off-plan' | 'secondary';
		developer: string;
		project: string;
		community?: string;
		invoiceStage: ('first-half' | 'second-half' | 'full' | 'not-yet-eligible')[];
		tentativeEligibilityDate: string | null;
		propertyType: 'apartment' | 'townhouse' | 'villa' | 'commercial' | 'plot';
		bedroomType?:
			| 'studio'
			| '1bed'
			| '2bed'
			| '2bed+maid'
			| '3bed'
			| '3bed+maid'
			| '4bed'
			| '5bed'
			| '6-7bed'
			| 'duplex'
			| 'penthouse'
			| 'podium-townhouse';
		commercialSubType?: 'office' | 'warehouse';
		propertySize?: number;
		plotArea?: number;
		builtUpArea?: number;
		grossFloorArea?: number;
		unitNo: string;
		unitValue: string;
		commissionPercentage?: number;
		revenueAchieved?: number;
		passbackAmount?: number;
		revenueAfterPassback?: number;
		saleDate?: string;
		nationality?: string;
		residentStatus?: 'resident' | 'non-resident';
		callerManagerEmail?: string;
		closerManagerEmail?: string;
		callerSeniorManagerEmail?: string;
		closerSeniorManagerEmail?: string;
		isDeleted?: boolean;
		deletedAt?: FieldValue | null;
		deletedByUid?: string | null;
		deletedByEmail?: string | null;
		createdByUid: string;
		createdByEmail: string;
		createdAt: FieldValue;
		updatedAt: FieldValue;
	};
	type APIResponse<T = object> = { success: false; error: string } | { success: true; data: T };
	type ListingMediaItem =
		| {
				id: string;
				type: 'photo';
				url: string;
				thumbnailURL?: string;
				width?: number;
				height?: number;
		  }
		| {
				id: string;
				type: 'video';
				url: string;
				thumbnailURL?: string;
				posterURL?: string;
				width?: number;
				height?: number;
		  };
	type Listing = {
		id: string;
		listingType: 'internal' | 'portal';
		mediaAssets: { type: 'photo' | 'video'; fileName: string; url?: string }[];
		floorPlanAssets?: { fileName: string; url?: string }[];
		propertyAddress: {
			addressLine1?: string;
			addressLine2?: string;
			buildingName?: string;
			street?: string;
			area?: string;
			city?: string;
			country?: string;
			postalCode?: string;
			landmark?: string;
		};
		clientName: string;
		clientPhone: string;
		clientEmail: string;
		clients?: {
			firstName?: string;
			lastName?: string;
			name?: string;
			phone?: string;
			email?: string;
			titleDeedFileName?: string | null;
			passportFileName?: string | null;
			emiratesIdFileName?: string | null;
			attachments?: {
				titleDeed?: ListingDocumentFile | null;
				passport?: ListingDocumentFile | null;
				emiratesId?: ListingDocumentFile | null;
			};
		}[];
		availableFor: 'Sell' | 'Rent' | 'Both' | string;
		furnishing: 'Furnished' | 'Unfurnished' | 'Semi-Furnished' | string;
		city: string;
		location: string;
		agentEmail: string;
		agentMobile: string;
		reportingManager: string;
		seniorManager: string;
		developerName: string;
		projectName: string;
		unitNo: string;
		projectType: 'Off-Plan Property' | 'Ready Property' | string;
		unitType: string;
		unitTypeOther?: string;
		bedrooms?: string;
		unitArea: number;
		internalArea?: number;
		balconyArea?: number;
		plotSize?: number;
		builtUpArea?: number;
		unitStatus?: 'Off-Plan' | 'Rented' | 'Vacant' | string;
		paymentType: 'Cash' | 'Finance (Cash + Mortgage)' | string;
		rentAmount?: number | null;
		vacantDate?: string | null;
		handoverYear?: string;
		handoverQuarter?: string;
		paymentPlan?: string;
		originalPrice?: number | null;
		purchasePrice?: number | null;
		amountPaid?: number | null;
		titleDeedFileName?: string;
		passportFileName?: string;
		emiratesIdFileName?: string;
		videoFileName?: string;
		picturesFileName?: string;
		floorPlansFileName?: string;
		price: number;
		createdAt: string;
		createdByUid: string;
		createdByEmail: string;
	};
	namespace Superforms {
		type Message = { type: 'error' | 'success' | 'warning'; text: string };
	}
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				uid: string;
				email: string;
				role:
					| 'admin'
					| 'agent'
					| 'compliance'
					| 'finance'
					| 'super-admin'
					| 'manager'
					| 'senior-manager';
				managedTeamIds?: string[];
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
