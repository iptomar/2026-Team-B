import { ConfidentialClientApplication } from '@azure/msal-node';
import { IIdentityProvider, SSOUser } from './IIdentityProvider.js';

export class AzureIdentityProvider implements IIdentityProvider {
	private msalClient: ConfidentialClientApplication;
	private clientId: string;
	private tenantId: string;
	private clientSecret: string;

	constructor() {
		this.clientId = process.env.AZURE_CLIENT_ID as string || '';
		this.tenantId = process.env.AZURE_TENANT_ID || 'common';
		this.clientSecret = process.env.AZURE_CLIENT_SECRET as string || '';

		const msalConfig = {
			auth: {
				clientId: this.clientId,
				authority: `https://login.microsoftonline.com/${this.tenantId}`,
				clientSecret: this.clientSecret,
			}
		};
		this.msalClient = new ConfidentialClientApplication(msalConfig);
	}

	public async getAuthUrl(redirectUri: string): Promise<string> {
		const authCodeUrlParameters = {
			scopes: ['user.read'],
			redirectUri,
		};
		return await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
	}

	public async handleCallback(code: string, redirectUri: string): Promise<SSOUser> {
		const tokenRequest = {
			code,
			scopes: ['user.read'],
			redirectUri,
		};

		const response = await this.msalClient.acquireTokenByCode(tokenRequest);
		
		if (!response || !response.account || !response.account.username) {
			throw new Error('Failed to retrieve user information from Azure AD');
		}

		return {
			email: response.account.username.toLowerCase(),
			username: response.account.username,
			claims: response.idTokenClaims || {}
		};
	}
}
