<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { formatDuration } from '#lib/duration.js';

	interface Props {
		day: string;
		label: string;
		isToday: boolean;
		prevDay: string;
		nextDay: string;
		totalMinutes: number;
	}

	let { day, label, isToday, prevDay, nextDay, totalMinutes }: Props = $props();

	let dateInput = $state<HTMLInputElement | null>(null);

	function pickDay(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		// Il server rifiuta i giorni inesistenti con un redirect: qui si filtra solo il formato.
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) goto(resolve(`/?d=${value}`));
	}

	function openPicker() {
		try {
			dateInput?.showPicker();
		} catch {
			// Safari e i browser senza picker nativo aprono il campo al tap: nessun fallback.
		}
	}
</script>

<header class="day-header">
	<div class="nav">
		<a class="arrow" href={resolve(`/?d=${prevDay}`)} aria-label="Giorno precedente">
			<ChevronLeft size={18} stroke-width={1.75} aria-hidden="true" />
		</a>

		<label class="date">
			<span class="date-label">{label}</span>
			<input
				bind:this={dateInput}
				type="date"
				value={day}
				onchange={pickDay}
				onclick={openPicker}
				aria-label="Scegli la data"
			/>
		</label>

		<a class="arrow" href={resolve(`/?d=${nextDay}`)} aria-label="Giorno successivo">
			<ChevronRight size={18} stroke-width={1.75} aria-hidden="true" />
		</a>

		{#if !isToday}
			<a class="today" href={resolve('/')}>Oggi</a>
		{/if}
	</div>

	<div class="total" aria-live="polite">
		<span class="caption">Totale</span>
		<span class="value num">{formatDuration(totalMinutes)}</span>
	</div>
</header>

<style>
	.day-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3) var(--space-4);
		padding: var(--space-4) 0;
	}

	@media (max-width: 959px) {
		.day-header {
			position: sticky;
			top: 0;
			z-index: var(--z-sticky);
			background: var(--bg);
			border-bottom: 1px solid var(--border);
			margin: 0 calc(-1 * var(--space-4)) var(--space-4);
			padding: var(--space-3) var(--space-4);
		}
	}

	.nav {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--control-h);
		height: var(--control-h);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		color: var(--ink);
		text-decoration: none;
		background: var(--surface);
		transition:
			background-color var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out);
	}

	.arrow:hover {
		background: var(--surface-2);
	}

	.date {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.date:hover {
		background: var(--surface-2);
	}

	.date:focus-within {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	.date-label {
		font-size: var(--text-lg);
		font-weight: 600;
		text-wrap: balance;
	}

	/* L'input nativo copre l'etichetta: il click apre il calendario, il testo resta illeggibile. */
	.date input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.today {
		min-height: var(--control-h);
		display: inline-flex;
		align-items: center;
		padding: 0 var(--space-3);
		margin-left: var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
		text-decoration: none;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out);
	}

	.today:hover {
		background: var(--surface-2);
		color: var(--ink);
	}

	.total {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.caption {
		font-size: var(--text-sm);
		color: var(--muted);
	}

	.value {
		font-size: var(--text-3xl);
		line-height: var(--text-3xl-lh);
		letter-spacing: -0.02em;
		font-weight: 600;
	}

	@media (max-width: 959px) {
		.value {
			font-size: var(--text-2xl);
			line-height: var(--text-2xl-lh);
		}
	}

	@media (pointer: coarse) {
		.arrow,
		.date,
		.today {
			min-height: var(--control-h-coarse);
		}

		.arrow {
			height: var(--control-h-coarse);
		}
	}
</style>
