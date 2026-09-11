import { fail, redirect } from '@sveltejs/kit';
import { Deck } from '$lib/server/deck';
import { ImageRejected, ImageStore } from '$lib/server/images';
import { Question } from '$lib/Question';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const questions = await Deck.all();
	return { questions: questions.map((question) => question.toJSON()) };
};

/** Writes the newly pasted or picked files. Throws ImageRejected for a bad one. */
async function saveUploads(form: FormData): Promise<string[]> {
	const saved: string[] = [];

	for (const entry of form.getAll('images')) {
		// An untouched file input still submits one empty entry.
		if (entry instanceof File && entry.size > 0) saved.push(await ImageStore.save(entry));
	}

	return saved;
}

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const question = String(form.get('question') ?? '').trim();
		const answer = String(form.get('answer') ?? '').trim();
		const topic = String(form.get('topic') ?? '').trim();

		if (question === '' || answer === '') {
			return fail(400, {
				question,
				answer,
				topic,
				message: 'Fill in both a question and an answer.'
			});
		}

		let images: string[];
		try {
			images = await saveUploads(form);
		} catch (problem) {
			if (problem instanceof ImageRejected) {
				return fail(400, { question, answer, topic, message: problem.message });
			}
			throw problem;
		}

		await Deck.add(Question.create(question, answer, topic, images));
		return { added: true };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const question = String(form.get('question') ?? '').trim();
		const answer = String(form.get('answer') ?? '').trim();
		const topic = String(form.get('topic') ?? '').trim();

		// A separate key from `add`, so the message lands on the right form.
		if (question === '' || answer === '') {
			return fail(400, { editMessage: 'Fill in both a question and an answer.' });
		}

		const current = await Deck.find(id);
		if (current === null) {
			return fail(404, { editMessage: 'That question no longer exists.' });
		}

		// Only names that really belong to this question survive the round trip.
		const keep = form
			.getAll('keep')
			.map(String)
			.filter((name) => current.images.includes(name));

		let uploaded: string[];
		try {
			uploaded = await saveUploads(form);
		} catch (problem) {
			if (problem instanceof ImageRejected) return fail(400, { editMessage: problem.message });
			throw problem;
		}

		const images = [...keep, ...uploaded];
		await Deck.update(id, question, answer, topic, images);

		// Whatever the user took off the question has nothing pointing at it any more.
		for (const name of current.images) {
			if (!images.includes(name)) await ImageStore.remove(name);
		}

		// Drops the ?edit parameter, which closes the editor.
		redirect(303, '/questions');
	},

	remove: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		if (id === '') return fail(400, { message: 'Unknown question.' });

		await Deck.remove(id);

		// Drops the ?remove parameter, which closes the confirmation.
		redirect(303, '/questions');
	}
};
