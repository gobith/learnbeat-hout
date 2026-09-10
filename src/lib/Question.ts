/** How a question is stored on a single line of the JSONL file. */
export interface QuestionJSON {
	id: string;
	topic: string;
	question: string;
	answer: string;
	created: string;
}

/** A single question with its answer. */
export class Question {
	readonly id: string;
	readonly topic: string;
	readonly question: string;
	readonly answer: string;
	readonly created: Date;

	constructor(data: QuestionJSON) {
		this.id = data.id;
		this.topic = data.topic;
		this.question = data.question;
		this.answer = data.answer;
		this.created = new Date(data.created);
	}

	/** Creates a new question with a fresh id and timestamp. */
	static create(question: string, answer: string, topic = ''): Question {
		return new Question({
			id: crypto.randomUUID(),
			topic: topic.trim(),
			question: question.trim(),
			answer: answer.trim(),
			created: new Date().toISOString()
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

	toJSON(): QuestionJSON {
		return {
			id: this.id,
			topic: this.topic,
			question: this.question,
			answer: this.answer,
			created: this.created.toISOString()
		};
	}

	/** One line for the JSONL file, newline included. */
	toLine(): string {
		return JSON.stringify(this.toJSON()) + '\n';
	}
}
