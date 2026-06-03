import { attendanceLogsCollection, serializeAttendanceLog } from '$lib/server/hr';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function minutesToDuration(minutes?: number) {
	const safe = Math.max(0, Number(minutes ?? 0));
	const h = Math.floor(safe / 60);
	const m = safe % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function csvEscape(value: unknown): string {
	return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	if (!start || !end) throw error(400, 'start and end date params required');

	// Validate YYYY-MM-DD format
	if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
		throw error(400, 'Invalid date format. Use YYYY-MM-DD.');
	}

	if (start > end) throw error(400, 'start must be on or before end');

	const snap = await attendanceLogsCollection
		.where('date', '>=', start)
		.where('date', '<=', end)
		.orderBy('date', 'asc')
		.get();

	const records = snap.docs.map((doc) => serializeAttendanceLog(doc.id, doc.data()));

	const headers = [
		'Employee',
		'Email',
		'Date',
		'Branch',
		'Punch In',
		'Punch Out',
		'Working Hours',
		'Status',
		'Source',
		'Corrected'
	];

	const rows = [
		headers.map(csvEscape).join(','),
		...records.map((r) =>
			[
				r.employeeName || '',
				r.employeeEmail,
				r.date,
				r.branch || '',
				r.punchIn || '',
				r.punchOut || '',
				minutesToDuration(r.workingMinutes),
				r.status,
				r.source || '',
				r.corrected ? 'Yes' : 'No'
			]
				.map(csvEscape)
				.join(',')
		)
	];

	const csv = rows.join('\n');

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="attendance-${start}-to-${end}.csv"`
		}
	});
};
