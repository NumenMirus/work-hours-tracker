import { createHash, timingSafeEqual } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { APP_PASSWORD } from '$app/env/private';
import { getDb } from '#lib/server/db.js';
import { createSession } from '#lib/server/repo.js';
import type { Actions } from './$types';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface Attempt {
	failures: number;
	firstAt: number;
}

const attempts = new Map<string, Attempt>();

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = getClientAddress();
		const now = Date.now();
		const attempt = attempts.get(ip);
		if (attempt && now - attempt.firstAt > WINDOW_MS) attempts.delete(ip);
		else if (attempt && attempt.failures >= MAX_FAILURES) {
			return fail(429, { error: 'Troppi tentativi. Riprova tra qualche minuto.' });
		}

		const data = await request.formData();
		const input = String(data.get('password') ?? '');
		const digest = createHash('sha256').update(input).digest();

		if (!timingSafeEqual(digest, createHash('sha256').update(APP_PASSWORD).digest())) {
			const previous = attempts.get(ip);
			attempts.set(ip, {
				failures: (previous?.failures ?? 0) + 1,
				firstAt: previous?.firstAt ?? now
			});
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
