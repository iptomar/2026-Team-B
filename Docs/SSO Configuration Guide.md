# Microsoft Entra ID (Azure SSO) Configuration Guide

This document outlines the steps required to configure SSO for the application using Microsoft Azure, including local/production routing and custom domain binding for `@bgpform.com` email routing.

## Prerequisites
- An active Microsoft Azure account.
- Access to Microsoft Entra ID with administrative privileges.
- Access to the Squarespace DNS management console for `bgpform.com`.

---

## Step 1: Register the Application
1. Log in to the [Azure Portal](https://portal.azure.com).
2. Navigate to **Microsoft Entra ID**.
3. In the left-hand menu, select **App registrations**, then click **New registration**.
4. Configure the following:
   - **Name**: Enter the application name.
   - **Supported account types**: Select **Accounts in this organizational directory only (Single tenant)**. This restricts access strictly to users inside your specific identity tenant and blocks external Microsoft accounts.
   - **Redirect URI**: 
     - Select **Web** from the platform dropdown. (Do not select Single-page application, as Express.js handles the token exchange).
     - Enter the local development URL: `http://localhost:8000/auth/azure/callback`.
5. Click **Register**.

## Step 2: Add Production Redirect URI
Azure supports multiple Redirect URIs simultaneously, allowing the same App Registration to handle local testing and live deployment.
1. Once the application is registered, click on **Authentication** in the left-hand menu.
2. Under the **Web** platform section, locate the localhost URI added in Step 1.
3. Click **Add URI** directly underneath it.
4. Enter the production URL: `https://bgpform.com/auth/azure/callback`.
5. Click **Save** at the bottom/top of the screen.

## Step 3: Gather Core Identifiers
From the application **Overview** page, copy and record the following configuration keys:
- **Application (client) ID**
- **Directory (tenant) ID**

## Step 4: Generate a Client Secret
1. In the left-hand menu of the App Registration, select **Certificates & secrets**.
2. Under the **Client secrets** tab, click **New client secret**.
3. Provide a description (e.g., `bgpform-backend-secret`) and select an expiration period.
4. Click **Add**.
5. **Critical:** Copy the string in the **Value** column immediately. It will be permanently masked after navigating away from this screen.

## Step 5: Configure Token Claims & Permissions
To guarantee the identity token contains the user's email address for account linking:
1. Select **Token configuration** in the left menu.
2. Click **Add optional claim**.
3. Select **ID** as the token type.
4. Check the `email` claim box from the list and click **Add**.
5. A prompt will appear stating the claim requires Microsoft Graph permissions. Check the box **Turn on the Microsoft Graph email permission** and click **Add**.

## Step 6: Grant Admin Consent
1. Navigate to **API permissions**.
2. Verify that both `User.Read` and `email` are listed under Microsoft Graph.
3. Click **Grant admin consent for [Tenant Name]** to authorize these permissions globally across your tenant.

---

## Step 7 (Optional): Bind Custom Email Domain (`bgpform.com`)
To allow users to log in with identity addresses matching `user@bgpform.com`, verify the domain inside the Entra ID tenant.

### Part A: Add Domain to Azure
1. In the **Microsoft Entra ID** main menu, scroll to **Custom domain names**.
2. Click **Add custom domain**.
3. Enter `bgpform.com` and click **Add domain**.
4. Azure will display a set of DNS records. Copy the **TXT record** details:
   - **Alias or host name**: `@` or leave empty
   - **Destination or points to address**: `MS=msXXXXXXXX`

### Part B: Configure Squarespace DNS
1. Log in to your **Squarespace Account** and navigate to the **DNS Settings** panel for `bgpform.com`.
2. Click **Add Record** and configure the fields as follows:
   - **Type**: `TXT`
   - **Name**: `@`
   - **TTL**: `1 hrs` (or default)
   - **Text**: *Paste the `MS=msXXXXXXXX` string copied from Azure*
3. Click **Save**.

### Part C: Complete Verification
1. Return to the **Custom domain names** tab in the Azure Portal.
2. Click **Verify**. (DNS propagation may take up to 10-15 minutes).
3. Once verified, user login identifiers (User Principal Names) within this tenant can be updated to use the `@bgpform.com` suffix.

---

## Required Environment Variables
Update the backend `.env` file configuration with the following keys:

```env
AZURE_TENANT_ID=your_directory_tenant_id
AZURE_CLIENT_ID=your_application_client_id
AZURE_CLIENT_SECRET=your_client_secret_value
# Toggle this value between http://localhost:8000/auth/azure/callback and [https://bgpform.com/auth/azure/callback](https://bgpform.com/auth/azure/callback) depending on environment
AZURE_REDIRECT_URI=http://localhost:8000/auth/azure/callback
