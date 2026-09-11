<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Question } from '$lib/Question';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const questions = $derived(data.questions.map((json) => new Question(json)));

	const message = $derived(form && 'message' in form ? form.message : null);
	const editMessage = $derived(form && 'editMessage' in form ? form.editMessage : null);

	// Which row is open, and whether the add form shows, both sit in the URL.
	// That keeps them working without JavaScript and survives a rejected submit.
	const editingId = $derived(page.url.searchParams.get('edit'));
	const removingId = $derived(page.url.searchParams.get('remove'));
	const adding = $derived(page.url.searchParams.get('add') !== null);

	// Search and filter are view-only, so plain state is enough. A client-side
	// navigation to ?edit= reuses this component, so both survive opening a row.
	/** Below this many questions the search box is more clutter than help. */
	const SEARCH_FROM = 10;

	let query = $state('');
	let topicFilter = $state<string | null>(null); // null = everything, '' = no topic

	const filtered = $derived(
		questions.filter(
			(question) =>
				(topicFilter === null || question.topic === topicFilter) && question.matches(query)
		)
	);

	/** Every topic with how many questions carry it, alphabetically. */
	const topicCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const question of questions) {
			if (question.topic === '') continue;
			counts[question.topic] = (counts[question.topic] ?? 0) + 1;
		}
		return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
	});

	const untagged = $derived(questions.filter((question) => question.topic === '').length);
	const topics = $derived(topicCounts.map(([topic]) => topic));

	function clearFilters() {
		query = '';
		topicFilter = null;
	}

	// Without JavaScript the page re-renders after a rejected submit, so we seed the
	// fields from what came back. With JavaScript the state already holds it.
	const returned = untrack(() => (form && 'question' in form ? form : null));
	let newTopic = $state(returned?.topic ?? '');
	let newQuestion = $state(returned?.question ?? '');
	let newAnswer = $state(returned?.answer ?? '');

	/** Clear the question and answer once saved, but keep the topic: you usually
	    enter several questions on the same subject in a row. */
	const onAdd: SubmitFunction = () => {
		return async ({ result, update }) => {
			// reset: false — a form reset would wipe the DOM behind the bound state's back.
			await update({ reset: false });
			if (result.type === 'success') {
				newQuestion = '';
				newAnswer = '';
			}
		};
	};
</script>

<header class="head">
	<h1>Questions</h1>

	{#if editingId === null && removingId === null}
		{#if adding}
			<a class="button ghost" href="/questions" data-sveltekit-noscroll>Close</a>
		{:else}
			<a class="button solid" href="?add" data-sveltekit-noscroll>+ Add question</a>
		{/if}
	{/if}
</header>

{#if adding && editingId === null}
	<form class="add" method="POST" action="?/add" use:enhance={onAdd}>
		{#if message}
			<p class="error">{message}</p>
		{/if}

		<label>
			<span>Topic <em>optional</em></span>
			<input name="topic" bind:value={newTopic} placeholder="e.g. Work preparation" />
		</label>

		{#if topics.length > 0}
			<!-- Chips instead of a <datalist>: a native autocomplete popup renders in the
			     wrong place inside embedded webviews such as VS Code's Simple Browser. -->
			<div class="chips">
				{#each topics as suggestion (suggestion)}
					<button type="button" class="chip" onclick={() => (newTopic = suggestion)}>
						{suggestion}
					</button>
				{/each}
			</div>
		{/if}

		<label>
			<span>Question</span>
			<textarea name="question" rows="2" required bind:value={newQuestion}></textarea>
		</label>

		<label>
			<span>Answer <em>one part per line</em></span>
			<textarea name="answer" rows="7" required bind:value={newAnswer}></textarea>
		</label>

		<button class="button solid">Add</button>
	</form>
{/if}

<section class="list">
	{#if questions.length === 0}
		<p class="empty">No questions yet. Use <strong>+ Add question</strong> to start.</p>
	{:else}
		<!-- Only worth showing once the list stops fitting on one screen. -->
		{#if questions.length > SEARCH_FROM}
			<input
				class="search"
				type="search"
				placeholder="Search questions and answers…"
				bind:value={query}
				aria-label="Search questions and answers"
			/>
		{/if}

		<div class="chips filters">
			<button
				type="button"
				class="chip"
				aria-pressed={topicFilter === null}
				onclick={() => (topicFilter = null)}
			>
				All <span class="tally">{questions.length}</span>
			</button>

			{#each topicCounts as [topic, count] (topic)}
				<button
					type="button"
					class="chip"
					aria-pressed={topicFilter === topic}
					onclick={() => (topicFilter = topic)}
				>
					{topic} <span class="tally">{count}</span>
				</button>
			{/each}

			{#if untagged > 0}
				<button
					type="button"
					class="chip"
					aria-pressed={topicFilter === ''}
					onclick={() => (topicFilter = '')}
				>
					No topic <span class="tally">{untagged}</span>
				</button>
			{/if}
		</div>

		<p class="meta">
			{#if filtered.length === questions.length}
				{questions.length} {questions.length === 1 ? 'question' : 'questions'}
			{:else}
				Showing {filtered.length} of {questions.length}
			{/if}
			<span class="where">one JSON object per line in <code>data/questions.jsonl</code></span>
		</p>

		{#if filtered.length === 0}
			<p class="empty">
				Nothing matches.
				<button type="button" class="link" onclick={clearFilters}>Clear search and filter</button>
			</p>
		{/if}

		{#each filtered as question (question.id)}
			<article class="row">
				{#if removingId === question.id}
					<div class="confirm">
						<p class="confirm-text">
							Delete this question? This cannot be undone.
							<span class="confirm-target">{question.question}</span>
						</p>

						<div class="confirm-actions">
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="id" value={question.id} />
								<button class="button danger">Delete</button>
							</form>
							<a class="cancel" href="/questions" data-sveltekit-noscroll>Cancel</a>
						</div>
					</div>
				{:else if editingId === question.id}
					<form class="editor" method="POST" action="?/update" use:enhance>
						<input type="hidden" name="id" value={question.id} />

						{#if editMessage}
							<p class="error">{editMessage}</p>
						{/if}

						<label>
							<span>Topic <em>optional</em></span>
							<input name="topic" value={question.topic} />
						</label>

						<label>
							<span>Question</span>
							<textarea name="question" rows="2" required value={question.question}></textarea>
						</label>

						<label>
							<span>Answer <em>one part per line</em></span>
							<textarea name="answer" rows="7" required value={question.answer}></textarea>
						</label>

						<div class="editor-actions">
							<button class="button solid">Save</button>
							<a class="cancel" href="/questions" data-sveltekit-noscroll>Cancel</a>
						</div>
					</form>
				{:else}
					<!-- <details> rather than our own open/closed state: it collapses without
					     JavaScript and is keyboard-operable out of the box. -->
					<details class="entry">
						<summary>
							<span class="summary-text">
								{#if question.topic}
									<span class="topic">{question.topic}</span>
								{/if}
								{question.question}
							</span>
							{#if question.isList}
								<span class="parts">{question.parts.length} parts</span>
							{/if}
						</summary>

						{#if question.isList}
							<ol>
								{#each question.parts as part, i (i)}
									<li>{part}</li>
								{/each}
							</ol>
						{:else}
							<p class="answer">{question.answer}</p>
						{/if}
					</details>

					<div class="row-actions">
						<a class="action" href="?edit={question.id}" data-sveltekit-noscroll>Edit</a>
						<!-- A link, not a submit: deleting now goes past a confirmation first. -->
						<a
							class="action danger"
							href="?remove={question.id}"
							aria-label="Remove this question"
							data-sveltekit-noscroll
						>
							&times;
						</a>
					</div>
				{/if}
			</article>
		{/each}
	{/if}
</section>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0;
	}

	/* --- forms --- */

	label {
		display: block;
		margin-bottom: 1rem;
	}

	label span {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		margin-bottom: 0.35rem;
	}

	label em {
		color: var(--muted);
		font-weight: 400;
	}

	input,
	textarea {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--rule);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
		resize: vertical;
	}

	input:focus,
	textarea:focus {
		outline: 2px solid var(--timber);
		outline-offset: 1px;
	}

	.error {
		color: var(--red);
		font-size: 0.9rem;
		margin: 0 0 1rem;
	}

	.add {
		border: 1px solid var(--rule);
		border-radius: 12px;
		padding: 1.25rem 1.25rem 0.25rem;
		margin-bottom: 2rem;
	}

	/* --- buttons and chips --- */

	.button {
		font: inherit;
		font-weight: 500;
		border-radius: 8px;
		border: 1px solid transparent;
		padding: 0.5rem 1.1rem;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
	}

	.solid {
		background: var(--timber);
		color: var(--paper);
	}

	.ghost {
		background: transparent;
		border-color: var(--rule);
		color: var(--muted);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: -0.5rem 0 1rem;
	}

	.filters {
		margin: 0.6rem 0 1rem;
	}

	.chip {
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: 999px;
		color: var(--muted);
		padding: 0.25rem 0.7rem;
		font-size: 0.8rem;
	}

	.chip:hover {
		color: var(--ink);
		border-color: var(--muted);
	}

	.chip[aria-pressed='true'] {
		background: var(--timber);
		border-color: var(--timber);
		color: var(--paper);
	}

	.chip .tally {
		opacity: 0.6;
		font-variant-numeric: tabular-nums;
	}

	.link {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--muted);
		text-decoration: underline;
		cursor: pointer;
	}

	/* --- the list --- */

	.search {
		font-size: 1rem;
	}

	.meta {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 0 0 0.5rem;
	}

	.where {
		display: block;
		font-size: 0.8rem;
		margin-top: 0.15rem;
	}

	code {
		font-size: 0.95em;
	}

	.empty {
		color: var(--muted);
		padding: 1.5rem 0;
	}

	.row {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		padding: 0.6rem 0;
		border-top: 1px solid var(--rule);
	}

	.entry {
		flex: 1;
		min-width: 0;
	}

	summary {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		cursor: pointer;
		list-style: none;
		padding: 0.15rem 0;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary::before {
		content: '▸';
		color: var(--muted);
		font-size: 0.75em;
		line-height: 1.6;
	}

	.entry[open] summary::before {
		content: '▾';
	}

	summary:hover .summary-text {
		color: var(--timber);
	}

	.summary-text {
		flex: 1;
		min-width: 0;
		font-weight: 500;
	}

	.topic {
		font-size: 0.7rem;
		color: var(--timber);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-right: 0.4rem;
		white-space: nowrap;
	}

	.parts {
		font-size: 0.75rem;
		color: var(--muted);
		white-space: nowrap;
	}

	.entry ol {
		margin: 0.4rem 0 0.6rem;
		padding-left: 2.6rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.entry li {
		margin-bottom: 0.2rem;
	}

	.answer {
		margin: 0.4rem 0 0.6rem 1.4rem;
		color: var(--muted);
		font-size: 0.9rem;
		white-space: pre-line;
	}

	/* --- row actions and editor --- */

	.row-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding-top: 0.15rem;
	}

	.action {
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--muted);
		text-decoration: none;
		border: 1px solid var(--rule);
		border-radius: 8px;
		padding: 0.2rem 0.6rem;
	}

	.action:hover {
		color: var(--timber);
		border-color: var(--timber);
	}

	.action.danger:hover {
		color: var(--red);
		border-color: var(--red);
	}

	.button.danger {
		background: var(--red);
		color: var(--paper);
	}

	.confirm {
		flex: 1;
		min-width: 0;
		border: 1px solid var(--red);
		border-radius: 10px;
		padding: 0.9rem 1rem;
		background: color-mix(in srgb, var(--paper) 92%, var(--red));
	}

	.confirm-text {
		margin: 0 0 0.85rem;
		font-size: 0.9rem;
		color: var(--muted);
	}

	.confirm-target {
		display: block;
		margin-top: 0.25rem;
		font-weight: 500;
		color: var(--ink);
	}

	.confirm-actions {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.editor {
		flex: 1;
		min-width: 0;
	}

	.editor-actions {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.cancel {
		font-size: 0.85rem;
		color: var(--muted);
	}
</style>
