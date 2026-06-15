import { listEmployeesWithAccess } from '$lib/server/hr';
import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	const role = locals.user?.role;
	if (role !== 'admin' && role !== 'super-admin' && role !== 'hr-assignee') {
		throw error(403, 'You do not have permission to view employee records');
	}

	return {
		employees: await listEmployeesWithAccess()
	};
}
