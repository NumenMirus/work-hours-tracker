<script lang="ts">
	import '@fontsource-variable/inter';
	import '../app.css';

	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import LogOut from '@lucide/svelte/icons/log-out';
	import logo from '#lib/assets/logo.png';
	import Toast from '#lib/components/Toast.svelte';
	import RunningClock from '#lib/components/RunningClock.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const isCurrent = (href: string) =>
		page.url.pathname === href || (href !== '/' && page.url.pathname.startsWith(href));
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="icon" href="/favicon.png" type="image/png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</svelte:head>

{#if data.authenticated}
	<header class="shell">
		<div class="brand">
			<img class="logo" src={logo} alt="" width="28" height="28" />Registro ore
		</div>
		<nav aria-label="Sezioni">
			<a href={resolve('/')} aria-current={isCurrent('/') ? 'page' : undefined}>Giornata</a>
			<a href={resolve('/gestione')} aria-current={isCurrent('/gestione') ? 'page' : undefined}
				>Gestione</a
			>
			<a href={resolve('/consuntivo')} aria-current={isCurrent('/consuntivo') ? 'page' : undefined}
				>Consuntivo</a
			>
		</nav>
		<div class="end">
			{#if data.timer}
				<a class="pill" href={resolve('/#timer')}>
					<span class="dot" aria-hidden="true"></span>
					<span class="pill-activity">{data.timer.activity}</span>
					<RunningClock startedAt={data.timer.startedAt} size="sm" />
				</a>
			{/if}
			<form method="POST" action="/logout">
				<button class="exit" type="submit">
					<LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
					<span class="exit-label">Esci</span>
				</button>
			</form>
		</div>
	</header>
{/if}

<main>
	{@render children()}
</main>

<Toast />

<style>
	.shell {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-2) max(var(--space-5), env(safe-area-inset-right)) var(--space-2)
			max(var(--space-5), env(safe-area-inset-left));
		border-bottom: 1px solid var(--border);
	}

	/* Gli incavi dello schermo (notch in orizzontale, barra di sistema) restano fuori dal contenuto. */
	main {
		padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
		font-size: var(--text-base);
	}

	@media (prefers-color-scheme: dark) {
		.logo {
			filter: invert(1);
		}
	}

	nav {
		display: flex;
		gap: var(--space-1);
	}

	nav a {
		display: inline-flex;
		align-items: center;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
		text-decoration: none;
	}

	nav a:active {
		background: var(--surface-2);
		color: var(--ink);
	}

	@media (hover: hover) {
		nav a:hover {
			background: var(--surface-2);
			color: var(--ink);
		}
	}

	nav a[aria-current='page'] {
		color: var(--primary);
		background: var(--primary-soft);
	}

	.end {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-left: auto;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		min-height: var(--control-h);
		background: var(--live-soft);
		border: 1px solid var(--live);
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		text-decoration: none;
		color: var(--ink);
	}

	.pill-activity {
		max-width: 22ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dot {
		width: 8px;
		height: 8px;
		flex: none;
		border-radius: var(--radius-full);
		background: var(--live);
	}

	.exit {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
		transition:
			background-color var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out);
	}

	.exit:active {
		background: var(--surface-2);
		color: var(--ink);
	}

	@media (hover: hover) {
		.exit:hover {
			background: var(--surface-2);
			color: var(--ink);
		}
	}

	/* Telefono in verticale: marchio, sezioni e uscita stanno su una riga sola; "Esci" resta
	   solo come icona (il testo resta per gli screen reader). */
	@media (max-width: 559px) {
		.shell {
			gap: var(--space-2);
			padding-inline: max(var(--space-4), env(safe-area-inset-left))
				max(var(--space-4), env(safe-area-inset-right));
		}

		.exit {
			width: var(--control-h);
			justify-content: center;
			padding: 0;
		}

		.exit-label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}
</style>
