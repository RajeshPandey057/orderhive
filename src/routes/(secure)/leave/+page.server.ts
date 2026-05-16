import {
	calculateLeaveStats,
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

	const stats = calculateLeaveStats(employee, myRequests);

	return {
		employee,
		myRequests,
		teamRequests,
		isAdmin,
		stats: {
			...stats,
			employeeId: email ? employeeIdForEmail(email) : ''
		}
	};
}
