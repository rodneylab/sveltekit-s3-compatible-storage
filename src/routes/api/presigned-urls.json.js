import { presignedUrls } from '$lib/utilities/storage';

export async function post({ request }) {
  const { key } = await request.json();

  try {
    const { readSignedUrl, writeSignedUrl } = await presignedUrls(key);

    return {
      body: JSON.stringify({ readSignedUrl, writeSignedUrl }),
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error(`Error in route api/presigned-urls.json: ${error}`);
  }
}
