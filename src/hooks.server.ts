import type { Handle } from '@sveltejs/kit/hooks';
import { getDb } from '#lib/server/db.js';
import { validateSession } from '#lib/server/repo.js';

const SESSION_COOKIE = 'rh_session';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.authenticated = validateSession(getDb(), token);

	if (!event.locals.authenticated && event.url.pathname !== '/login') {
		// Vale anche per le POST delle action: senza sessione si torna al login.
		return new Response(null, { status: 303, headers: { location: '/login' } });
	}
	if (event.locals.authenticated && event.url.pathname === '/login') {
		return new Response(null, { status: 303, headers: { location: '/' } });
	}

	return resolve(event);
};
