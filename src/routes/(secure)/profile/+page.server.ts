import { getEmployeeByEmail } from '$lib/server/hr';

export async function load({ locals }) {
	const email = locals.user?.email ?? '';
	return {
		employee: email ? await getEmployeeByEmail(email) : null,
		userRole: locals.user?.role ?? null
	};
}
