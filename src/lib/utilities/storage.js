import {
	S3_COMPATIBLE_ACCOUNT_AUTH_TOKEN,
	S3_COMPATIBLE_ACCOUNT_ID,
	S3_COMPATIBLE_BUCKET_NAME,
} from '$env/static/private';
import { GetObjectCommand, PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { createRequest } from '@aws-sdk/util-create-request';
import { formatUrl } from '@aws-sdk/util-format-url';
import { createId } from '@paralleldrive/cuid2';

async function authoriseAccount() {
	try {
		const authorisationToken = Buffer.from(
			`${S3_COMPATIBLE_ACCOUNT_ID}:${S3_COMPATIBLE_ACCOUNT_AUTH_TOKEN}`,
			'utf-8',
		).toString('base64');

		const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
			method: 'GET',
			headers: {
				Authorization: `Basic ${authorisationToken}`,
			},
		});
		const data = await response.json();
		const {
			absoluteMinimumPartSize,
			authorizationToken,
			apiUrl,
			downloadUrl,
			recommendedPartSize,
			s3ApiUrl,
		} = data;
		return {
			successful: true,
			absoluteMinimumPartSize,
			authorizationToken,
			apiUrl,
			downloadUrl,
			recommendedPartSize,
			s3ApiUrl,
		};
	} catch (error) {
		let message;
		if (error.response) {
			message = `Storage server responded with non 2xx code: ${error.response.data}`;
		} else if (error.request) {
			message = `No storage response received: ${error.request}`;
		} else {
			message = `Error setting up storage response: ${error.message}`;
		}
		return { successful: false, message };
	}
}

function getRegion(s3ApiUrl) {
	return s3ApiUrl.split('.')[1];
}

function getS3Client({ s3ApiUrl }) {
	const credentials = {
		accessKeyId: S3_COMPATIBLE_ACCOUNT_ID,
		secretAccessKey: S3_COMPATIBLE_ACCOUNT_AUTH_TOKEN,
		sessionToken: `session-${createId()}`,
	};

	const S3Client = new S3({
		endpoint: s3ApiUrl,
		region: getRegion(s3ApiUrl),
		credentials,
	});
	return S3Client;
}

async function generatePresignedUrls({ key, s3ApiUrl }) {
	const Bucket = S3_COMPATIBLE_BUCKET_NAME;
	const Key = key;
	const client = getS3Client({ s3ApiUrl });

	const signer = new S3RequestPresigner({ ...client.config });
	const readRequest = await createRequest(client, new GetObjectCommand({ Key, Bucket }));
	const readSignedUrl = formatUrl(await signer.presign(readRequest));
	const writeRequest = await createRequest(client, new PutObjectCommand({ Key, Bucket }));
	const writeSignedUrl = formatUrl(await signer.presign(writeRequest));
	return { readSignedUrl, writeSignedUrl };
}

export async function presignedUrls(key) {
	try {
		const { s3ApiUrl } = await authoriseAccount();
		const { readSignedUrl, writeSignedUrl } = await generatePresignedUrls({ key, s3ApiUrl });
		return { readSignedUrl, writeSignedUrl };
	} catch (error) {
		console.error(`Error generating presigned urls: ${error}`);
	}
}
