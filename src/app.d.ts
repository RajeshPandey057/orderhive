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
		agentRole?: string;
		agentLevel?: string;
		createdAt?: FieldValue;
		updatedAt?: FieldValue;
		seniorManagerEmail?: string;
		reportingManagerEmail?: string;
		accessType: 'admin' | 'agent' | 'finance' | 'compliance' | 'super-admin';
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
		invoiceFile: {
			financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
			complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
			original:
				| {
						name: string;
						size: number;
						type: string;
						lastModified: number;
				  }
				| undefined;
			path: string | undefined;
			downloadURL: string | undefined;
			token: string | undefined;
			contentType: string | undefined;
			size: number | undefined;
			name: string | undefined;
			lastModified: number | undefined;
		} | null;
		clientDetails: {
			firstName: string;
			lastName: string;
			email: string;
			phone: string;
			passportFile: {
				financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				original: {
					name: string;
					size: number;
					type: string;
					lastModified: number;
				};
				path: string;
				downloadURL: string;
				token: string;
				contentType: string;
				size: number;
				name: string;
				lastModified: number;
			} | null;
			amlFormFile: {
				financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				original: {
					name: string;
					size: number;
					type: string;
					lastModified: number;
				};
				path: string;
				downloadURL: string;
				token: string;
				contentType: string;
				size: number;
				name: string;
				lastModified: number;
			} | null;
			nationalIdFile: {
				financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				original: {
					name: string;
					size: number;
					type: string;
					lastModified: number;
				};
				path: string;
				downloadURL: string;
				token: string;
				contentType: string;
				size: number;
				name: string;
				lastModified: number;
			} | null;
		};
		refferalAgreementFile: {
			financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
			complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
			original: {
				name: string;
				size: number;
				type: string;
				lastModified: number;
			};
			path: string;
			downloadURL: string;
			token: string;
			contentType: string;
			size: number;
			name: string;
			lastModified: number;
		} | null;
		jointBuyers: {
			firstName: string;
			lastName: string;
			email: string;
			phone: string;
			amlFormFile: {
				financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				original: {
					name: string;
					size: number;
					type: string;
					lastModified: number;
				};
				path: string;
				downloadURL: string;
				token: string;
				contentType: string;
				size: number;
				name: string;
				lastModified: number;
			} | null;
			passportFile: {
				financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				original: {
					name: string;
					size: number;
					type: string;
					lastModified: number;
				};
				path: string;
				downloadURL: string;
				token: string;
				contentType: string;
				size: number;
				name: string;
				lastModified: number;
			} | null;
			nationalIdFile: {
				financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
				original: {
					name: string;
					size: number;
					type: string;
					lastModified: number;
				};
				path: string;
				downloadURL: string;
				token: string;
				contentType: string;
				size: number;
				name: string;
				lastModified: number;
			} | null;
		}[];
		dealOwners: {
			userId: string;
			email: string;
			name: string;
			photoURL: string;
			ownerRole: 'caller' | 'closer';
			split: number;
		}[];
		dealOwnerIds: string[];
		dealStage: 'eoi' | 'booking';
		paymentValue: number;
		bookingFormFile: {
			financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
			complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
			original: {
				name: string;
				size: number;
				type: string;
				lastModified: number;
			};
			path: string;
			downloadURL: string;
			token: string;
			contentType: string;
			size: number;
			name: string;
			lastModified: number;
		} | null;
		paymentReceiptFile: {
			financeStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
			complianceStatus: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
			original: {
				name: string;
				size: number;
				type: string;
				lastModified: number;
			};
			path: string;
			downloadURL: string;
			token: string;
			contentType: string;
			size: number;
			name: string;
			lastModified: number;
		} | null;

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
		referralAmount?: number;
		relationshipManagerName?: string;
		relationshipManagerEmail?: string;
		createdByUid: string;
		createdByEmail: string;
		createdAt: FieldValue;
		updatedAt: FieldValue;
	};
	type APIResponse<T = object> = { success: false; error: string } | { success: true; data: T };
	namespace Superforms {
		type Message = { type: 'error' | 'success' | 'warning'; text: string };
	}
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				uid: string;
				email: string;
				role: 'admin' | 'agent' | 'compliance' | 'finance' | 'super-admin';
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
