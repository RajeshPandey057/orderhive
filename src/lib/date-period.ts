export type DateFilterPeriod = 'today' | 'this-month' | 'custom';
export type AttendancePeriod = 'this-week' | 'last-week' | 'this-month';

export type FinancePeriodType = 'all-time' | 'year' | 'custom';

export type FinancePeriodParams = {
	period: FinancePeriodType;
	year?: number;
	from?: string;
	to?: string;
};

export function getFinancePeriodRange(
	params: FinancePeriodParams,
	referenceDate: Date
): { start: string | null; end: string | null } {
	const { period, year, from, to } = params;

	if (period === 'all-time') return { start: null, end: null };

	if (period === 'year' && year) {
		const start = `${year}-01-01`;
		const end = `${year}-12-31`;
		return { start, end };
	}

	if (period === 'custom') {
		if (!from && !to) return { start: null, end: null };
		const s = from || formatDateInput(referenceDate);
		const e = to || s;
		return s <= e ? { start: s, end: e } : { start: e, end: s };
	}

	return { start: null, end: null };
}

export function parseFinancePeriodParams(searchParams: URLSearchParams): FinancePeriodParams {
	const period = (searchParams.get('period') as FinancePeriodType) || 'all-time';
	const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
	const from = searchParams.get('from') || undefined;
	const to = searchParams.get('to') || undefined;
	return { period, year, from, to };
}

export function getAvailableYears(fromYear = 2022): number[] {
	const current = new Date().getFullYear();
	const years: number[] = [];
	for (let y = current; y >= fromYear; y--) years.push(y);
	return years;
}

export function formatDateInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string): Date {
	const [year, month, day] = value.split('-').map(Number);
	if (!year || !month || !day) return new Date();
	return new Date(year, month - 1, day);
}

export function getPeriodRange(
	period: DateFilterPeriod,
	referenceDate: Date,
	customFrom?: string,
	customTo?: string
): { start: string; end: string } {
	if (period === 'today') {
		const day = formatDateInput(referenceDate);
		return { start: day, end: day };
	}

	if (period === 'this-month') {
		const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
		const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
		return { start: formatDateInput(start), end: formatDateInput(end) };
	}

	const from = customFrom || formatDateInput(referenceDate);
	const to = customTo || from;
	return from <= to ? { start: from, end: to } : { start: to, end: from };
}

export function isDateWithinThisMonth(value: Date, now = new Date()): boolean {
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
	return value >= monthStart && value <= monthEnd;
}

export function getAttendancePeriodRange(
	period: AttendancePeriod,
	referenceDate: Date
): { start: string; end: string } {
	if (period === 'this-month') {
		return getPeriodRange('this-month', referenceDate);
	}

	const dayIndex = referenceDate.getDay();
	const startOfCurrentWeek = new Date(referenceDate);
	startOfCurrentWeek.setDate(referenceDate.getDate() - dayIndex);
	startOfCurrentWeek.setHours(0, 0, 0, 0);

	if (period === 'this-week') {
		const endOfCurrentWeek = new Date(startOfCurrentWeek);
		endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
		return {
			start: formatDateInput(startOfCurrentWeek),
			end: formatDateInput(endOfCurrentWeek)
		};
	}

	const startOfLastWeek = new Date(startOfCurrentWeek);
	startOfLastWeek.setDate(startOfCurrentWeek.getDate() - 7);
	const endOfLastWeek = new Date(startOfCurrentWeek);
	endOfLastWeek.setDate(startOfCurrentWeek.getDate() - 1);

	return {
		start: formatDateInput(startOfLastWeek),
		end: formatDateInput(endOfLastWeek)
	};
}
