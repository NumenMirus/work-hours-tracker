import { APP_TIME_ZONE } from '$app/env/private';
import { getDb } from '#lib/server/db.js';
import { getTimer } from '#lib/server/repo.js';
import { todayIn } from '#lib/day.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.authenticated) {
		return { authenticated: false, timer: null, today: null };
	}
	const db = getDb();
	return {
		authenticated: true,
		timer: getTimer(db),
		today: todayIn(APP_TIME_ZONE)
	};
};
