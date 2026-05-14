/**
 * Nightly cron endpoint — re-reconcile biometric punches and mark absences.
 *
 * Trigger with:
 *   POST /api/zkteco/reconcile
 *   Authorization: Bearer <ZKTECO_CRON_SECRET>
 *   Content-Type: application/json
 *   Body: { "date": "YYYY-MM-DD" }   (omit date to default to yesterday)
 *
 * What it does:
 *  1. Finds all distinct employees who have biometric punches for the given date.
 *  2. Calls reconcileAttendanceForDay() for each — updates attendanceLogs.
 *  3. Marks every remaining active employee who has no log for that date as absent
 *     (unless they have an approved leave request or a holiday falls on that date).
 *
 * Env vars:
 *   ZKTECO_CRON_SECRET — shared secret; must be set in production
 */

import { biometricPunchesCollection, reconcileAttendanceForDay } from '$lib/server/biometric';
import {
	attendanceLogId,
	attendanceLogsCollection,
	employeeCollection,
	holidaysCollection,
	leaveRequestsCollection
} from '$lib/server/hr';
import { json } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

const CRON_SECRET = process.env.ZKTECO_CRON_SECRET ?? '';

function isAuthorized(request: Request): boolean {
	if (!CRON_SECRET) return false; // always reject if secret not configured
	const auth = request.headers.get('authorization') ?? '';
	return auth === `Bearer ${CRON_SECRET}`;
}

/** Returns YYYY-MM-DD for yesterday in the server's local time. */
function yesterday(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return d.toISOString().slice(0, 10);
}

export const POST: RequestHandler = async ({ request }) => {
	if (!isAuthorized(request)) {
		return new Response('Unauthorized', { status: 401 });
	}

	let date: string;
	try {
		const body = await request.json().catch(() => ({}));
		date =
			typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
				? body.date
				: yesterday();
	} catch {
		date = yesterday();
	}

	// ── Step 1: Reconcile all employees who have punches for this date ──────────
	const punchesSnap = await biometricPunchesCollection.where('date', '==', date).get();

	const emailsWithPunches = new Set<string>();
	for (const doc of punchesSnap.docs) {
		const email = doc.data().employeeEmail as string;
		if (email) emailsWithPunches.add(email);
	}

	const reconciled: string[] = [];
	for (const email of emailsWithPunches) {
		try {
			await reconcileAttendanceForDay(email, date);
			reconciled.push(email);
		} catch (err) {
			console.error('[ZKTeco cron] reconcile failed for', email, err);
		}
	}

	// ── Step 2: Mark remaining active employees absent ───────────────────────────
	const [employeesSnap, holidaysSnap, leaveSnap] = await Promise.all([
		employeeCollection.where('status', '==', 'active').get(),
		holidaysCollection.where('date', '==', date).limit(1).get(),
		leaveRequestsCollection.where('date', '==', date).where('status', '==', 'approved').get()
	]);

	const isHoliday = !holidaysSnap.empty;
	const onLeaveEmails = new Set(leaveSnap.docs.map((d) => d.data().employeeEmail as string));

	const absent: string[] = [];
	for (const empDoc of employeesSnap.docs) {
		const email = empDoc.data().email as string;
		if (!email) continue;
		if (emailsWithPunches.has(email)) continue; // already reconciled above

		const logRef = attendanceLogsCollection.doc(attendanceLogId(email, date));
		const existing = await logRef.get();
		if (existing.exists) continue; // already has a log (manual entry)

		let status: string;
		if (isHoliday) {
			status = 'holiday';
		} else if (onLeaveEmails.has(email)) {
			status = 'on-leave';
		} else {
			status = 'absent';
		}

		await logRef.set({
			employeeEmail: email,
			employeeName: empDoc.data().name ?? email,
			employeeCode: empDoc.data().code ?? '',
			date,
			branch: empDoc.data().location ?? '',
			punchIn: null,
			punchOut: null,
			workingMinutes: 0,
			overtimeMinutes: 0,
			shortByMinutes: 480,
			status,
			source: 'biometric',
			updatedAt: FieldValue.serverTimestamp()
		});
		absent.push(email);
	}

	return json({
		date,
		reconciled: reconciled.length,
		absent: absent.length,
		onLeave: absent.filter((e) => onLeaveEmails.has(e)).length,
		holiday: isHoliday
	});
};
