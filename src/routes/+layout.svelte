<script lang="ts">
	import '@fontsource-variable/inter';
	import '../app.css';

	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import LogOut from '@lucide/svelte/icons/log-out';
	import favicon from '#lib/assets/favicon.svg';
	import Toast from '#lib/components/Toast.svelte';
	import RunningClock from '#lib/components/RunningClock.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const isCurrent = (href: string) =>
		page.url.pathname === href || (href !== '/' && page.url.pathname.startsWith(href));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.authenticated}
	<header class="shell">
		<div class="brand">Registro ore</div>
		<nav aria-label="Sezioni">
			<a href={resolve('/')} aria-current={isCurrent('/') ? 'page' : undefined}>Giornata</a>
			<a href={resolve('/gestione')} aria-current={isCurrent('/gestione') ? 'page' : undefined}
				>Gestione</a
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
					Esci
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
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--border);
	}

	.brand {
		font-weight: 600;
		font-size: var(--text-base);
	}

	nav {
		display: flex;
		gap: var(--space-1);
	}

	nav a {
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--muted);
		text-decoration: none;
	}

	nav a:hover {
		background: var(--surface-2);
		color: var(--ink);
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

	.exit:hover {
		background: var(--surface-2);
		color: var(--ink);
	}

	@media (pointer: coarse) {
		.exit,
		.pill {
			min-height: var(--control-h-coarse);
		}
	}
</style>
