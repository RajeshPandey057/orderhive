import { listEmployeesWithAccess } from '$lib/server/hr';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type CsvColumn = {
	header: string;
	value: (employee: Employee) => unknown;
};

function csvEscape(value: unknown): string {
	return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const columns: CsvColumn[] = [
	{ header: 'Employee ID', value: (employee) => employee.id },
	{ header: 'Employee Code', value: (employee) => employee.code },
	{ header: 'Full Name', value: (employee) => employee.name },
	{ header: 'Work Email', value: (employee) => employee.email },
	{ header: 'Department', value: (employee) => employee.department },
	{ header: 'Designation', value: (employee) => employee.designation },
	{ header: 'Location', value: (employee) => employee.location },
	{ header: 'Employee Status', value: (employee) => employee.status },
	{ header: 'Access Status', value: (employee) => employee.accessStatus },
	{ header: 'Access Type', value: (employee) => employee.accessType ?? '' },
	{ header: 'Reporting Manager Email', value: (employee) => employee.reportingManagerEmail ?? '' },
	{ header: 'Senior Manager Email', value: (employee) => employee.seniorManagerEmail ?? '' },
	{ header: 'Date of Joining', value: (employee) => employee.doj ?? '' },
	{ header: 'Probation Ending Date', value: (employee) => employee.probationEndingDate ?? '' },
	{ header: 'Last Working Day', value: (employee) => employee.lastWorkingDay ?? '' },
	{ header: 'Compensation AED', value: (employee) => employee.compensationAED ?? '' },
	{ header: 'Compensation INR', value: (employee) => employee.compensationINR ?? '' },
	{ header: 'Country Code', value: (employee) => employee.countryCode ?? '' },
	{ header: 'Mobile Number', value: (employee) => employee.mobileNumber ?? '' },
	{ header: 'Personal Email', value: (employee) => employee.personalEmail ?? '' },
	{ header: 'Marital Status', value: (employee) => employee.maritalStatus ?? '' },
	{ header: 'Spouse Name', value: (employee) => employee.spouseName ?? '' },
	{ header: 'Father Name', value: (employee) => employee.fatherName ?? '' },
	{ header: 'Mother Name', value: (employee) => employee.motherName ?? '' },
	{ header: 'Address UAE', value: (employee) => employee.addressUAE ?? '' },
	{ header: 'Home Country Address', value: (employee) => employee.homeCountryAddress ?? '' },
	{ header: 'Emergency Contact Name', value: (employee) => employee.emergencyContactName ?? '' },
	{
		header: 'Emergency Contact Number',
		value: (employee) => employee.emergencyContactNumber ?? ''
	},
	{ header: 'Emergency Relationship', value: (employee) => employee.emergencyRelationship ?? '' },
	{ header: 'Nationality', value: (employee) => employee.nationality ?? '' },
	{ header: 'Gender', value: (employee) => employee.gender ?? '' },
	{ header: 'Date of Birth', value: (employee) => employee.dateOfBirth ?? '' },
	{ header: 'Visa Type', value: (employee) => employee.visaType ?? '' },
	{ header: 'Visa Ending Date', value: (employee) => employee.visaEndingDate ?? '' },
	{ header: 'Fresher or Experienced', value: (employee) => employee.fresherOrExperienced ?? '' },
	{ header: 'Created At', value: (employee) => employee.createdAt ?? '' },
	{ header: 'Created By Email', value: (employee) => employee.createdByEmail ?? '' },
	{ header: 'Updated At', value: (employee) => employee.updatedAt ?? '' },
	{ header: 'Updated By Email', value: (employee) => employee.updatedByEmail ?? '' },
	{ header: 'Archived At', value: (employee) => employee.archivedAt ?? '' },
	{ header: 'Archived By Email', value: (employee) => employee.archivedByEmail ?? '' }
];

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !['admin', 'super-admin'].includes(locals.user.role)) {
		throw error(403, 'Unauthorized');
	}

	const employees = await listEmployeesWithAccess({ forceRefresh: true });
	const rows = [
		columns.map((column) => csvEscape(column.header)).join(','),
		...employees.map((employee) =>
			columns.map((column) => csvEscape(column.value(employee))).join(',')
		)
	];
	const csv = rows.join('\n');
	const today = new Date().toISOString().slice(0, 10);

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="employee-directory-${today}.csv"`
		}
	});
};
