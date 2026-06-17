import { IIdentityProvider } from './IIdentityProvider.js';
import { AzureIdentityProvider } from './AzureIdentityProvider.js';

export class IdentityProviderFactory {
	private static instance: IIdentityProvider;

	public static getProvider(): IIdentityProvider {
		if (!IdentityProviderFactory.instance) {
			const providerType = process.env.SSO_PROVIDER || 'azure';
			
			switch (providerType.toLowerCase()) {
				case 'azure':
					IdentityProviderFactory.instance = new AzureIdentityProvider();
					break;
				default:
					console.warn(`[IdentityProviderFactory] Unknown provider '${providerType}', falling back to Azure.`);
					IdentityProviderFactory.instance = new AzureIdentityProvider();
					break;
			}
		}
		return IdentityProviderFactory.instance;
	}
}
