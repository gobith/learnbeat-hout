import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Pasted and uploaded images live next to the questions, so one folder is the whole deck. */
const DIR = join(process.cwd(), 'data', 'images');

/** What we accept, and the extension we store it under. */
const EXTENSIONS: Record<string, string> = {
	'image/png': '.png',
	'image/jpeg': '.jpg',
	'image/gif': '.gif',
	'image/webp': '.webp'
};

const CONTENT_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp'
};

const MAX_BYTES = 5 * 1024 * 1024;

/** Thrown for a file we refuse; the message is shown to the user as-is. */
export class ImageRejected extends Error {}

/** The images on disk. Server-only. */
export class ImageStore {
	/** Stored names are a uuid plus extension — which also rules out path traversal. */
	static isSafeName(name: string): boolean {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|gif|webp)$/.test(
			name
		);
	}

	/** Writes one upload and returns the name to store on the question. */
	static async save(file: File): Promise<string> {
		const extension = EXTENSIONS[file.type];
		if (extension === undefined) {
			throw new ImageRejected(`${file.type || 'That file'} is not a PNG, JPEG, GIF or WebP.`);
		}
		if (file.size > MAX_BYTES) {
			throw new ImageRejected(
				`Images must be 5 MB or smaller (this one is ${Math.round(file.size / 1024 / 1024)} MB).`
			);
		}

		const name = crypto.randomUUID() + extension;
		await mkdir(DIR, { recursive: true });
		await writeFile(join(DIR, name), new Uint8Array(await file.arrayBuffer()));
		return name;
	}

	/** Bytes plus content type, or null when the name is unknown or unsafe. */
	static async read(name: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
		if (!ImageStore.isSafeName(name)) return null;

		try {
			const buffer = await readFile(join(DIR, name));

			// Copied into a plain ArrayBuffer: a Node Buffer may be a view onto a
			// shared one, which is not what a Response body accepts.
			const bytes = new ArrayBuffer(buffer.byteLength);
			new Uint8Array(bytes).set(buffer);

			return { bytes, type: CONTENT_TYPES[name.split('.').pop() ?? ''] };
		} catch {
			return null;
		}
	}

	/** Deletes one image. A name that is already gone is not an error. */
	static async remove(name: string): Promise<void> {
		if (!ImageStore.isSafeName(name)) return;

		try {
			await unlink(join(DIR, name));
		} catch {
			// already gone
		}
	}
}
