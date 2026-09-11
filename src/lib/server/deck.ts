import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Question } from '$lib/Question';
import { ImageStore } from '$lib/server/images';

/** Every question lives in this JSONL file: one complete JSON object per line. */
const FILE = join(process.cwd(), 'data', 'questions.jsonl');

/** The collection of questions on disk. Server-only. */
export class Deck {
	/** All questions, newest first. A broken line is skipped. */
	static async all(): Promise<Question[]> {
		let contents: string;
		try {
			contents = await readFile(FILE, 'utf8');
		} catch (error) {
			// No file yet simply means: no questions yet.
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
			throw error;
		}

		const questions: Question[] = [];
		for (const line of contents.split('\n')) {
			if (line.trim().length === 0) continue;
			try {
				questions.push(Question.fromLine(line));
			} catch {
				// One corrupt line must not take down the whole deck.
			}
		}
		return questions.reverse();
	}

	/** Sticks one line onto the end of the file — the rest stays untouched. */
	static async add(question: Question): Promise<void> {
		await mkdir(dirname(FILE), { recursive: true });
		await appendFile(FILE, question.toLine(), 'utf8');
	}

	/** One question by id, or null when it is gone. */
	static async find(id: string): Promise<Question | null> {
		const all = await Deck.all();
		return all.find((question) => question.id === id) ?? null;
	}

	/** Replaces one question's content, keeping its place in the file. */
	static async update(
		id: string,
		question: string,
		answer: string,
		topic: string,
		images: string[]
	): Promise<boolean> {
		const all = await Deck.all();
		if (!all.some((item) => item.id === id)) return false;

		await Deck.write(
			all.map((item) => (item.id === id ? item.withContent(question, answer, topic, images) : item))
		);
		return true;
	}

	/** Removal can't be done by appending, so we rewrite the file. */
	static async remove(id: string): Promise<void> {
		const all = await Deck.all();
		const going = all.find((question) => question.id === id);

		await Deck.write(all.filter((question) => question.id !== id));

		// Its images now have nothing pointing at them.
		for (const name of going?.images ?? []) await ImageStore.remove(name);
	}

	/** Writes the whole deck back. Takes newest-first, as `all` returns it. */
	private static async write(questions: Question[]): Promise<void> {
		const lines = [...questions]
			.reverse() // back to oldest-first: the order as stored in the file
			.map((question) => question.toLine())
			.join('');

		await mkdir(dirname(FILE), { recursive: true });
		await writeFile(FILE, lines, 'utf8');
	}
}
