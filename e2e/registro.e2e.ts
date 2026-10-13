import { expect, test, type Locator, type Page } from '@playwright/test';

/** Una sola password per tutta la run: la stessa del `webServer` in playwright.config.ts. */
const PASSWORD = 'e2e-password-1';

const DUPLICATE_TASK = 'Questo cliente ha già una task con questo nome.';
const DUPLICATE_CLIENT = 'Esiste già un cliente con questo nome.';
const CLIENT_IN_USE = 'Il cliente ha task o registrazioni: archivialo invece di eliminarlo.';
const DURATION_ERROR =
	'Durata non valida. Scrivi i minuti (20) oppure ore e minuti (1:30 o 1h30), al massimo 24 h.';

/** Minuti letti da un'etichetta prodotta da `formatDuration` (`1 h 20 min`). */
function parseMinutes(label: string): number {
	const hours = /(\d+)\s*h\b/.exec(label);
	const minutes = /(\d+)\s*min/.exec(label);
	return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
}

/**
 * Dopo un'azione SvelteKit riporta il focus su `body` e l'app lo rimette dov'era un attimo
 * dopo: aspettare quell'istante evita di asserire sul focus prima che sia stato ripristinato.
 */
async function settleFocus(page: Page): Promise<void> {
	await page.waitForTimeout(300);
}

/** Minuti letti da un campo durata precompilato con `formatDurationInput` (`20`, `1:30`). */
function inputMinutes(value: string): number {
	const [hours, minutes] = value.split(':');
	return minutes === undefined ? Number(hours) : Number(hours) * 60 + Number(minutes);
}

/** Il totale del giorno: l'unico valore che non deve mai sbagliare. */
function total(page: Page): Locator {
	return page.locator('.total .value');
}

/**
 * La regione `role="status"` del toast: sempre montata nel layout, è l'unico posto dove
 * compaiono i messaggi brevi con la loro azione (Annulla, Ripristina).
 */
function toast(page: Page): Locator {
	return page.locator('.toast-region');
}

/** Il form di modifica inline: è l'unico `<form>` con dentro il bottone "Salva". */
function editForm(page: Page): Locator {
	return page
		.locator('form')
		.filter({ has: page.getByRole('button', { name: 'Salva', exact: true }) });
}

/** Una riga della lista registrazioni per attività. */
function entryRow(page: Page, activity: string): Locator {
	return page
		.getByRole('region', { name: 'Registrazioni' })
		.getByRole('listitem')
		.filter({ hasText: activity });
}

test.describe.serial('Registro ore', () => {
	test('scenario completo: login, anagrafica, giornata, timer e persistenza', async ({ page }) => {
		await test.step('login: password errata poi corretta', async () => {
			await page.goto('/');
			await expect(page).toHaveURL(/\/login$/);

			await page.getByLabel('Password').fill('password-sbagliata');
			await page.getByRole('button', { name: 'Entra' }).click();
			await expect(page.getByText('Password errata.')).toBeVisible();
			await expect(page).toHaveURL(/\/login$/);

			await page.getByLabel('Password').fill(PASSWORD);
			await page.getByRole('button', { name: 'Entra' }).click();
			await expect(page).toHaveURL('http://localhost:4173/');
			await expect(page.getByRole('heading', { name: 'Task rapide' })).toBeVisible();
		});

		const taskRows = () => page.getByRole('region', { name: 'Task rapide' }).getByRole('listitem');
		const clientRows = () => page.getByRole('region', { name: 'Clienti' }).getByRole('listitem');

		await test.step('gestione: cliente, task, duplicati e CRUD', async () => {
			await page.getByRole('link', { name: 'Gestione', exact: true }).click();

			// Senza anagrafica la pagina parte dai clienti.
			await expect(
				page.getByText('Crea prima un cliente: ogni task rapida appartiene a un cliente.')
			).toBeVisible();

			await page.getByLabel('Nuovo cliente').fill('Rossi');
			await page.getByRole('button', { name: 'Crea cliente' }).click();
			await expect(clientRows()).toHaveCount(1);
			await expect(clientRows().first()).toContainText('Rossi');

			// Nome duplicato, anche in maiuscolo/minuscolo diverso.
			await page.getByLabel('Nuovo cliente').fill('rossi');
			await page.getByRole('button', { name: 'Crea cliente' }).click();
			await expect(page.getByText(DUPLICATE_CLIENT)).toBeVisible();
			await expect(clientRows()).toHaveCount(1);

			const taskForm = page.getByRole('region', { name: 'Task rapide' });
			await taskForm.getByLabel('Cliente').selectOption({ label: 'Rossi' });
			await taskForm.getByLabel('Nome').fill('Assistenza');
			await taskForm.getByLabel('Durata').fill('20');
			await page.getByRole('button', { name: 'Aggiungi task' }).click();
			await expect(taskRows().filter({ hasText: 'Assistenza' })).toContainText('+20 min');

			await taskForm.getByLabel('Nome').fill('Controllo turni');
			await taskForm.getByLabel('Durata').fill('1h');
			await page.getByRole('button', { name: 'Aggiungi task' }).click();
			await expect(taskRows().filter({ hasText: 'Controllo turni' })).toContainText('+1 h');
			await expect(taskRows()).toHaveCount(2);

			// Nome già usato dallo stesso cliente.
			await taskForm.getByLabel('Nome').fill('Assistenza');
			await taskForm.getByLabel('Durata').fill('30');
			await page.getByRole('button', { name: 'Aggiungi task' }).click();
			await expect(page.getByText(DUPLICATE_TASK)).toBeVisible();
			await expect(taskRows()).toHaveCount(2);

			// Durata non valida: l'errore è unico e sul campo.
			await taskForm.getByLabel('Nome').fill('Prova');
			await taskForm.getByLabel('Durata').fill('abc');
			await page.getByRole('button', { name: 'Aggiungi task' }).click();
			await expect(taskForm.getByText(DURATION_ERROR)).toBeVisible();
			await expect(taskRows()).toHaveCount(2);

			// CRUD completo sulla task "Prova".
			await taskForm.getByLabel('Durata').fill('15');
			await page.getByRole('button', { name: 'Aggiungi task' }).click();
			const prova = taskRows().filter({ hasText: 'Prova' });
			await expect(prova).toContainText('+15 min');

			await page.getByRole('button', { name: 'Modifica Prova' }).click();
			await expect(editForm(page).getByLabel('Nome')).toHaveValue('Prova');
			await editForm(page).getByLabel('Durata').fill('30');
			await editForm(page).getByRole('button', { name: 'Salva' }).click();
			await expect(taskRows().filter({ hasText: 'Prova' })).toContainText('+30 min');

			// L'eliminazione della task "Prova" è coperta dal test dedicato alla conferma in due passi.
			await expect(taskRows()).toHaveCount(3);

			// Un cliente con task non si elimina: si archivia.
			await page.getByRole('button', { name: 'Elimina Rossi' }).click();
			await page.getByRole('button', { name: 'Conferma eliminazione di Rossi' }).click();
			await expect(page.getByText(CLIENT_IN_USE)).toBeVisible();
			await expect(clientRows()).toHaveCount(1);
		});

		await test.step('giornata: le task rapide sommano il totale', async () => {
			await page.getByRole('link', { name: 'Giornata', exact: true }).click();
			await expect(page).toHaveURL('http://localhost:4173/');

			const quick = page.getByRole('region', { name: 'Task rapide' });
			await expect(page.getByRole('link', { name: /^Analisi/ })).toHaveCount(0);

			await quick.getByRole('button', { name: /^Assistenza/ }).click();
			await expect(total(page)).toHaveText('20 min');
			await expect(page.getByRole('link', { name: /^Analisi/ })).toHaveCount(0);

			await quick.getByRole('button', { name: /^Controllo turni/ }).click();
			await expect(total(page)).toHaveText('1 h 20 min');

			await quick.getByRole('button', { name: /^Assistenza/ }).click();
			await expect(total(page)).toHaveText('1 h 40 min');

			// Il toast annulla l'ultima aggiunta.
			await toast(page).getByRole('button', { name: 'Annulla' }).click();
			await expect(total(page)).toHaveText('1 h 20 min');
			await expect(page.getByText('Aggiunta annullata.')).toBeVisible();
		});

		await test.step('inserimento manuale e durata non valida', async () => {
			const manual = page.getByRole('region', { name: 'Inserimento manuale' });
			await manual.getByLabel('Attività').fill('Riunione');
			await manual.getByLabel('Durata').fill('15');
			await manual.getByRole('button', { name: 'Aggiungi' }).click();
			await expect(total(page)).toHaveText('1 h 35 min');
			await expect(manual.getByLabel('Attività')).toHaveValue('');

			await manual.getByLabel('Attività').fill('Riunione 2');
			await manual.getByLabel('Durata').fill('abc');
			await manual.getByRole('button', { name: 'Aggiungi' }).click();
			await expect(manual.getByText(DURATION_ERROR)).toBeVisible();
			await expect(total(page)).toHaveText('1 h 35 min');
			await expect(entryRow(page, 'Riunione 2')).toHaveCount(0);
		});

		await test.step('modifica di una registrazione senza toccare la task', async () => {
			await page.getByRole('button', { name: 'Modifica Assistenza' }).first().click();
			await expect(editForm(page).getByLabel('Attività')).toHaveValue('Assistenza');
			await editForm(page).getByLabel('Durata').fill('30');
			await editForm(page).getByRole('button', { name: 'Salva' }).click();
			await expect(total(page)).toHaveText('1 h 45 min');
			await expect(entryRow(page, 'Assistenza').getByText('30 min')).toBeVisible();

			// La task veloce conserva la sua durata predefinita.
			await page.getByRole('link', { name: 'Gestione', exact: true }).click();
			await expect(
				page.getByRole('region', { name: 'Task rapide' }).getByRole('listitem').filter({
					hasText: 'Assistenza'
				})
			).toContainText('+20 min');

			// Un cliente con registrazioni non si elimina nemmeno dopo le task.
			await page.getByRole('button', { name: 'Elimina Rossi' }).click();
			await page.getByRole('button', { name: 'Conferma eliminazione di Rossi' }).click();
			await expect(page.getByText(CLIENT_IN_USE)).toBeVisible();
		});

		await test.step('eliminazione e ripristino di una registrazione', async () => {
			await page.getByRole('link', { name: 'Giornata', exact: true }).click();
			await expect(total(page)).toHaveText('1 h 45 min');

			await page.getByRole('button', { name: 'Elimina Riunione' }).click();
			await expect(total(page)).toHaveText('1 h 30 min');
			await expect(toast(page)).toContainText('Eliminata: Riunione · 15 min');
			await expect(entryRow(page, 'Riunione')).toHaveCount(0);

			await toast(page).getByRole('button', { name: 'Ripristina' }).click();
			await expect(total(page)).toHaveText('1 h 45 min');
			await expect(entryRow(page, 'Riunione')).toHaveCount(1);

			await page.getByRole('button', { name: 'Elimina Riunione' }).click();
			await expect(total(page)).toHaveText('1 h 30 min');
		});

		await test.step('timer: avvio, misura e registrazione', async () => {
			const timer = page.getByRole('region', { name: 'Timer' });
			await timer.getByRole('button', { name: 'Avvia timer…' }).click();
			await timer.getByLabel('Cliente').selectOption({ label: 'Rossi' });
			await timer.getByLabel('Attività').fill('Analisi');
			await timer.getByRole('button', { name: 'Avvia' }).click();

			await expect(timer.getByText('In corso')).toBeVisible();
			await expect(timer.getByText('Rossi — Analisi')).toBeVisible();
			await expect(page.getByRole('link', { name: /^Analisi/ })).toBeVisible();

			// "Ferma" non registra: chiede la durata misurata, correggibile.
			await timer.getByRole('button', { name: 'Ferma' }).click();
			const measured = await timer.getByText(/Tempo misurato:/).innerText();
			const measuredMinutes = parseMinutes(measured);
			const prefill = timer.getByLabel('Durata da registrare');
			await expect(prefill).not.toHaveValue('');
			expect(inputMinutes(await prefill.inputValue())).toBe(measuredMinutes);

			await prefill.fill('10');
			await timer.getByRole('button', { name: 'Registra' }).click();

			await expect(total(page)).toHaveText('1 h 40 min');
			await expect(toast(page)).toContainText('Analisi +10 min · Rossi');
			await expect(page.getByRole('link', { name: /^Analisi/ })).toHaveCount(0);
			await expect(timer.getByRole('button', { name: 'Avvia timer…' })).toBeVisible();

			// La riga dichiara la fonte e i minuti realmente misurati.
			const row = entryRow(page, 'Analisi');
			await expect(row).toContainText('Rossi');
			await expect(row.getByText(/timer/)).toBeVisible();
			const meta = await row.locator('.meta').innerText();
			expect(meta).toContain('timer');
			expect(meta).toContain('(misurati');
			expect(Math.abs(parseMinutes(meta) - measuredMinutes)).toBeLessThanOrEqual(1);
		});

		await test.step('giorni: precedente vuoto e ritorno a oggi', async () => {
			await page.getByRole('link', { name: 'Giorno precedente' }).click();
			await expect(total(page)).toHaveText('0 min');
			await expect(
				page.getByText(
					'Nessuna registrazione per questo giorno. Scegli una task rapida per aggiungere tempo.'
				)
			).toBeVisible();

			await page.getByRole('link', { name: 'Oggi' }).click();
			await expect(total(page)).toHaveText('1 h 40 min');
			await expect(entryRow(page, 'Analisi')).toHaveCount(1);
		});

		await test.step('reload: il totale resta quello registrato', async () => {
			await page.reload();
			await expect(total(page)).toHaveText('1 h 40 min');
			await expect(entryRow(page, 'Analisi')).toHaveCount(1);
			await expect(entryRow(page, 'Assistenza')).toHaveCount(1);
			await expect(entryRow(page, 'Assistenza')).toContainText('30 min');
			await expect(entryRow(page, 'Controllo turni')).toContainText('1 h');
			await expect(page.getByRole('link', { name: /^Analisi/ })).toHaveCount(0);
		});
	});
});

test.describe.serial('Conferma in due passi', () => {
	// Va dopo lo scenario principale perché usa i dati creati lì (task "Prova" di Rossi).
	test("l'eliminazione di una task chiede una seconda conferma", async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Password').fill(PASSWORD);
		await page.getByRole('button', { name: 'Entra' }).click();
		await page.getByRole('link', { name: 'Gestione', exact: true }).click();

		const taskRows = page
			.getByRole('region', { name: 'Task rapide' })
			.getByRole('listitem')
			.filter({ hasText: 'Prova' });
		await expect(taskRows).toHaveCount(1);

		// Primo tocco: il bottone si arma e la task resta in lista.
		await page.getByRole('button', { name: 'Elimina Prova' }).click();
		const armed = page.getByRole('button', { name: 'Conferma eliminazione di Prova' });
		await expect(armed).toHaveText('Conferma');
		await expect(taskRows).toHaveCount(1);

		// Secondo tocco: solo ora la task viene eliminata.
		await armed.click();
		await expect(taskRows).toHaveCount(0);
	});

	test('da tastiera: il focus resta, Ctrl+Z annulla e le eliminate si ripristinano', async ({
		page
	}) => {
		await page.goto('/login');
		await page.getByLabel('Password').fill(PASSWORD);
		await page.getByRole('button', { name: 'Entra' }).click();
		await expect(total(page)).toBeVisible();

		const minutes = async () => parseMinutes(await total(page).innerText());
		const before = await minutes();

		await test.step('aggiunta con Invio: il focus resta sulla task', async () => {
			const quick = page.getByRole('button', { name: /^Assistenza/ });
			await quick.focus();
			await page.keyboard.press('Enter');
			await expect.poll(minutes).toBe(before + 20);
			await settleFocus(page);
			await expect(quick).toBeFocused();

			// Ctrl/⌘+Z esegue l'Annulla del toast anche senza raggiungerlo con Tab.
			await page.keyboard.press('ControlOrMeta+Z');
			await expect(page.getByText('Aggiunta annullata.')).toBeVisible();
			await expect.poll(minutes).toBe(before);
			await settleFocus(page);
			await expect(quick).toBeFocused();
		});

		await test.step('eliminazione da tastiera: il focus passa alla riga vicina', async () => {
			const list = page.getByRole('region', { name: 'Registrazioni' });
			const remove = list.getByRole('button', { name: /^Elimina / }).first();
			await remove.focus();
			await page.keyboard.press('Enter');
			await expect.poll(minutes).toBeLessThan(before);
			await expect(list.locator(':focus')).toHaveCount(1);
		});

		await test.step('dopo la chiusura del toast la registrazione si recupera dall’elenco', async () => {
			const list = page.getByRole('region', { name: 'Registrazioni' });
			await list.getByText(/^Registrazioni eliminate \(\d+\)$/).click();
			await list
				.getByRole('button', { name: /^Ripristina / })
				.first()
				.click();
			await expect.poll(minutes).toBe(before);
		});
	});
});

test.describe('Errori e sessione', () => {
	test('con un cookie non valido si torna al login spiegando perché', async ({ page, context }) => {
		await context.addCookies([
			{ name: 'rh_session', value: 'sessione-scaduta', url: 'http://localhost:4173' }
		]);
		await page.goto('/');
		await expect(page).toHaveURL(/\/login\?sessione=scaduta$/);
		await expect(page.getByText('La sessione non è più valida')).toBeVisible();
	});

	test('una pagina inesistente mostra un errore in italiano, non quello di default', async ({
		page
	}) => {
		await page.goto('/login');
		await page.getByLabel('Password').fill(PASSWORD);
		await page.getByRole('button', { name: 'Entra' }).click();
		await expect(total(page)).toBeVisible();

		const response = await page.goto('/non-esiste');
		expect(response?.status()).toBe(404);
		await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();
		await page.getByRole('link', { name: 'Torna alla giornata' }).click();
		await expect(total(page)).toBeVisible();
	});

	test('un giorno non valido nell’URL riporta alla giornata di oggi', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Password').fill(PASSWORD);
		await page.getByRole('button', { name: 'Entra' }).click();
		await expect(total(page)).toBeVisible();

		await page.goto('/?d=2026-13-45');
		await expect(page).toHaveURL(/\/$/);
		await expect(total(page)).toBeVisible();
	});
});
