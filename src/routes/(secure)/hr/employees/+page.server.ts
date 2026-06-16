import { listEmployeesWithAccessPage, parseEmployeeDirectoryFilter } from '$lib/server/hr';
import { error } from '@sveltejs/kit';

export async function load({ locals, url }) {
	const role = locals.user?.role;
	if (role !== 'admin' && role !== 'super-admin' && role !== 'hr-assignee') {
		throw error(403, 'You do not have permission to view employee records');
	}

	const pageParam = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isFinite(pageParam) ? pageParam : 1;
	const employeePage = await listEmployeesWithAccessPage({
		page,
		filter: parseEmployeeDirectoryFilter(url.searchParams.get('filter'))
	});

	return {
		employees: employeePage.employees,
		pagination: {
			page: employeePage.page,
			pageSize: employeePage.pageSize,
			totalCount: employeePage.totalCount,
			totalPages: employeePage.totalPages,
			filter: employeePage.filter
		},
		user: locals.user
			? {
					role: locals.user.role
				}
			: null
	};
}
