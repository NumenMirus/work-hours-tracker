import { APP_TIME_ZONE } from '$app/env/private';
import { getDb } from '#lib/server/db.js';
import { listPeriodEntries } from '#lib/server/repo.js';
import { buildCsv, parsePeriod } from '#lib/report.js';
import { todayIn } from '#lib/day.js';
import type { RequestHandler } from './$types';

/** Scarica le registrazioni del periodo (stessi parametri della pagina) come CSV per fogli di calcolo. */
export const GET: RequestHandler = ({ url }) => {
	const { period } = parsePeriod(url.searchParams, todayIn(APP_TIME_ZONE));
	const csv = buildCsv(listPeriodEntries(getDb(), period));
	const scope = period.clientId === null ? '' : `-cliente-${period.clientId}`;

	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="consuntivo-${period.from}_${period.to}${scope}.csv"`,
			'cache-control': 'no-store'
		}
	});
};
