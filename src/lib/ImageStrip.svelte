<script lang="ts">
	import { untrack } from 'svelte';

	interface Props {
		/** Images already stored on this question. Empty when adding a new one. */
		existing?: string[];
	}

	interface Pending {
		file: File;
		url: string;
	}

	let { existing = [] }: Props = $props();

	// Seeded once on purpose: the add form remounts this after a save, and every
	// editor mounts its own copy, so there is nothing to keep in sync afterwards.
	let kept = $state(untrack(() => [...existing]));
	let pending = $state<Pending[]>([]);

	const total = $derived(kept.length + pending.length);

	function add(files: File[]) {
		for (const file of files) {
			if (!file.type.startsWith('image/')) continue;
			pending.push({ file, url: URL.createObjectURL(file) });
		}
	}

	function dropKept(name: string) {
		kept = kept.filter((item) => item !== name);
	}

	function dropPending(index: number) {
		URL.revokeObjectURL(pending[index].url);
		pending.splice(index, 1);
	}

	function onPick(event: Event & { currentTarget: HTMLInputElement }) {
		add([...(event.currentTarget.files ?? [])]);
		// Clearing it means picking the same file twice still fires a change.
		event.currentTarget.value = '';
	}

	function onDrop(event: DragEvent) {
		const files = [...(event.dataTransfer?.files ?? [])];
		if (files.length === 0) return;

		event.preventDefault();
		add(files);
	}

	/** Pasting an image anywhere in this form lands here — the answer box included. */
	function catchPaste(node: HTMLElement) {
		const form = node.closest('form');
		if (form === null) return;

		function onPaste(event: ClipboardEvent) {
			const files = [...(event.clipboardData?.files ?? [])].filter((file) =>
				file.type.startsWith('image/')
			);
			if (files.length === 0) return;

			// Stop the browser from also dropping a copy into the textarea.
			event.preventDefault();
			add(files);
		}

		form.addEventListener('paste', onPaste);
		return () => form.removeEventListener('paste', onPaste);
	}

	/** Mirrors the pending files into the file input the form actually submits. */
	function carry(node: HTMLInputElement) {
		$effect(() => {
			const transfer = new DataTransfer();
			for (const image of pending) transfer.items.add(image.file);
			node.files = transfer.files;
		});
	}

	$effect(() => {
		return () => {
			for (const image of pending) URL.revokeObjectURL(image.url);
		};
	});
</script>

<div
	class="strip"
	role="group"
	aria-label="Images for this answer"
	ondragover={(event) => event.preventDefault()}
	ondrop={onDrop}
	{@attach catchPaste}
>
	<!-- New files ride along in this input; images already stored travel as their names. -->
	<input class="hidden" type="file" name="images" multiple accept="image/*" {@attach carry} />
	{#each kept as name (name)}
		<input type="hidden" name="keep" value={name} />
	{/each}

	{#if total > 0}
		<ul class="thumbs">
			{#each kept as name (name)}
				<li>
					<img src="/images/{name}" alt="" />
					<button type="button" onclick={() => dropKept(name)} aria-label="Remove this image">
						&times;
					</button>
				</li>
			{/each}

			{#each pending as image, index (image.url)}
				<li>
					<img src={image.url} alt="" />
					<button type="button" onclick={() => dropPending(index)} aria-label="Remove this image">
						&times;
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="hint">
		<label class="picker">
			Add image
			<input class="hidden" type="file" accept="image/*" multiple onchange={onPick} />
		</label>
		or paste with <kbd>Ctrl</kbd>+<kbd>V</kbd>, or drop one here
	</p>
</div>

<style>
	.strip {
		margin: -0.5rem 0 1rem;
	}

	.hidden {
		display: none;
	}

	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
		margin: 0 0 0.6rem;
		padding: 0;
	}

	.thumbs li {
		position: relative;
	}

	.thumbs img {
		display: block;
		width: 96px;
		height: 96px;
		object-fit: cover;
		border: 1px solid var(--rule);
		border-radius: 8px;
		background: var(--paper);
	}

	.thumbs button {
		position: absolute;
		top: -0.4rem;
		right: -0.4rem;
		width: 1.4rem;
		height: 1.4rem;
		padding: 0;
		font: inherit;
		font-size: 0.9rem;
		line-height: 1;
		border: 1px solid var(--rule);
		border-radius: 999px;
		background: var(--paper);
		color: var(--muted);
		cursor: pointer;
	}

	.thumbs button:hover {
		border-color: var(--red);
		color: var(--red);
	}

	.hint {
		margin: 0;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.picker {
		display: inline-block;
		margin: 0 0.2rem 0 0;
		padding: 0.2rem 0.6rem;
		border: 1px solid var(--rule);
		border-radius: 999px;
		color: var(--muted);
		cursor: pointer;
	}

	.picker:hover {
		color: var(--timber);
		border-color: var(--timber);
	}

	kbd {
		font: inherit;
		font-size: 0.9em;
		border: 1px solid var(--rule);
		border-radius: 4px;
		padding: 0 0.25rem;
	}
</style>
