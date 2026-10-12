import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.js';
import { deleteSession } from '#lib/server/repo.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: ({ cookies }) => {
		deleteSession(getDb(), cookies.get('rh_session'));
		cookies.delete('rh_session');
		redirect(303, '/login');
	}
};
