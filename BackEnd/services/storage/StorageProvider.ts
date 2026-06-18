import { IStorageService } from './IStorageService.js';
import { AzureStorageService } from './AzureStorageService.js';

export class StorageProvider {
	private static instance: IStorageService;

	public static getInstance(): IStorageService {
		if (!StorageProvider.instance) {
			const providerType = process.env.STORAGE_PROVIDER || 'azure';
			
			switch (providerType.toLowerCase()) {
				case 'azure':
					StorageProvider.instance = new AzureStorageService();
					break;
				default:
					console.warn(`[StorageProvider] Unknown provider '${providerType}', falling back to Azure.`);
					StorageProvider.instance = new AzureStorageService();
					break;
			}
		}
		return StorageProvider.instance;
	}
}
