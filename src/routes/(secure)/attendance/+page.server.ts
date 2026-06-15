import {
	attendanceLogsCollection,
	listEmployeesWithAccess,
	serializeAttendanceLog
} from '$lib/server/hr';
import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	const role = locals.user?.role;
	if (role !== 'admin' && role !== 'super-admin' && role !== 'hr-assignee') {
		throw error(403, 'You do not have permission to view attendance records');
	}

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
