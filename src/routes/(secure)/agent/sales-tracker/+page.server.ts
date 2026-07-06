import { resolveTeamAgentIds } from '$lib/server/rbac';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Not authenticated');

	if (user.role !== 'manager' && user.role !== 'senior-manager') {
		return {};
	}

	const visibleAgentIds = await resolveTeamAgentIds(user);
	return { visibleAgentIds };
};
