import { Deck } from '$lib/server/deck';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const questions = await Deck.all();

	// Class instances don't survive the trip to the browser, so we send plain JSON.
	return { questions: questions.map((question) => question.toJSON()) };
};
