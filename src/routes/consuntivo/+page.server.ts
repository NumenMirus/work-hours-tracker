import { APP_TIME_ZONE } from '$app/env/private';
import { getDb } from '#lib/server/db.js';
import { listClients, listPeriodEntries } from '#lib/server/repo.js';
import { currentMonth, parsePeriod, previousMonth, summarizeReport } from '#lib/report.js';
import { todayIn } from '#lib/day.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const db = getDb();
	const today = todayIn(APP_TIME_ZONE);
	const { period, error } = parsePeriod(url.searchParams, today);

	return {
		period,
		error,
		today,
		thisMonth: currentMonth(today),
		lastMonth: previousMonth(today),
		clients: listClients(db, { includeArchived: true }),
		summary: summarizeReport(listPeriodEntries(db, period))
	};
};
