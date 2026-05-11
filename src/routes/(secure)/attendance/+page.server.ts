import {
	attendanceLogsCollection,
	listEmployeesWithAccess,
	serializeAttendanceLog
} from '$lib/server/hr';

export async function load() {
	const [attendanceSnap, employees] = await Promise.all([
		attendanceLogsCollection.orderBy('date', 'desc').limit(500).get(),
		listEmployeesWithAccess()
	]);

	return {
		attendanceRecords: attendanceSnap.docs.map((doc) => serializeAttendanceLog(doc.id, doc.data())),
		employeeCount: employees.filter((employee) => employee.status === 'active').length
	};
}
