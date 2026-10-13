import { createHash, timingSafeEqual } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { APP_PASSWORD } from '$app/env/private';
import { getDb } from '#lib/server/db.js';
import { createSession } from '#lib/server/repo.js';
import type { Actions } from './$types';

const MAX_FAILURES = 5;
// Tetto complessivo, indipendente dall'IP: con un solo utente protegge dal brute force anche
// se l'indirizzo del client è falsificabile (proxy che non sovrascrive X-Forwarded-For).
const MAX_GLOBAL_FAILURES = 20;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_IPS = 10_000;

interface Attempt {
	failures: number;
	firstAt: number;
}

const attempts = new Map<string, Attempt>();
let globalAttempt: Attempt = { failures: 0, firstAt: 0 };

/** Elimina i contatori scaduti: la mappa non cresce senza limite sotto attacco. */
function pruneAttempts(now: number) {
	for (const [key, value] of attempts) {
		if (now - value.firstAt > WINDOW_MS) attempts.delete(key);
	}
}

/**
 * Con ADDRESS_HEADER impostato (deploy dietro proxy) `getClientAddress()` lancia se l'header
 * manca, per esempio con un proxy configurato male: il login non deve diventare un 500, e il
 * tetto globale resta comunque valido.
 */
function addressOf(getClientAddress: () => string): string {
	try {
		return getClientAddress();
	} catch {
		return 'sconosciuto';
	}
}

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = addressOf(getClientAddress);
		const now = Date.now();
		if (attempts.size > MAX_TRACKED_IPS) pruneAttempts(now);
		if (now - globalAttempt.firstAt > WINDOW_MS) globalAttempt = { failures: 0, firstAt: now };
		const attempt = attempts.get(ip);
		if (attempt && now - attempt.firstAt > WINDOW_MS) attempts.delete(ip);
		if (
			globalAttempt.failures >= MAX_GLOBAL_FAILURES ||
			(attempts.get(ip)?.failures ?? 0) >= MAX_FAILURES
		) {
			return fail(429, { error: 'Troppi tentativi. Riprova tra qualche minuto.' });
		}

		const data = await request.formData();
		const input = String(data.get('password') ?? '');
		const digest = createHash('sha256').update(input).digest();

		if (!timingSafeEqual(digest, createHash('sha256').update(APP_PASSWORD).digest())) {
			const previous = attempts.get(ip);
			if (attempts.size < MAX_TRACKED_IPS || previous) {
				attempts.set(ip, {
					failures: (previous?.failures ?? 0) + 1,
					firstAt: previous?.firstAt ?? now
				});
			}
			globalAttempt.failures += 1;
			return fail(400, { error: 'Password errata.' });
		}

		attempts.delete(ip);
		cookies.set('rh_session', createSession(getDb()), {
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});
		redirect(303, '/');
	}
};
