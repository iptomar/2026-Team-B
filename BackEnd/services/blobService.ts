import {
	BlobServiceClient,
	StorageSharedKeyCredential,
	generateBlobSASQueryParameters,
	BlobSASPermissions,
	ContainerClient,
} from '@azure/storage-blob';

// ─── Configuration ────────────────────────────────────────────────────────────

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
	console.warn('[BlobService] AZURE_STORAGE_CONNECTION_STRING is not set — file uploads will fail.');
}

const blobServiceClient = connectionString
	? BlobServiceClient.fromConnectionString(connectionString)
	: (null as unknown as BlobServiceClient);

// Parse account name + key from the connection string for SAS generation
function parseConnectionString(cs: string): { accountName: string; accountKey: string; } {
	const parts = cs.split(';').reduce((acc: Record<string, string>, part) => {
		const [key, ...rest] = part.split('=');
		acc[key] = rest.join('=');
		return acc;
	}, {});
	return {
		accountName: parts['AccountName'] || '',
		accountKey: parts['AccountKey'] || '',
	};
}

const { accountName, accountKey } = connectionString
	? parseConnectionString(connectionString)
	: { accountName: '', accountKey: '' };

const sharedKeyCredential = accountName && accountKey
	? new StorageSharedKeyCredential(accountName, accountKey)
	: null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ensure the target container exists (creates it if needed).
 * Called once on first upload; idempotent.
 */
const ensuredContainers = new Set<string>();

async function ensureContainer(containerName: string): Promise<ContainerClient> {
	const containerClient = blobServiceClient.getContainerClient(containerName);
	if (!ensuredContainers.has(containerName)) {
		await containerClient.createIfNotExists();
		ensuredContainers.add(containerName);
	}
	return containerClient;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to Azure Blob Storage using **Page Blobs**.
 * (Premium GPv2 accounts only support Page Blobs, not Block or Append Blobs.)
 *
 * Page Blobs require the content size to be a multiple of 512 bytes.
 * We pad the buffer with null bytes if needed.
 */
export async function uploadBlob(
	containerName: string,
	blobName: string,
	buffer: Buffer,
	contentType: string,
): Promise<string> {
	const containerClient = await ensureContainer(containerName);
	const pageBlobClient = containerClient.getPageBlobClient(blobName);

	// Page Blobs require the size to be a multiple of 512 bytes.
	const originalSize = buffer.length;
	const paddingNeeded = (512 - (originalSize % 512)) % 512;
	const paddedSize = originalSize + paddingNeeded;

	let paddedBuffer = buffer;
	if (paddingNeeded > 0) {
		paddedBuffer = Buffer.alloc(paddedSize); // automatically initialized to 0 (null bytes)
		buffer.copy(paddedBuffer);
	}

	// Create the page blob with the required total size
	await pageBlobClient.create(paddedSize, {
		blobHTTPHeaders: { blobContentType: contentType },
	});

	// Upload the pages in ≤ 4 MB chunks (must be multiple of 512)
	const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB
	let offset = 0;
	while (offset < paddedBuffer.length) {
		const end = Math.min(offset + CHUNK_SIZE, paddedBuffer.length);
		const length = end - offset;
		await pageBlobClient.uploadPages(paddedBuffer.subarray(offset, end), offset, length);
		offset = end;
	}

	return blobName;
}

/**
 * Generate a time-limited, read-only SAS URL for a blob.
 * The client can use this URL to download the file directly from Azure.
 */
export function generateSasUrl(
	containerName: string,
	blobName: string,
	expiryMinutes: number = 15,
): string {
	if (!sharedKeyCredential) {
		throw new Error('Azure Storage credentials are not configured');
	}

	const startsOn = new Date();
	startsOn.setMinutes(startsOn.getMinutes() - 5); // 5-min clock-skew buffer

	const expiresOn = new Date();
	expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);

	const sasToken = generateBlobSASQueryParameters(
		{
			containerName,
			blobName,
			permissions: BlobSASPermissions.parse('r'), // read-only
			startsOn,
			expiresOn,
		},
		sharedKeyCredential,
	).toString();

	return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
}

/**
 * Delete a blob from Azure Blob Storage.
 */
export async function deleteBlob(
	containerName: string,
	blobName: string,
): Promise<void> {
	const containerClient = await ensureContainer(containerName);
	const blobClient = containerClient.getBlobClient(blobName);
	await blobClient.deleteIfExists();
}
