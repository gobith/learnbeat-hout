<script lang="ts">
	import { Question } from '$lib/Question';
	import { QuizSession } from '$lib/QuizSession.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The load function hands us plain JSON; here it becomes Question objects again.
	const allQuestions = $derived(data.questions.map((json) => new Question(json)));

	const topics = $derived(
		[...new Set(allQuestions.map((question) => question.topic))]
			.filter((topic) => topic !== '')
			.sort()
	);

	let chosenTopic = $state('');
	let session = $state<QuizSession | null>(null);

	const selection = $derived(
		chosenTopic === ''
			? allQuestions
			: allQuestions.filter((question) => question.topic === chosenTopic)
	);

	function start() {
		session = new QuizSession(selection);
	}

	function quit() {
		session = null;
	}

	/** Space reveals the answer, then 1 = correct and 2 = incorrect. */
	function onkeydown(event: KeyboardEvent) {
		if (session === null || session.finished) return;
		if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) {
			return;
		}

		if (!session.answerVisible && (event.key === ' ' || event.key === 'Enter')) {
			event.preventDefault();
			session.reveal();
		} else if (session.answerVisible && (event.key === '1' || event.key === '2')) {
			event.preventDefault();
			session.grade(event.key === '1');
		}
	}
</script>

<svelte:window {onkeydown} />

{#if session === null}
	<section class="panel">
		<h1>Quiz yourself</h1>

		{#if allQuestions.length === 0}
			<p class="empty">
				No questions yet. <a href="/questions">Add your first one.</a>
			</p>
		{:else}
			{#if topics.length > 0}
				<div class="filter">
					<p class="filter-label">Topic</p>
					<div class="chips">
						<button
							class="chip"
							aria-pressed={chosenTopic === ''}
							onclick={() => (chosenTopic = '')}
						>
							All
						</button>
						{#each topics as topic (topic)}
							<button
								class="chip"
								aria-pressed={chosenTopic === topic}
								onclick={() => (chosenTopic = topic)}
							>
								{topic}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<p class="count">
				{selection.length}
				{selection.length === 1 ? 'question' : 'questions'} ready
			</p>
			<button class="primary" onclick={start} disabled={selection.length === 0}>Start</button>
		{/if}
	</section>
{:else if session.finished}
	{@const run = session}
	<section class="panel">
		<h1>Done</h1>
		<p class="score">
			{run.correct} of {run.total} correct
			<span class="percentage">({run.percentage}%)</span>
		</p>
		<div class="buttons">
			<button class="primary" onclick={run.restart}>Another round</button>
			<button class="quiet" onclick={quit}>Back</button>
		</div>
	</section>
{:else}
	{@const run = session}
	{@const question = run.current}
	{#if question}
		<article class="card">
			<p class="progress">Question {run.number} of {run.total}</p>

			{#if question.topic}
				<p class="topic">{question.topic}</p>
			{/if}

			<h1 class="question">{question.question}</h1>

			{#if question.isList && !run.answerVisible}
				<p class="hint">The answer has {question.parts.length} parts.</p>
			{/if}

			{#if run.answerVisible}
				<div class="answer">
					{#if question.isList}
						<ol>
							{#each question.parts as part, i (i)}
								<li>{part}</li>
							{/each}
						</ol>
					{:else}
						<p>{question.answer}</p>
					{/if}
				</div>

				<div class="buttons">
					<button class="correct" onclick={() => run.grade(true)}>
						I knew it <kbd>1</kbd>
					</button>
					<button class="incorrect" onclick={() => run.grade(false)}>
						Not yet <kbd>2</kbd>
					</button>
				</div>
			{:else}
				<button class="primary" onclick={run.reveal}>
					Show answer <kbd>space</kbd>
				</button>
			{/if}

			<p class="tally">
				<span class="correct-tally">{run.correct} correct</span> ·
				<span class="incorrect-tally">{run.incorrect} to review</span> ·
				<button class="link" onclick={quit}>stop</button>
			</p>
		</article>
	{/if}
{/if}

<style>
	h1 {
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}

	.panel {
		text-align: center;
		padding: 2rem 0;
	}

	.filter {
		margin-bottom: 1.5rem;
	}

	.filter-label {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 0 0 0.5rem;
	}

	/* Deliberately not a <select>: a native dropdown popup renders in the
	   wrong place inside embedded webviews such as VS Code's Simple Browser. */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
	}

	.chip {
		background: transparent;
		border-color: var(--rule);
		color: var(--muted);
		border-radius: 999px;
		padding: 0.35rem 0.85rem;
		font-size: 0.85rem;
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

	.count {
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0 0 1.25rem;
	}

	.empty {
		color: var(--muted);
	}

	.empty a {
		color: var(--timber);
	}

	.score {
		font-size: 1.25rem;
		margin: 0 0 1.75rem;
	}

	.percentage {
		color: var(--muted);
	}

	.card {
		border: 1px solid var(--rule);
		border-radius: 12px;
		padding: 2rem;
		background: color-mix(in srgb, var(--paper) 92%, var(--ink));
	}

	.progress,
	.topic {
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.topic {
		color: var(--timber);
		margin-top: 0.35rem;
	}

	.question {
		font-size: 1.35rem;
		line-height: 1.35;
		margin: 0.85rem 0 1.25rem;
	}

	.hint {
		color: var(--muted);
		font-size: 0.9rem;
		font-style: italic;
		margin: 0 0 1.25rem;
	}

	.answer {
		border-top: 1px solid var(--rule);
		padding-top: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.answer ol {
		margin: 0;
		padding-left: 1.4rem;
	}

	.answer li {
		margin-bottom: 0.4rem;
	}

	.answer p {
		margin: 0;
	}

	.buttons {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	button {
		border-radius: 8px;
		padding: 0.65rem 1.25rem;
		border: 1px solid transparent;
		font-weight: 500;
	}

	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.primary {
		background: var(--timber);
		color: var(--paper);
	}

	.quiet {
		background: transparent;
		border-color: var(--rule);
		color: var(--muted);
	}

	.correct {
		background: var(--green);
		color: var(--paper);
	}

	.incorrect {
		background: transparent;
		border-color: var(--red);
		color: var(--red);
	}

	kbd {
		font: inherit;
		font-size: 0.75rem;
		opacity: 0.7;
		border: 1px solid currentColor;
		border-radius: 4px;
		padding: 0 0.3rem;
		margin-left: 0.3rem;
	}

	.tally {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 1.5rem 0 0;
		text-align: center;
	}

	.correct-tally {
		color: var(--green);
	}

	.incorrect-tally {
		color: var(--red);
	}

	.link {
		background: none;
		border: none;
		padding: 0;
		color: var(--muted);
		text-decoration: underline;
		font-size: inherit;
		font-weight: inherit;
	}
</style>
