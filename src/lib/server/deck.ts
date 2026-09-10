import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Question } from '$lib/Question';

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

	/** Removal can't be done by appending, so we rewrite the file. */
	static async remove(id: string): Promise<void> {
		const remaining = await Deck.all();
		const lines = remaining
			.filter((question) => question.id !== id)
			.reverse() // back to oldest-first: the order as stored in the file
			.map((question) => question.toLine())
			.join('');

		await mkdir(dirname(FILE), { recursive: true });
		await writeFile(FILE, lines, 'utf8');
	}
}
