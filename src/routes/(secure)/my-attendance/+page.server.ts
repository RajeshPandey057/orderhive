import {
	attendanceLogsCollection,
	holidaysCollection,
	serializeAttendanceLog
} from '$lib/server/hr';

export async function load({ locals }) {
	const email = locals.user?.email?.toLowerCase() ?? '';
	const [attendanceSnap, holidaySnap] = await Promise.all([
		email
			? attendanceLogsCollection.where('employeeEmail', '==', email).get()
			: Promise.resolve(null),
		holidaysCollection.where('year', '==', new Date().getFullYear()).get()
	]);

	const rows =
		attendanceSnap?.docs
			.map((doc) => serializeAttendanceLog(doc.id, doc.data()))
			.sort((a, b) => b.date.localeCompare(a.date)) ?? [];

	return {
		rows,
		holidayCount: holidaySnap.docs.length
	};
}
