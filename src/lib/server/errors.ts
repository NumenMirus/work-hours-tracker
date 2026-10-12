export type DomainErrorCode =
	'not_found' | 'duplicate' | 'in_use' | 'archived' | 'timer_running' | 'no_timer' | 'invalid';

/** Errore di dominio: `message` è già la stringa italiana da mostrare all'utente. */
export class DomainError extends Error {
	code: DomainErrorCode;

	constructor(code: DomainErrorCode, message: string) {
		super(message);
		this.name = 'DomainError';
		this.code = code;
	}
}
