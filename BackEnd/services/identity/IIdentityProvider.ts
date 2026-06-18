export interface SSOUser {
	email: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	claims?: any;
}

export interface IIdentityProvider {
	getAuthUrl(redirectUri: string): Promise<string>;
	handleCallback(code: string, redirectUri: string): Promise<SSOUser>;
}
