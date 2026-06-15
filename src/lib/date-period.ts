export type DateFilterPeriod = 'today' | 'this-month' | 'custom';
export type AttendancePeriod = 'this-week' | 'last-week' | 'this-month';

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
