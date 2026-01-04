import type { DecodedIdToken } from 'firebase-admin/auth';
import 'unplugin-icons/types/svelte';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	type Sale = {
		status: 'pending' | 'approved' | 'rejected';
		commissionStatus: 'pending' | 'approved' | 'not-eligible' | 'rejected';
		invoiceFile: {
			status: 'pending' | 'generated' | 'raised' | 'paid' | 'rejected';
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
		primaryBuyer: {
			firstName: string;
			lastName: string;
			email: string;
			phone: string;
			passportFile: {
				status: 'pending' | 'verified' | 'rejected';
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
				status: 'pending' | 'verified' | 'rejected';
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
		jointBuyers: {
			firstName: string;
			lastName: string;
			email: string;
			phone: string;
			passportFile: {
				status: 'pending' | 'verified' | 'rejected';
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
				status: 'pending' | 'verified' | 'rejected';
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
			split: number;
		}[];
		dealStage: 'eoi' | 'booking';
		paymentValue: number;
		bookingFormFile: {
			status: 'pending' | 'verified' | 'rejected';
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
			status: 'pending' | 'verified' | 'rejected';
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
		dealType: 'off-plan' | 'on-plan' | 'resell';
		developer: string;
		property: string;
		unitNo: string;
		unitValue: string;
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
			fbUser: DecodedIdToken | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
