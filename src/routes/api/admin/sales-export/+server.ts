import { firestore } from '$lib/server/firebase';
import { isActiveSale } from '$lib/sales';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type CsvColumn = {
	header: string;
	value: (sale: Sale) => unknown;
};

function csvEscape(value: unknown): string {
	return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function timestampToString(value: unknown): string {
	if (!value) return '';

	if (typeof value === 'string') return value;

	if (value instanceof Date) return value.toISOString();

	if (
		typeof value === 'object' &&
		value !== null &&
		'toDate' in value &&
		typeof value.toDate === 'function'
	) {
		return value.toDate().toISOString();
	}

	return String(value);
}

function getCommissionStatus(sale: Sale): string {
	const record = sale as Sale & { commissionStatus?: string };
	return record.commissionStatus ?? '';
}

function formatOwnerRole(role: string): string {
	return role.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDealOwners(sale: Sale): string {
	return (sale.dealOwners ?? [])
		.map((owner) => `${formatOwnerRole(owner.ownerRole)}: ${owner.email}`)
		.join(', ');
}

function formatSplits(sale: Sale): string {
	return (sale.splits ?? [])
		.map((split) => `${formatOwnerRole(split.ownerRole)}: ${split.percentage}%`)
		.join(', ');
}

function sanitizeJointBuyers(sale: Sale) {
	return (sale.jointBuyers ?? []).map((buyer) => ({
		firstName: buyer.firstName,
		lastName: buyer.lastName,
		email: buyer.email,
		phone: buyer.phone
	}));
}

const columns: CsvColumn[] = [
	{ header: 'Sale ID', value: (sale) => sale.id },
	{ header: 'Sale Date', value: (sale) => sale.saleDate ?? '' },
	{ header: 'Created At', value: (sale) => timestampToString(sale.createdAt) },
	{ header: 'Updated At', value: (sale) => timestampToString(sale.updatedAt) },
	{ header: 'Created By Email', value: (sale) => sale.createdByEmail },
	{ header: 'Status', value: (sale) => sale.status },
	{ header: 'Finance Status', value: (sale) => sale.financeStatus },
	{ header: 'Compliance Status', value: (sale) => sale.complianceStatus },
	{ header: 'Commission Status', value: getCommissionStatus },
	{ header: 'Deal Stage', value: (sale) => sale.dealStage },
	{ header: 'Payment Value %', value: (sale) => sale.paymentValue },
	{ header: 'Invoice Stages', value: (sale) => (sale.invoiceStage ?? []).join(', ') },
	{ header: 'Tentative Eligibility Date', value: (sale) => sale.tentativeEligibilityDate ?? '' },
	{ header: 'Sale Type', value: (sale) => sale.saleType },
	{ header: 'Developer', value: (sale) => sale.developer },
	{ header: 'Project', value: (sale) => sale.project },
	{ header: 'Community', value: (sale) => sale.community ?? '' },
	{ header: 'Property Type', value: (sale) => sale.propertyType },
	{ header: 'Bedroom Type', value: (sale) => sale.bedroomType ?? '' },
	{ header: 'Commercial Sub Type', value: (sale) => sale.commercialSubType ?? '' },
	{ header: 'Property Size', value: (sale) => sale.propertySize ?? '' },
	{ header: 'Plot Area', value: (sale) => sale.plotArea ?? '' },
	{ header: 'Built Up Area', value: (sale) => sale.builtUpArea ?? '' },
	{ header: 'Gross Floor Area', value: (sale) => sale.grossFloorArea ?? '' },
	{ header: 'Unit No', value: (sale) => sale.unitNo },
	{ header: 'Unit Value', value: (sale) => sale.unitValue },
	{ header: 'Commission %', value: (sale) => sale.commissionPercentage ?? '' },
	{ header: 'Revenue Achieved', value: (sale) => sale.revenueAchieved ?? '' },
	{ header: 'Passback Amount', value: (sale) => sale.passbackAmount ?? '' },
	{ header: 'Revenue After Passback', value: (sale) => sale.revenueAfterPassback ?? '' },
	{ header: 'Primary Buyer First Name', value: (sale) => sale.clientDetails.firstName },
	{ header: 'Primary Buyer Last Name', value: (sale) => sale.clientDetails.lastName },
	{ header: 'Primary Buyer Email', value: (sale) => sale.clientDetails.email },
	{ header: 'Primary Buyer Phone', value: (sale) => sale.clientDetails.phone },
	{ header: 'Nationality', value: (sale) => sale.nationality ?? '' },
	{ header: 'Resident Status', value: (sale) => sale.residentStatus ?? '' },
	{ header: 'Caller Manager Email', value: (sale) => sale.callerManagerEmail ?? '' },
	{ header: 'Closer Manager Email', value: (sale) => sale.closerManagerEmail ?? '' },
	{ header: 'Caller Senior Manager Email', value: (sale) => sale.callerSeniorManagerEmail ?? '' },
	{ header: 'Closer Senior Manager Email', value: (sale) => sale.closerSeniorManagerEmail ?? '' },
	{ header: 'Deal Owners JSON', value: formatDealOwners },
	{ header: 'Splits JSON', value: formatSplits },
	{ header: 'Joint Buyers JSON', value: (sale) => JSON.stringify(sanitizeJointBuyers(sale)) }
];

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user || !['admin', 'super-admin'].includes(locals.user.role)) {
		throw error(403, 'Unauthorized');
	}

	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	if (!start || !end) throw error(400, 'start and end date params required');
	if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
		throw error(400, 'Invalid date format. Use YYYY-MM-DD.');
	}
	if (start > end) throw error(400, 'start must be on or before end');

	const snap = await firestore.collection('sales').get();
	const sales = snap.docs
		.map((doc) => ({ id: doc.id, ...doc.data() }) as Sale)
		.filter((sale) => isActiveSale(sale))
		.filter((sale) => {
			const saleDate = sale.saleDate?.slice(0, 10);
			return !!saleDate && saleDate >= start && saleDate <= end;
		})
		.sort((a, b) => {
			const dateCompare = (a.saleDate ?? '').localeCompare(b.saleDate ?? '');
			if (dateCompare !== 0) return dateCompare;
			return a.id.localeCompare(b.id);
		});

	const rows = [
		columns.map((column) => csvEscape(column.header)).join(','),
		...sales.map((sale) => columns.map((column) => csvEscape(column.value(sale))).join(','))
	];

	const csv = rows.join('\n');

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="sales-listing-${start}-to-${end}.csv"`
		}
	});
};
