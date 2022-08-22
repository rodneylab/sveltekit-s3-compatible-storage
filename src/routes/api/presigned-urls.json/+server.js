import { presignedUrls } from '$lib/utilities/storage';

export async function POST({ request, setHeaders }) {
	const { key } = await request.json();

	try {
		const { readSignedUrl, writeSignedUrl } = await presignedUrls(key);

		setHeaders({
			'Content-Type': 'application/json',
		});

		return new Response(
			JSON.stringify({
				readSignedUrl,
				writeSignedUrl,
			}),
		);
	} catch (error) {
		const message = `Error in route api/presigned-urls.json: ${error}`;
		console.error(message);
		throw new Error(message);
	}
}
