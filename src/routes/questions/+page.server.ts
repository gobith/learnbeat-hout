import { fail } from '@sveltejs/kit';
import { Deck } from '$lib/server/deck';
import { Question } from '$lib/Question';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const questions = await Deck.all();
	return { questions: questions.map((question) => question.toJSON()) };
};

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

		await Deck.add(Question.create(question, answer, topic));
		return { added: true };
	},

	remove: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		if (id === '') return fail(400, { message: 'Unknown question.' });

		await Deck.remove(id);
		return { removed: true };
	}
};
