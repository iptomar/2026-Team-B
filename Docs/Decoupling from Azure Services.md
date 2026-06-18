# Feasibility Study: Decoupling from Azure Services

This document explores the feasibility of abstracting our codebase from direct dependencies on Azure services (Azure Blob Storage and Azure Entra ID / SSO).

Currently, the backend has hardcoded dependencies on `@azure/storage-blob` and `@azure/msal-node`. Decoupling is highly feasible and can be achieved seamlessly by introducing **Service Wrappers** (the Strategy/Adapter design pattern). 

## Open Questions

> [!WARNING]
> Before we begin the implementation, please clarify:
> 1. Do you want to implement alternative providers (e.g., AWS S3, Local File Storage) immediately, or just put the wrappers in place and leave Azure as the active implementation for now?
> 2. For the authentication wrapper, should we consider abstracting it into generic OAuth2 flows (e.g., Google, GitHub), or just a generic SSO interface?

## Proposed Architecture: Service Wrappers

We will define standard interfaces for both Storage and Identity Provider services. The application will consume these interfaces via a centralized service locator or factory.

### 1. Storage Service Wrapper

Currently, `blobService.ts` exports direct Azure implementation details (e.g., using `Buffer`, Page Blobs, SAS Tokens). We will create a generic `IStorageService`.

#### [NEW] `BackEnd/services/storage/IStorageService.ts`
```typescript
export interface IStorageService {
    uploadFile(containerName: string, fileName: string, buffer: Buffer, contentType: string): Promise<string>;
    generateFileUrl(containerName: string, fileName: string, expiryMinutes?: number): string;
    deleteFile(containerName: string, fileName: string): Promise<void>;
}
```

#### [NEW] `BackEnd/services/storage/AzureStorageService.ts`
This will contain the existing code from `blobService.ts`, implementing `IStorageService`.

#### [NEW] `BackEnd/services/storage/StorageProvider.ts`
A factory or singleton that exports the active implementation based on environment variables (e.g., `STORAGE_PROVIDER=azure | local | s3`).

#### [MODIFY] Controllers (`authController.ts`, `bugReportController.ts`, `userController.ts`)
Update imports to use `StorageProvider.getInstance()` instead of directly calling `blobService`.

### 2. Identity Provider (SSO) Wrapper

`authController.ts` currently instantiates `@azure/msal-node`'s `ConfidentialClientApplication` directly. We will abstract this into an `IIdentityProvider`.

#### [NEW] `BackEnd/services/identity/IIdentityProvider.ts`
```typescript
export interface SSOUser {
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
}

export interface IIdentityProvider {
    getAuthUrl(): Promise<string>;
    handleCallback(code: string): Promise<SSOUser>;
}
```

#### [NEW] `BackEnd/services/identity/AzureIdentityProvider.ts`
This will encapsulate the existing MSAL MS Graph code.

#### [MODIFY] `BackEnd/controllers/authController.ts`
Remove direct references to `@azure/msal-node`. Instead, call:
```typescript
const identityProvider = IdentityProviderFactory.getProvider();
const url = await identityProvider.getAuthUrl();
```

## Summary of Feasibility

**Highly Feasible.**
The current codebase restricts Azure calls to a very small set of files (`blobService.ts` and `authController.ts`). 
- **Storage**: We just need to change the import references from `blobService` to a generic `StorageService`. The method signatures (`uploadBlob`, `generateSasUrl`, `deleteBlob`) translate perfectly to generic concepts.
- **SSO**: The Auth controller handles both local login and SSO. Pulling the Azure AD token validation out into an adapter will actually clean up `authController.ts` and make it easier to add Google/GitHub login in the future.

## Verification Plan

### Automated Tests
- TypeScript compilation (`npm run build:tsoa`) must succeed to ensure interfaces are strictly adhered to.

### Manual Verification
- Verify that standard file uploads (Avatars, Bug Reports) continue to work using the Azure wrapper.
- Verify that Azure SSO login still redirects and returns the correct user profile data.
