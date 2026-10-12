/** Errore restituito da un'action di questa pagina, normalizzato per la UI. */
export interface FormFailure {
	action: string;
	error: string;
	/** Nome logico del campo: `name`, `duration`, `clientId`. */
	field?: string;
	/** Riga interessata, quando l'errore riguarda una task o un cliente preciso. */
	id?: number;
}
