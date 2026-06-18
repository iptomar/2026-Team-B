import {
	BlobServiceClient,
	StorageSharedKeyCredential,
	generateBlobSASQueryParameters,
	BlobSASPermissions,
	ContainerClient,
} from '@azure/storage-blob';
import { IStorageService } from './IStorageService.js';

export class AzureStorageService implements IStorageService {
	private connectionString: string | undefined;
	private blobServiceClient: BlobServiceClient;
	private accountName: string = '';
	private accountKey: string = '';
	private sharedKeyCredential: StorageSharedKeyCredential | null = null;
	private ensuredContainers = new Set<string>();

	constructor() {
		this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
		if (!this.connectionString) {
			console.warn('[AzureStorageService] AZURE_STORAGE_CONNECTION_STRING is not set — file uploads will fail.');
		}

		this.blobServiceClient = this.connectionString
			? BlobServiceClient.fromConnectionString(this.connectionString)
			: (null as unknown as BlobServiceClient);

		if (this.connectionString) {
			const { accountName, accountKey } = this.parseConnectionString(this.connectionString);
			this.accountName = accountName;
			this.accountKey = accountKey;
		}

		this.sharedKeyCredential = this.accountName && this.accountKey
			? new StorageSharedKeyCredential(this.accountName, this.accountKey)
			: null;
	}

	private parseConnectionString(cs: string): { accountName: string; accountKey: string; } {
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

	private async ensureContainer(containerName: string): Promise<ContainerClient> {
		const containerClient = this.blobServiceClient.getContainerClient(containerName);
		if (!this.ensuredContainers.has(containerName)) {
			await containerClient.createIfNotExists();
			this.ensuredContainers.add(containerName);
		}
		return containerClient;
	}

	public async uploadBlob(
		containerName: string,
		blobName: string,
		buffer: Buffer,
		contentType: string,
	): Promise<string> {
		const containerClient = await this.ensureContainer(containerName);
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

	public generateSasUrl(
		containerName: string,
		blobName: string,
		expiryMinutes: number = 15,
	): string {
		if (!this.sharedKeyCredential) {
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
			this.sharedKeyCredential,
		).toString();

		return `https://${this.accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
	}

	public async deleteBlob(
		containerName: string,
		blobName: string,
	): Promise<void> {
		const containerClient = await this.ensureContainer(containerName);
		const blobClient = containerClient.getBlobClient(blobName);
		await blobClient.deleteIfExists();
	}
}
