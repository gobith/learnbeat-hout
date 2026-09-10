<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Question } from '$lib/Question';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const questions = $derived(data.questions.map((json) => new Question(json)));

	const topics = $derived(
		[...new Set(questions.map((question) => question.topic))].filter((topic) => topic !== '').sort()
	);

	const message = $derived(form && 'message' in form ? form.message : null);
	const editMessage = $derived(form && 'editMessage' in form ? form.editMessage : null);

	// Which row is open sits in the URL, so editing works without JavaScript too.
	const editingId = $derived(page.url.searchParams.get('edit'));

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

<h1>Questions</h1>

<!-- Hidden while a row is open, so there is never a second identical form on screen. -->
{#if editingId === null}
	<form method="POST" action="?/add" use:enhance={onAdd}>
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
			<div class="suggestions">
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

		<button class="primary">Add</button>
	</form>
{/if}

<section class="list" class:standalone={editingId !== null}>
	<h2>
		{questions.length} saved
		<span class="where">one JSON object per line in <code>data/questions.jsonl</code></span>
	</h2>

	{#each questions as question (question.id)}
		<article class="row">
			{#if editingId === question.id}
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
						<button class="primary">Save</button>
						<a class="cancel" href="/questions" data-sveltekit-noscroll>Cancel</a>
					</div>
				</form>
			{:else}
				<div class="body">
					{#if question.topic}
						<p class="topic">{question.topic}</p>
					{/if}
					<h3>{question.question}</h3>
					{#if question.isList}
						<ol>
							{#each question.parts as part, i (i)}
								<li>{part}</li>
							{/each}
						</ol>
					{:else}
						<p class="answer">{question.answer}</p>
					{/if}
				</div>

				<div class="row-actions">
					<a class="edit" href="?edit={question.id}" data-sveltekit-noscroll>Edit</a>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="id" value={question.id} />
						<button class="remove" aria-label="Remove this question">&times;</button>
					</form>
				</div>
			{/if}
		</article>
	{/each}
</section>

<style>
	h1 {
		font-size: 1.5rem;
		margin: 0 0 1.5rem;
	}

	form label {
		display: block;
		margin-bottom: 1rem;
	}

	form label span {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		margin-bottom: 0.35rem;
	}

	form label em {
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

	button {
		font-weight: 500;
		border-radius: 8px;
		border: 1px solid transparent;
	}

	.primary {
		background: var(--timber);
		color: var(--paper);
		padding: 0.65rem 1.5rem;
	}

	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: -0.5rem 0 1rem;
	}

	.chip {
		background: transparent;
		border-color: var(--rule);
		color: var(--muted);
		border-radius: 999px;
		padding: 0.25rem 0.7rem;
		font-size: 0.8rem;
	}

	.chip:hover {
		color: var(--ink);
		border-color: var(--muted);
	}

	.list {
		margin-top: 3rem;
		border-top: 1px solid var(--rule);
		padding-top: 1.5rem;
	}

	/* With the add form hidden there is nothing above to separate from. */
	.list.standalone {
		margin-top: 0;
		border-top: none;
		padding-top: 0;
	}

	.list h2 {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--muted);
		margin: 0 0 1rem;
	}

	.where {
		display: block;
		font-size: 0.8rem;
		font-weight: 400;
		margin-top: 0.2rem;
	}

	code {
		font-size: 0.95em;
	}

	.row {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		padding: 1rem 0;
		border-bottom: 1px solid var(--rule);
	}

	.body {
		flex: 1;
		min-width: 0;
	}

	.topic {
		font-size: 0.75rem;
		color: var(--timber);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0 0 0.3rem;
	}

	.row h3 {
		font-size: 1rem;
		margin: 0 0 0.5rem;
	}

	.row ol {
		margin: 0;
		padding-left: 1.3rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.answer {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
		white-space: pre-line;
	}

	.row-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.edit {
		font-size: 0.8rem;
		color: var(--muted);
		text-decoration: none;
		border: 1px solid var(--rule);
		border-radius: 8px;
		padding: 0.25rem 0.6rem;
	}

	.edit:hover {
		color: var(--timber);
		border-color: var(--timber);
	}

	.editor {
		flex: 1;
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

	.remove {
		background: transparent;
		border-color: var(--rule);
		color: var(--muted);
		font-size: 1.1rem;
		line-height: 1;
		padding: 0.25rem 0.55rem;
	}

	.remove:hover {
		border-color: var(--red);
		color: var(--red);
	}
</style>
