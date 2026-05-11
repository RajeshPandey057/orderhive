import { listEmployeesWithAccess } from '$lib/server/hr';

export async function load() {
	return {
		employees: await listEmployeesWithAccess()
	};
}
