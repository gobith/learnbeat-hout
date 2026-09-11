/** How a question is stored on a single line of the JSONL file. */
export interface QuestionJSON {
	id: string;
	topic: string;
	question: string;
	answer: string;
	created: string;
	/** Absent on text-only questions, to keep the JSONL readable. */
	images?: string[];
}

/** A single question with its answer. */
export class Question {
	readonly id: string;
	readonly topic: string;
	readonly question: string;
	readonly answer: string;
	readonly created: Date;
	readonly images: string[];

	constructor(data: QuestionJSON) {
		this.id = data.id;
		this.topic = data.topic;
		this.question = data.question;
		this.answer = data.answer;
		this.created = new Date(data.created);
		this.images = data.images ?? [];
	}

	/** Creates a new question with a fresh id and timestamp. */
	static create(question: string, answer: string, topic = '', images: string[] = []): Question {
		return new Question({
			id: crypto.randomUUID(),
			topic: topic.trim(),
			question: question.trim(),
			answer: answer.trim(),
			created: new Date().toISOString(),
			images
		});
	}

	/** Reads one line from the JSONL file back into a Question. */
	static fromLine(line: string): Question {
		return new Question(JSON.parse(line) as QuestionJSON);
	}

	/** The answer split into separate points, blank lines dropped. */
	get parts(): string[] {
		return this.answer
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	}

	/** More than one point? Then we render the answer as a list. */
	get isList(): boolean {
		return this.parts.length > 1;
	}

	get hasImages(): boolean {
		return this.images.length > 0;
	}

	/** Case-insensitive match against topic, question and answer at once. */
	matches(needle: string): boolean {
		const trimmed = needle.trim().toLowerCase();
		if (trimmed === '') return true;

		return `${this.topic}\n${this.question}\n${this.answer}`.toLowerCase().includes(trimmed);
	}

	/** A copy with new content, keeping the original id and creation time. */
	withContent(question: string, answer: string, topic: string, images: string[]): Question {
		return new Question({
			...this.toJSON(),
			topic: topic.trim(),
			question: question.trim(),
			answer: answer.trim(),
			images
		});
	}

	toJSON(): QuestionJSON {
		const json: QuestionJSON = {
			id: this.id,
			topic: this.topic,
			question: this.question,
			answer: this.answer,
			created: this.created.toISOString()
		};

		// Left out entirely when there are none, so text-only lines stay short.
		if (this.images.length > 0) json.images = this.images;

		return json;
	}

	/** One line for the JSONL file, newline included. */
	toLine(): string {
		return JSON.stringify(this.toJSON()) + '\n';
	}
}
