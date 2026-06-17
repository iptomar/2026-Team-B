export interface IStorageService {
	uploadBlob(
		containerName: string,
		blobName: string,
		buffer: Buffer,
		contentType: string
	): Promise<string>;

	generateSasUrl(
		containerName: string,
		blobName: string,
		expiryMinutes?: number
	): string;

	deleteBlob(
		containerName: string,
		blobName: string
	): Promise<void>;
}
