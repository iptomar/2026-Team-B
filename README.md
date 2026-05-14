# Form & Approval Builder - IPT

This project is a custom **Form Builder & Approval Flow Editor** developed specifically for the professors and staff of the **Instituto Politécnico de Tomar (IPT)**.

It provides a drag-and-drop interface for constructing form templates, alongside a visual node-based editor for designing complex approval workflows (with support for role-based access control and specific user assignments).

## 🌐 Live Environment

The application is hosted and currently running live on Azure:  
**🔗 [https://bgp.azurewebsites.net](https://bgp.azurewebsites.net)**

---

## 📂 Project Structure

The repository is divided into two main parts:

- `/FrontEnd` - The React-based web application (Form Builder UI and Flow Editor UI).
- `/BackEnd` - The Node.js Express API, integrated with MongoDB via Mongoose, utilizing TSOA for route and Swagger documentation generation.

## 🛠️ Prerequisites

To run this project locally, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 20 or higher recommended)
- `npm` (usually bundled with Node.js)
- MongoDB (Running locally or a MongoDB Atlas connection string configured in your `.env` file)

## ⚙️ Installation

Open your terminal at the root of this repository and install the dependencies:

**Option 1: Quick Install**  
Install dependencies for both the root, FrontEnd, and BackEnd simultaneously:
```bash
npm run install:all
```

**Option 2: Manual Install**  
```bash
# Install Frontend dependencies
cd FrontEnd
npm install
cd ..

# Install Backend dependencies
cd BackEnd
npm install
cd ..
```

## 🚀 Running the Application Locally

The easiest and most complete way to run the application locally is by using the full build script. This command will build the frontend, move into the backend, and start the production-ready server (which serves the compiled frontend and the API simultaneously):

```bash
npm run full
```

### Development Mode (Hot Reloading)

To start the development environment with hot reloading (concurrently running the **FrontEnd** on port 3000 and the **BackEnd** on port 5000), run:

```bash
npm run dev
```

### Backend API Generation (TSOA)

The backend utilizes **TSOA** to automatically generate Express routes and Swagger documentation from TypeScript controllers. If you make changes to the `/controllers` or update API interfaces, you must regenerate the routes. 

Inside the `/BackEnd` directory, run:
```bash
npm run build:tsoa
```

### Running in Separate Terminals

If you prefer to run the environments in separate terminals for better logging:

**Terminal 1 (BackEnd):**
```bash
cd BackEnd
npm run dev
```

**Terminal 2 (FrontEnd):**
```bash
cd FrontEnd
npm start
```

---

## ☁️ Deployment

The application is configured for CI/CD via **GitHub Actions**.

Whenever code is pushed to the release branch, the GitHub Actions pipeline automatically triggers. This pipeline:
1. Installs all dependencies.
2. Builds the React FrontEnd.
3. Generates the TypeScript BackEnd routes and Swagger documentation.
4. Packages the application and deploys it directly to the Azure Web App service.

---

## 🔔 Notification System Configuration

The backend notification system requires MongoDB to be configured to allow change streams. For an Azure Cosmos DB for MongoDB cluster, run the following command in the Azure Cloud Shell:

```bash
az rest \
  --method patch \
  --url "https://management.azure.com/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.DocumentDB/mongoClusters/<cluster-name>?api-version=<version>" \
  --body '{"properties": {"previewFeatures": ["ChangeStreams"]}}'
```