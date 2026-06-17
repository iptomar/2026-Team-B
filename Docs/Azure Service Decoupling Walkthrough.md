# Azure Service Decoupling Walkthrough

I have successfully abstracted the direct dependencies on Azure Blob Storage and Azure Entra ID (SSO) by implementing service wrappers using the Strategy pattern. The application is now cloud-agnostic at the controller level and relies entirely on provider interfaces.

## Architectural Changes

### 1. Storage Service Wrappers
We created an `IStorageService` interface to define the standard file storage operations (`uploadBlob`, `generateSasUrl`, `deleteBlob`).

- **New Files**:
  - `BackEnd/services/storage/IStorageService.ts`: Standardizes storage operations.
  - `BackEnd/services/storage/AzureStorageService.ts`: The concrete implementation encapsulating `@azure/storage-blob`.
  - `BackEnd/services/storage/StorageProvider.ts`: A factory class that instantiates the correct provider based on the `STORAGE_PROVIDER` environment variable (currently defaults to `azure`).

- **Refactored Code**:
  Replaced all direct imports of `blobService.js` with `StorageProvider.getInstance()` in:
  - `BackEnd/server.js`
  - `BackEnd/controllers/userController.ts`
  - `BackEnd/controllers/bugReportController.ts`
  - `BackEnd/controllers/authController.ts`
  - `BackEnd/scripts/migrateAvatars.ts`

### 2. Identity Provider Wrappers
We created an `IIdentityProvider` interface to handle OAuth2/SSO workflows, specifically the URL generation and callback token extraction.

- **New Files**:
  - `BackEnd/services/identity/IIdentityProvider.ts`: Standardizes identity provider operations.
  - `BackEnd/services/identity/AzureIdentityProvider.ts`: Encapsulates the MSAL configuration and `@azure/msal-node` token validation logic.
  - `BackEnd/services/identity/IdentityProviderFactory.ts`: A factory class to manage the active Identity Provider based on the `SSO_PROVIDER` environment variable.

- **Refactored Code**:
  - Modified `BackEnd/controllers/authController.ts` to utilize the `IdentityProviderFactory` for standardizing Microsoft Entra ID logins, making the controller cleaner and ready for additional SSO providers (like Google or GitHub).

## Validation

- Successfully ran `npm run build:tsoa` to regenerate Swagger specifications and ensure full TypeScript compilation compliance across the backend API.
- All dependencies on `@azure` packages are now strictly isolated within the `AzureStorageService.ts` and `AzureIdentityProvider.ts` files, making it easy to swap them out in the future.
