import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	APP_PASSWORD: {
		description: 'Password unica di accesso (min 8 caratteri)',
		schema: (v) => {
			if (building) return v ?? '';
			if (!v || v.length < 8) {
				throw new Error('APP_PASSWORD mancante o più corta di 8 caratteri');
			}
			return v;
		}
	},
	DATABASE_PATH: {
		description: 'Percorso del file SQLite',
		schema: (v) => v || 'data/registro-ore.sqlite'
	},
	APP_TIME_ZONE: {
		description: 'Fuso orario IANA per "oggi"',
		schema: (v) => {
			const tz = v || 'Europe/Rome';
			new Intl.DateTimeFormat('en', { timeZone: tz });
			return tz;
		}
	}
});
