import { error } from '@sveltejs/kit';
import { ImageStore } from '$lib/server/images';
import type { RequestHandler } from './$types';

/** Serves images out of data/images, which sits outside the static folder. */
export const GET: RequestHandler = async ({ params }) => {
	const image = await ImageStore.read(params.name);
	if (image === null) error(404, 'No such image');

	return new Response(image.bytes, {
		headers: {
			'content-type': image.type,
			// Names are uuids, so a stored image never changes under the same name.
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
