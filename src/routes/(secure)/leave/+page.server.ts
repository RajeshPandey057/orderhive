import {
	employeeIdForEmail,
	getEmployeeByEmail,
	leaveRequestsCollection,
	serializeLeaveRequest
} from '$lib/server/hr';

export async function load({ locals }) {
	const user = locals.user;
	const email = user?.email ?? '';
	const employee = email ? await getEmployeeByEmail(email) : null;
	const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

	const [mySnap, teamSnap] = await Promise.all([
		email
			? leaveRequestsCollection.where('employeeEmail', '==', email.toLowerCase()).get()
			: Promise.resolve(null),
		isAdmin ? leaveRequestsCollection.get() : Promise.resolve(null)
	]);

	const myRequests =
		mySnap?.docs
			.map((doc) => serializeLeaveRequest(doc.id, doc.data()))
			.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) ?? [];
	const teamRequests =
		teamSnap?.docs
			.map((doc) => serializeLeaveRequest(doc.id, doc.data()))
			.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) ?? [];

	const approvedDays = myRequests
		.filter((request) => request.status === 'approved')
		.reduce((sum, request) => sum + request.days, 0);
	const doj = employee?.doj ? new Date(`${employee.doj}T00:00:00`) : null;
	const now = new Date();
	const months =
		doj && !Number.isNaN(doj.getTime())
			? Math.max(
					0,
					(now.getFullYear() - doj.getFullYear()) * 12 + now.getMonth() - doj.getMonth() + 1
				)
			: 0;
	const onProbation = Boolean(
		employee?.probationEndingDate && new Date(`${employee.probationEndingDate}T00:00:00`) > now
	);
	const accrued = onProbation ? 0 : months;

	return {
		employee,
		myRequests,
		teamRequests,
		isAdmin,
		stats: {
			accrued,
			used: approvedDays,
			balance: Math.max(0, accrued - approvedDays),
			onProbation,
			employeeId: email ? employeeIdForEmail(email) : ''
		}
	};
}
