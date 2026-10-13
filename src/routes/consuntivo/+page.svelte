<script lang="ts">
	import { resolve } from '$app/paths';
	import Download from '@lucide/svelte/icons/download';
	import Button from '#lib/components/Button.svelte';
	import { formatDayLabel } from '#lib/day.js';
	import { formatDuration } from '#lib/duration.js';
	import { periodQuery } from '#lib/report.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const csvHref = $derived(resolve(`/consuntivo/csv?${periodQuery(data.period)}`));
	const clientName = $derived(
		data.clients.find((client) => client.id === data.period.clientId)?.name ?? null
	);
	const rangeLabel = $derived(
		data.period.from === data.period.to
			? formatDayLabel(data.period.from, data.today)
			: `${formatDayLabel(data.period.from, data.today)} – ${formatDayLabel(data.period.to, data.today)}`
	);
	const presets = $derived([
		{ label: 'Questo mese', ...data.thisMonth },
		{ label: 'Mese scorso', ...data.lastMonth }
	]);
	const isEmpty = $derived(data.summary.byDay.length === 0);
</script>

<svelte:head>
	<title>Consuntivo · Registro ore</title>
</svelte:head>

<div class="page">
	<h1 class="visually-hidden">Consuntivo</h1>

	<section aria-labelledby="period-heading">
		<h2 id="period-heading">Periodo</h2>
		<form method="GET" action={resolve('/consuntivo')} class="row">
			<div class="field">
				<label for="from">Dal</label>
				<input id="from" name="dal" type="date" value={data.period.from} required />
			</div>
			<div class="field">
				<label for="to">Al</label>
				<input
					id="to"
					name="al"
					type="date"
					value={data.period.to}
					required
					aria-invalid={data.error ? 'true' : undefined}
					aria-describedby={data.error ? 'period-error' : undefined}
				/>
			</div>
			<div class="field client">
				<label for="client">Cliente</label>
				<select id="client" name="cliente">
					<option value="" selected={data.period.clientId === null}>Tutti i clienti</option>
					{#each data.clients as client (client.id)}
						<option value={client.id} selected={client.id === data.period.clientId}>
							{client.name}{client.archived ? ' (archiviato)' : ''}
						</option>
					{/each}
				</select>
			</div>
			<Button type="submit" variant="primary">Mostra</Button>
		</form>
		{#if data.error}
			<p class="error" id="period-error" role="alert">{data.error}</p>
		{/if}
		<p class="presets">
			{#each presets as preset (preset.label)}
				<a
					href={resolve(
						`/consuntivo?${periodQuery({ from: preset.from, to: preset.to, clientId: data.period.clientId })}`
					)}>{preset.label}</a
				>
			{/each}
		</p>
	</section>

	<section aria-labelledby="summary-heading">
		<div class="summary-head">
			<div>
				<h2 id="summary-heading">{rangeLabel}</h2>
				<p class="scope">{clientName ?? 'Tutti i clienti'}</p>
			</div>
			<div class="total">
				<span class="caption">Totale</span>
				<span class="value num">{formatDuration(data.summary.totalMinutes)}</span>
			</div>
		</div>

		{#if isEmpty}
			<p class="empty">Nessuna registrazione in questo periodo.</p>
		{:else}
			<a class="download" href={csvHref} download>
				<Download size={18} strokeWidth={1.75} aria-hidden="true" />
				Scarica CSV
			</a>

			{#if data.summary.byClient.length > 1}
				<ul class="clients" aria-label="Totale per cliente">
					{#each data.summary.byClient as client (client.clientId)}
						<li>
							<span>{client.clientName}</span>
							<span class="num amount">{formatDuration(client.minutes)}</span>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="days">
				{#each data.summary.byDay as day (day.day)}
					<section class="day" aria-label={formatDayLabel(day.day, data.today)}>
						<header>
							<h3>{formatDayLabel(day.day, data.today)}</h3>
							<span class="num amount">{formatDuration(day.minutes)}</span>
						</header>
						<ul>
							{#each day.entries as entry (entry.id)}
								<li>
									<div class="info">
										<span class="activity">{entry.activity}</span>
										<span class="meta">{entry.clientName}</span>
									</div>
									<span class="num amount">{formatDuration(entry.durationMinutes)}</span>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.page {
		max-width: 60rem;
		margin: 0 auto;
		padding: var(--space-6) var(--space-5) var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-7);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	h2 {
		font-size: var(--text-lg);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 0 1 11rem;
		min-width: 0;
	}

	.field.client {
		flex: 1 1 12rem;
	}

	label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
	}

	select,
	input {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		background: var(--bg);
		color: var(--ink);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-size: var(--text-base);
		transition:
			border-color var(--dur-fast) var(--ease-out),
			background-color var(--dur-fast) var(--ease-out);
	}

	@media (hover: hover) {
		select:hover,
		input:hover {
			background: var(--surface-2);
		}
	}

	select:focus-visible,
	input:focus-visible {
		border-color: var(--primary);
	}

	[aria-invalid='true'] {
		border-color: var(--danger);
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		font-size: var(--text-sm);
	}

	.presets a {
		display: inline-flex;
		align-items: center;
		min-height: var(--control-h);
	}

	.summary-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.scope,
	.caption,
	.meta {
		font-size: var(--text-sm);
		color: var(--muted);
	}

	.total {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.value {
		font-size: var(--text-3xl);
		line-height: var(--text-3xl-lh);
		letter-spacing: -0.02em;
		font-weight: 600;
	}

	.download {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		align-self: flex-start;
		gap: var(--space-2);
		min-height: var(--control-h);
		padding: 0 var(--space-4);
		border: 1px solid var(--primary);
		border-radius: var(--radius-sm);
		background: var(--primary);
		color: var(--primary-ink);
		font-size: var(--text-sm);
		font-weight: 500;
		text-decoration: none;
		transition: background-color var(--dur-fast) var(--ease-out);
	}

	.download:active {
		background: var(--primary-hover);
	}

	@media (hover: hover) {
		.download:hover {
			background: var(--primary-hover);
		}
	}

	ul {
		list-style: none;
		padding: 0;
	}

	.clients,
	.day {
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
		gap: 0;
	}

	li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
	}

	li + li,
	.day header + ul {
		border-top: 1px solid var(--border);
	}

	.clients li {
		font-weight: 500;
	}

	.days {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.day header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		background: var(--surface-2);
		border-radius: var(--radius-md) var(--radius-md) 0 0;
	}

	h3 {
		font-size: var(--text-base);
		font-weight: 600;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.activity {
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.meta {
		overflow-wrap: anywhere;
	}

	.amount {
		font-weight: 600;
		white-space: nowrap;
	}

	.empty {
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--muted);
		font-size: var(--text-sm);
	}

	@media (max-width: 559px) {
		.page {
			padding: var(--space-5) var(--space-4) var(--space-7);
			gap: var(--space-6);
		}

		.field {
			flex: 1 1 100%;
		}

		.total {
			align-items: flex-start;
		}

		.value {
			font-size: var(--text-2xl);
			line-height: var(--text-2xl-lh);
		}
	}
</style>
