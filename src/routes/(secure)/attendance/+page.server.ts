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
	const activeEmployees = employees.filter((employee) => employee.status === 'active');

	return {
		attendanceRecords: attendanceSnap.docs.map((doc) => serializeAttendanceLog(doc.id, doc.data())),
		employeeCount: activeEmployees.length,
		activeEmployees: activeEmployees.map((employee) => ({
			email: employee.email,
			name: employee.name,
			code: employee.code,
			location: employee.location
		}))
	};
}
