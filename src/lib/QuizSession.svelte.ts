import { Question } from '$lib/Question';

/** One quiz run: which question you see and how you grade yourself. */
export class QuizSession {
	questions = $state<Question[]>([]);
	position = $state(0);
	answerVisible = $state(false);
	correct = $state(0);
	incorrect = $state(0);

	constructor(questions: Question[]) {
		this.questions = QuizSession.shuffle(questions);
	}

	get current(): Question | undefined {
		return this.questions[this.position];
	}

	get total(): number {
		return this.questions.length;
	}

	get number(): number {
		return Math.min(this.position + 1, this.total);
	}

	get finished(): boolean {
		return this.position >= this.total;
	}

	get percentage(): number {
		if (this.total === 0) return 0;
		return Math.round((this.correct / this.total) * 100);
	}

	reveal = () => {
		this.answerVisible = true;
	};

	/** Grade yourself and move straight on to the next question. */
	grade = (wasCorrect: boolean) => {
		if (wasCorrect) this.correct++;
		else this.incorrect++;
		this.position++;
		this.answerVisible = false;
	};

	restart = () => {
		this.questions = QuizSession.shuffle(this.questions);
		this.position = 0;
		this.answerVisible = false;
		this.correct = 0;
		this.incorrect = 0;
	};

	/** Fisher-Yates, so you don't get the same order every time. */
	static shuffle(questions: Question[]): Question[] {
		const copy = [...questions];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}
}
