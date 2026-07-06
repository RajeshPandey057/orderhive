type SaleHierarchyEntry = {
	managerEmail?: string | null;
	seniorManagerEmail?: string | null;
};

export type SaleHierarchyEmails = {
	managerEmails: string[];
	seniorManagerEmails: string[];
};

export function normalizeHierarchyEmail(value: unknown): string {
	return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function getSaleHierarchyEmails(entries: SaleHierarchyEntry[]): SaleHierarchyEmails {
	const managerEmails = new Set<string>();
	const seniorManagerEmails = new Set<string>();

	for (const entry of entries) {
		const managerEmail = normalizeHierarchyEmail(entry.managerEmail);
		const seniorManagerEmail = normalizeHierarchyEmail(entry.seniorManagerEmail);

		if (managerEmail) managerEmails.add(managerEmail);
		if (seniorManagerEmail) seniorManagerEmails.add(seniorManagerEmail);
	}

	return {
		managerEmails: [...managerEmails],
		seniorManagerEmails: [...seniorManagerEmails]
	};
}

export function saleMatchesHierarchyEmail(
	sale: Pick<Sale, 'managerEmails' | 'seniorManagerEmails' | 'splits' | 'dealOwners'>,
	type: 'manager' | 'senior-manager',
	email: string | null | undefined
): boolean {
	const normalizedEmail = normalizeHierarchyEmail(email);
	if (!normalizedEmail) return false;

	const denormalizedEmails =
		type === 'manager' ? (sale.managerEmails ?? []) : (sale.seniorManagerEmails ?? []);
	if (denormalizedEmails.some((value) => normalizeHierarchyEmail(value) === normalizedEmail)) {
		return true;
	}

	const hierarchyKey = type === 'manager' ? 'managerEmail' : 'seniorManagerEmail';
	const entries = [...(sale.splits ?? []), ...(sale.dealOwners ?? [])];
	return entries.some(
		(entry) => normalizeHierarchyEmail(entry[hierarchyKey]) === normalizedEmail
	);
}
