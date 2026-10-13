import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { getDb } from '#lib/server/db.js';
import { validateSession } from '#lib/server/repo.js';

const SESSION_COOKIE = 'rh_session';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.authenticated = validateSession(getDb(), token);

	if (!event.locals.authenticated && event.url.pathname !== '/login') {
		// Vale anche per le POST delle action: senza sessione si torna al login. Se il browser
		// aveva un cookie ma non vale più (scaduto o sessione chiusa altrove) lo si dice, così
		// l'azione che sembra "non fatta" ha una spiegazione.
		const location = token ? '/login?sessione=scaduta' : '/login';
		return new Response(null, { status: 303, headers: { location } });
	}
	if (event.locals.authenticated && event.url.pathname === '/login') {
		return new Response(null, { status: 303, headers: { location: '/' } });
	}

	return resolve(event);
};

/**
 * Errori non attesi: il dettaglio resta nel log del servizio (journalctl), all'utente va un
 * messaggio italiano senza dettagli interni. Gli errori del framework (404, 405, 413) sono
 * routine: si traducono ma non si loggano.
 */
export const handleError: HandleServerError = (input) => {
	if (input.kind === 'unknown') {
		const { event, error } = input;
		console.error(
			`[${new Date().toISOString()}] ${event.request.method} ${event.url.pathname}`,
			error
		);
		return { message: 'Errore interno del server.' };
	}
	if (input.kind === 'framework') {
		switch (input.error.status) {
			case 404:
				return { message: 'Pagina non trovata.' };
			case 405:
				return { message: 'Operazione non consentita.' };
			case 413:
				return { message: 'La richiesta è troppo grande.' };
			default:
				return { message: 'Richiesta non valida.' };
		}
	}
	// Errori dell'app (`error(...)`) e di validazione: già sicuri da mostrare.
};
