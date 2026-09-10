<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<nav>
		<a href="/" aria-current={page.url.pathname === '/' ? 'page' : null}>Quiz</a>
		<a href="/questions" aria-current={page.url.pathname === '/questions' ? 'page' : null}>
			Questions
		</a>
	</nav>
</header>

<main>
	{@render children()}
</main>

<style>
	:global(:root) {
		--paper: #faf7f2;
		--ink: #2b2119;
		--muted: #7a6a5c;
		--rule: #e2d8ca;
		--timber: #a9682f;
		--green: #3f7d4e;
		--red: #b2452f;
		color-scheme: light dark;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--paper: #1c1815;
			--ink: #f0e8dd;
			--muted: #a2907e;
			--rule: #3a322b;
			--timber: #d69350;
			--green: #6bb27e;
			--red: #e07458;
		}
	}

	:global(body) {
		margin: 0;
		background: var(--paper);
		color: var(--ink);
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		line-height: 1.5;
	}

	:global(button) {
		font: inherit;
		cursor: pointer;
	}

	header {
		border-bottom: 1px solid var(--rule);
	}

	nav {
		display: flex;
		gap: 1.5rem;
		max-width: 42rem;
		margin: 0 auto;
		padding: 0.9rem 1.25rem;
	}

	nav a {
		color: var(--muted);
		text-decoration: none;
		font-size: 0.95rem;
		font-weight: 500;
	}

	nav a:hover {
		color: var(--ink);
	}

	nav a[aria-current='page'] {
		color: var(--timber);
	}

	main {
		max-width: 42rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 4rem;
	}
</style>
