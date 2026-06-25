export type LevelKey = 'company' | 'senior-manager' | 'manager' | 'agent' | 'developer';

export type DealRow = {
	id: string;
	saleDate?: string;
	clientName: string;
	developer: string;
	project: string;
	unitNo: string;
	unitValue: string;
	dealStage: string;
	paymentValue: number;
	invoiceStage: string[];
	invoiceFinanceStatus: string;
	revenueAchieved: number;
	passbackAmount: number;
	revenueAfterPassback: number;
	callerSeniorManagerEmail?: string;
	closerSeniorManagerEmail?: string;
	callerManagerEmail?: string;
	closerManagerEmail?: string;
	splits: {
		agentId: string;
		agentEmail?: string;
		agentName: string;
		seniorManagerEmail?: string;
		managerEmail?: string;
		percentage: number;
		ownerRole: string;
	}[];
	splitAgentIds: string[];
};

export function toDealRow(sale: Sale): DealRow {
	return {
		id: sale.id,
		saleDate: sale.saleDate,
		clientName:
			`${sale.clientDetails.firstName} ${sale.clientDetails.lastName}`.trim() || '-',
		developer: sale.developer || '-',
		project: sale.project || '-',
		unitNo: sale.unitNo || '-',
		unitValue: sale.unitValue || '0',
		dealStage: sale.dealStage,
		paymentValue: sale.paymentValue ?? 0,
		invoiceStage: sale.invoiceStage ?? [],
		invoiceFinanceStatus: sale.invoiceFile?.financeStatus ?? 'pending',
		revenueAchieved: sale.revenueAchieved ?? 0,
		passbackAmount: sale.passbackAmount ?? 0,
		revenueAfterPassback: sale.revenueAfterPassback ?? 0,
		callerSeniorManagerEmail: sale.callerSeniorManagerEmail,
		closerSeniorManagerEmail: sale.closerSeniorManagerEmail,
		callerManagerEmail: sale.callerManagerEmail,
		closerManagerEmail: sale.closerManagerEmail,
		splits: (sale.splits ?? []).map((s) => ({
			agentId: s.agentId,
			agentEmail: s.agentEmail,
			agentName: s.agentName,
			seniorManagerEmail: s.seniorManagerEmail,
			managerEmail: s.managerEmail,
			percentage: s.percentage,
			ownerRole: s.ownerRole
		})),
		splitAgentIds: sale.splitAgentIds ?? []
	};
}

export function filterDealsByLevel(deals: DealRow[], level: LevelKey, key: string): DealRow[] {
	if (level === 'company' || key === 'all') return deals;

	switch (level) {
		case 'senior-manager':
			return deals.filter(
				(d) =>
					d.callerSeniorManagerEmail === key ||
					d.closerSeniorManagerEmail === key ||
					d.splits.some((s) => s.seniorManagerEmail === key)
			);
		case 'manager':
			return deals.filter(
				(d) =>
					d.callerManagerEmail === key ||
					d.closerManagerEmail === key ||
					d.splits.some((s) => s.managerEmail === key)
			);
		case 'agent':
			return deals.filter(
				(d) =>
					d.splitAgentIds.includes(key) ||
					d.splits.some((s) => s.agentId === key || s.agentEmail === key)
			);
		case 'developer':
			return deals.filter((d) => d.developer === key);
		default:
			return deals;
	}
}

export type GroupStats = {
	totalCount: number;
	totalAmount: number;
	totalRevenue: number;
	totalPassback: number;
	totalProfitPostPassback: number;
	firstHalfCount: number;
	firstHalfAmount: number;
	secondHalfCount: number;
	secondHalfAmount: number;
	fullCount: number;
	fullAmount: number;
	invoiceRaisedPct: number;
	invoiceNotRaisedPct: number;
	paymentReceivedPct: number;
	paymentNotReceivedPct: number;
};

export type NamedStats = {
	key: string;
	displayName: string;
	stats: GroupStats;
};

export type TopPerformer = {
	key: string;
	displayName: string;
	dealCount: number;
	revenue: number;
};

export type DashboardData = {
	companyStats: GroupStats;
	bySeniorManager: NamedStats[];
	byManager: NamedStats[];
	byAgent: NamedStats[];
	byDeveloper: NamedStats[];
	topSeniorManagers: TopPerformer[];
	topAgents: TopPerformer[];
	availableSeniorManagers: { key: string; displayName: string }[];
	availableManagers: { key: string; displayName: string }[];
	availableAgents: { key: string; displayName: string }[];
	availableDevelopers: string[];
};

export function parseAmount(unitValue: string | undefined | null): number {
	if (!unitValue) return 0;
	const cleaned = unitValue.replace(/[^0-9.]/g, '');
	const num = parseFloat(cleaned);
	return isNaN(num) ? 0 : num;
}

export function formatAmount(amount: number): string {
	if (amount >= 1_000_000) {
		return `AED ${(amount / 1_000_000).toFixed(2)}M`;
	}
	if (amount >= 1_000) {
		return `AED ${(amount / 1_000).toFixed(1)}K`;
	}
	return `AED ${amount.toFixed(0)}`;
}

export function isInPeriod(
	saleDate: string | undefined | null,
	createdAt: unknown,
	start: string | null,
	end: string | null
): boolean {
	if (!start && !end) return true;

	let dateStr: string | null = null;

	if (saleDate && /^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
		dateStr = saleDate;
	} else if (
		createdAt &&
		typeof createdAt === 'object' &&
		'toDate' in (createdAt as object) &&
		typeof (createdAt as { toDate: unknown }).toDate === 'function'
	) {
		const d = (createdAt as { toDate(): Date }).toDate();
		dateStr = d.toISOString().slice(0, 10);
	}

	if (!dateStr) return false;
	if (start && dateStr < start) return false;
	if (end && dateStr > end) return false;
	return true;
}

export function calculateStats(deals: Sale[]): GroupStats {
	const total = deals.length;
	if (total === 0) {
		return {
			totalCount: 0,
			totalAmount: 0,
			totalRevenue: 0,
			totalPassback: 0,
			totalProfitPostPassback: 0,
			firstHalfCount: 0,
			firstHalfAmount: 0,
			secondHalfCount: 0,
			secondHalfAmount: 0,
			fullCount: 0,
			fullAmount: 0,
			invoiceRaisedPct: 0,
			invoiceNotRaisedPct: 0,
			paymentReceivedPct: 0,
			paymentNotReceivedPct: 0
		};
	}

	let totalAmount = 0;
	let totalRevenue = 0;
	let totalPassback = 0;
	let totalProfitPostPassback = 0;
	let firstHalfCount = 0;
	let firstHalfAmount = 0;
	let secondHalfCount = 0;
	let secondHalfAmount = 0;
	let fullCount = 0;
	let fullAmount = 0;
	let invoiceRaised = 0;
	let paymentReceived = 0;

	for (const deal of deals) {
		const amount = parseAmount(deal.unitValue);
		totalAmount += amount;
		totalRevenue += deal.revenueAchieved ?? 0;
		totalPassback += deal.passbackAmount ?? 0;
		totalProfitPostPassback += deal.revenueAfterPassback ?? 0;

		const stage = deal.invoiceStage ?? [];
		if (stage.includes('first-half')) {
			firstHalfCount++;
			firstHalfAmount += amount;
		}
		if (stage.includes('second-half')) {
			secondHalfCount++;
			secondHalfAmount += amount;
		}
		if (stage.includes('full')) {
			fullCount++;
			fullAmount += amount;
		}

		const fStatus = deal.invoiceFile?.financeStatus;
		if (fStatus === 'generated' || fStatus === 'raised' || fStatus === 'paid') {
			invoiceRaised++;
		}
		if (fStatus === 'paid') {
			paymentReceived++;
		}
	}

	const pct = (n: number) => Math.round((n / total) * 1000) / 10;

	return {
		totalCount: total,
		totalAmount,
		totalRevenue,
		totalPassback,
		totalProfitPostPassback,
		firstHalfCount,
		firstHalfAmount,
		secondHalfCount,
		secondHalfAmount,
		fullCount,
		fullAmount,
		invoiceRaisedPct: pct(invoiceRaised),
		invoiceNotRaisedPct: pct(total - invoiceRaised),
		paymentReceivedPct: pct(paymentReceived),
		paymentNotReceivedPct: pct(total - paymentReceived)
	};
}

export function groupBySeniorManager(deals: Sale[]): NamedStats[] {
	const map = new Map<string, Sale[]>();

	for (const deal of deals) {
		const emails = new Set<string>();
		if (deal.callerSeniorManagerEmail) emails.add(deal.callerSeniorManagerEmail);
		if (deal.closerSeniorManagerEmail) emails.add(deal.closerSeniorManagerEmail);
		for (const s of deal.splits ?? []) {
			if (s.seniorManagerEmail) emails.add(s.seniorManagerEmail);
		}
		for (const email of emails) {
			if (!map.has(email)) map.set(email, []);
			map.get(email)!.push(deal);
		}
	}

	return Array.from(map.entries())
		.map(([email, d]) => ({ key: email, displayName: email, stats: calculateStats(d) }))
		.sort((a, b) => b.stats.totalCount - a.stats.totalCount);
}

export function groupByManager(deals: Sale[]): NamedStats[] {
	const map = new Map<string, Sale[]>();

	for (const deal of deals) {
		const emails = new Set<string>();
		if (deal.callerManagerEmail) emails.add(deal.callerManagerEmail);
		if (deal.closerManagerEmail) emails.add(deal.closerManagerEmail);
		for (const s of deal.splits ?? []) {
			if (s.managerEmail) emails.add(s.managerEmail);
		}
		for (const email of emails) {
			if (!map.has(email)) map.set(email, []);
			map.get(email)!.push(deal);
		}
	}

	return Array.from(map.entries())
		.map(([email, d]) => ({ key: email, displayName: email, stats: calculateStats(d) }))
		.sort((a, b) => b.stats.totalCount - a.stats.totalCount);
}

export function groupByAgent(deals: Sale[]): NamedStats[] {
	const map = new Map<string, { name: string; deals: Sale[] }>();

	for (const deal of deals) {
		for (const split of deal.splits ?? []) {
			const key = split.agentId || split.agentEmail || '';
			if (!key) continue;
			if (!map.has(key)) {
				map.set(key, { name: split.agentName || split.agentEmail || key, deals: [] });
			}
			map.get(key)!.deals.push(deal);
		}
	}

	return Array.from(map.entries())
		.map(([key, { name, deals: d }]) => ({
			key,
			displayName: name,
			stats: calculateStats(d)
		}))
		.sort((a, b) => b.stats.totalCount - a.stats.totalCount);
}

export function groupByDeveloper(deals: Sale[]): NamedStats[] {
	const map = new Map<string, Sale[]>();

	for (const deal of deals) {
		const dev = deal.developer || 'Unknown';
		if (!map.has(dev)) map.set(dev, []);
		map.get(dev)!.push(deal);
	}

	return Array.from(map.entries())
		.map(([dev, d]) => ({ key: dev, displayName: dev, stats: calculateStats(d) }))
		.sort((a, b) => b.stats.totalCount - a.stats.totalCount);
}

export function buildDashboardData(confirmedDeals: Sale[]): DashboardData {
	const companyStats = calculateStats(confirmedDeals);
	const bySeniorManager = groupBySeniorManager(confirmedDeals);
	const byManager = groupByManager(confirmedDeals);
	const byAgent = groupByAgent(confirmedDeals);
	const byDeveloper = groupByDeveloper(confirmedDeals);

	const topSeniorManagers: TopPerformer[] = bySeniorManager.map((sm) => ({
		key: sm.key,
		displayName: sm.displayName,
		dealCount: sm.stats.totalCount,
		revenue: sm.stats.totalAmount
	}));

	const topAgents: TopPerformer[] = byAgent.map((a) => ({
		key: a.key,
		displayName: a.displayName,
		dealCount: a.stats.totalCount,
		revenue: a.stats.totalAmount
	}));

	return {
		companyStats,
		bySeniorManager,
		byManager,
		byAgent,
		byDeveloper,
		topSeniorManagers,
		topAgents,
		availableSeniorManagers: bySeniorManager.map((sm) => ({
			key: sm.key,
			displayName: sm.displayName
		})),
		availableManagers: byManager.map((m) => ({ key: m.key, displayName: m.displayName })),
		availableAgents: byAgent.map((a) => ({ key: a.key, displayName: a.displayName })),
		availableDevelopers: byDeveloper.map((d) => d.key)
	};
}
