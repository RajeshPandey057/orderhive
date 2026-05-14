/**
 * ZKTeco SA40 Biometric Integration
 *
 * Handles the iClock/ADMS HTTP push protocol.
 * The SA40 device is configured to POST attendance punches to /api/zkteco/iclock/cdata
 * This module receives raw punches, stores them immutably, and reconciles into attendanceLogs.
 *
 * Firestore collections:
 *   biometricPunches — raw immutable punch log from the device
 *   attendanceLogs   — the existing collection; updated with source='biometric'
 *
 * NOTE: biometricPunches requires the following Firestore composite indexes:
 *   (employeeEmail ASC, date ASC, timeStr ASC)
 *   (date ASC)
 */

import { firestore } from '$lib/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import {
	attendanceLogId,
	attendanceLogsCollection,
	getEmployeeByCode,
	getEmployeeByEmail
} from './hr';

export const biometricPunchesCollection = firestore.collection('biometricPunches');

/** Serialize a raw Firestore biometricPunches document to a plain BiometricPunch object. */
export function serializePunch(id: string, data: FirebaseFirestore.DocumentData): BiometricPunch {
	return {
		id,
		deviceSn: data.deviceSn ?? '',
		deviceUserId: data.deviceUserId ?? '',
		employeeEmail: data.employeeEmail ?? null,
		employeeName: data.employeeName ?? null,
		date: data.date ?? '',
		timeStr: data.timeStr ?? '',
		timestamp: data.timestamp ?? '',
		inOutMode: typeof data.inOutMode === 'number' ? data.inOutMode : 0,
		verifyType: typeof data.verifyType === 'number' ? data.verifyType : 0,
		processed: data.processed === true,
		branch: data.branch ?? undefined
	};
}

/** Standard workday target in minutes (8 hours). */
const STANDARD_WORKDAY_MINUTES = 480;

/** Parse the configured late-threshold from env var (default 09:00, format HH:MM). */
function getLateThresholdMinutes(): number {
	const raw = process.env.LATE_THRESHOLD_TIME ?? '09:00';
	const [h, m] = raw.split(':').map(Number);
	return (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
}

export interface RawPunch {
	deviceSn: string;
	deviceUserId: string;
	timestamp: string; // "YYYY-MM-DD HH:mm:ss" as received from device
	inOutMode: number; // 0=check-in, 1=check-out, 2=break-out, 3=break-in, 4=OT-in, 5=OT-out
	verifyType: number; // 1=fingerprint, 2=password, 3=card, 15=face
	rawLine?: string; // original line kept for debugging
}

/**
 * Parse the raw iClock ATTLOG POST body into RawPunch records (minus deviceSn).
 * Format: one tab-separated record per line.
 *   userID \t YYYY-MM-DD HH:mm:ss \t inOutMode \t verifyType \t ...
 */
export function parseIClockBody(body: string): Omit<RawPunch, 'deviceSn'>[] {
	const lines = body
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
	console.log(`[ZKTeco] parseIClockBody: ${lines.length} line(s) received`);

	const results = lines.flatMap((line) => {
		const parts = line.split('\t');
		if (parts.length < 4) {
			console.warn(
				`[ZKTeco] parseIClockBody: skipping line (< 4 tab-fields): ${JSON.stringify(line)}`
			);
			return [];
		}
		const userId = parts[0]?.trim();
		const timestamp = parts[1]?.trim();
		// Basic timestamp validation: YYYY-MM-DD HH:MM:SS
		if (!userId || !timestamp || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
			console.warn(
				`[ZKTeco] parseIClockBody: skipping line (bad userId/timestamp): userId=${JSON.stringify(userId)} timestamp=${JSON.stringify(timestamp)}`
			);
			return [];
		}
		return [
			{
				deviceUserId: userId,
				timestamp,
				inOutMode: parseInt(parts[2] ?? '0') || 0,
				verifyType: parseInt(parts[3] ?? '0') || 0,
				rawLine: line
			}
		];
	});

	console.log(`[ZKTeco] parseIClockBody: parsed ${results.length} valid punch(es)`);
	return results;
}

/**
 * Persist a raw biometric punch and reconcile the attendance log for that employee+day.
 *
 * - Uses a deterministic document ID to deduplicate repeated pushes of the same event.
 * - If no employee has been enrolled with this biometricId, the punch is stored with
 *   employeeEmail=null so it can be resolved later if the mapping is added.
 * - Returns the resolved employee email, or null if unknown.
 */
export async function processPunch(punch: RawPunch): Promise<string | null> {
	const date = punch.timestamp.substring(0, 10); // YYYY-MM-DD
	const timeStr = punch.timestamp.substring(11, 16); // HH:MM

	console.log(
		`[ZKTeco] processPunch: deviceSn=${punch.deviceSn} userId=${punch.deviceUserId} timestamp=${punch.timestamp}`
	);

	// Resolve employee by matching deviceUserId to employee code (e.g. "INDGO194")
	let employeeEmail: string | null = null;
	let employeeName: string | null = null;
	const emp = await getEmployeeByCode(punch.deviceUserId);
	if (emp) {
		employeeEmail = emp.email;
		employeeName = emp.name;
		console.log(
			`[ZKTeco] processPunch: resolved employee email=${employeeEmail} name=${employeeName}`
		);
	} else {
		console.warn(
			`[ZKTeco] processPunch: NO employee with code=${punch.deviceUserId} — punch stored unresolved`
		);
	}

	// Deduplicate using a deterministic ID: SN + userId + compact timestamp
	const punchId = `${punch.deviceSn}_${punch.deviceUserId}_${punch.timestamp.replace(/[:\s-]/g, '')}`;
	console.log(`[ZKTeco] processPunch: writing Firestore doc id=${punchId}`);

	try {
		await biometricPunchesCollection.doc(punchId).set({
			deviceSn: punch.deviceSn,
			deviceUserId: punch.deviceUserId,
			employeeEmail,
			employeeName,
			timestamp: punch.timestamp,
			date,
			timeStr,
			inOutMode: punch.inOutMode,
			verifyType: punch.verifyType,
			rawLine: punch.rawLine ?? null,
			receivedAt: FieldValue.serverTimestamp()
		});
		console.log(`[ZKTeco] processPunch: Firestore write OK for ${punchId}`);
	} catch (err) {
		console.error(`[ZKTeco] processPunch: Firestore write FAILED for ${punchId}`, err);
		throw err;
	}

	if (employeeEmail) {
		console.log(
			`[ZKTeco] processPunch: running reconcileAttendanceForDay for ${employeeEmail} on ${date}`
		);
		try {
			await reconcileAttendanceForDay(employeeEmail, date);
			console.log(`[ZKTeco] processPunch: reconcile OK for ${employeeEmail} on ${date}`);
			await biometricPunchesCollection.doc(punchId).update({ processed: true });
		} catch (err) {
			console.error(`[ZKTeco] processPunch: reconcile FAILED for ${employeeEmail} on ${date}`, err);
			throw err;
		}
	} else {
		console.warn(
			`[ZKTeco] processPunch: skipping reconcile — no employee resolved for userId=${punch.deviceUserId}`
		);
	}

	return employeeEmail;
}

/**
 * Re-compute the attendance log entry for a given employee + date using all stored
 * biometric punches for that day.
 *
 * Rules:
 *   - First punch of day  → punchIn (check-in time)
 *   - Last punch of day   → punchOut (check-out time)
 *   - workingMinutes      = punchOut – punchIn (capped at 0 if negative)
 *   - overtimeMinutes     = max(0, workingMinutes – 480)
 *   - shortByMinutes      = max(0, 480 – workingMinutes)  (only when no punchOut: shortBy = 480)
 *   - status              = 'present' if punchIn ≤ LATE_THRESHOLD_TIME, else 'late'
 *
 * Manually corrected records (corrected=true) are never overwritten.
 */
export async function reconcileAttendanceForDay(
	employeeEmail: string,
	date: string
): Promise<void> {
	const logRef = attendanceLogsCollection.doc(attendanceLogId(employeeEmail, date));

	// Never overwrite a manually corrected record
	const existing = await logRef.get();
	if (existing.exists && existing.data()?.corrected) return;

	// Fetch all punches for this employee+date, sorted by time ascending
	const punchesSnap = await biometricPunchesCollection
		.where('employeeEmail', '==', employeeEmail)
		.where('date', '==', date)
		.orderBy('timeStr', 'asc')
		.get();

	if (punchesSnap.empty) return;

	const punches = punchesSnap.docs.map((doc) => doc.data() as { timeStr: string });
	const punchIn = punches[0].timeStr; // HH:MM
	const punchOut = punches.length > 1 ? punches.at(-1)!.timeStr : undefined;

	// Calculate working time
	let workingMinutes = 0;
	let overtimeMinutes = 0;
	let shortByMinutes = STANDARD_WORKDAY_MINUTES;

	if (punchIn && punchOut) {
		const [inH, inM] = punchIn.split(':').map(Number);
		const [outH, outM] = punchOut.split(':').map(Number);
		workingMinutes = Math.max(0, outH * 60 + outM - (inH * 60 + inM));
		if (workingMinutes >= STANDARD_WORKDAY_MINUTES) {
			overtimeMinutes = workingMinutes - STANDARD_WORKDAY_MINUTES;
			shortByMinutes = 0;
		} else {
			shortByMinutes = STANDARD_WORKDAY_MINUTES - workingMinutes;
		}
	}

	// Determine on-time vs late
	const [inH, inM] = punchIn.split(':').map(Number);
	const punchInMinutes = inH * 60 + inM;
	const status: AttendanceStatus = punchInMinutes <= getLateThresholdMinutes() ? 'present' : 'late';

	const emp = await getEmployeeByEmail(employeeEmail);

	await logRef.set(
		{
			employeeEmail,
			employeeName: emp?.name ?? employeeEmail,
			employeeCode: emp?.code ?? '',
			date,
			branch: emp?.location ?? '',
			punchIn,
			punchOut: punchOut ?? null,
			workingMinutes,
			overtimeMinutes,
			shortByMinutes,
			status,
			source: 'biometric',
			updatedAt: FieldValue.serverTimestamp()
		},
		{ merge: true }
	);
}
