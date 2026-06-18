# Form & Approval Builder — IPT

A full-stack **Form Builder & Approval Workflow Engine** developed for the professors, staff and students of the **[Instituto Politécnico de Tomar (IPT)](https://www.ipt.pt/)**.

The platform enables staff to create dynamic form templates with a drag-and-drop builder, design multi-step approval flows with a visual node editor, submit forms, approve or deny them through a structured lifecycle, and monitor all submissions via an admin dashboard — all with role-based access control, i18n (5 languages), and a dark-mode UI.

## 🌐 Live Environment

**🔗 [https://bgpform.com](https://bgpform.com)** — hosted on Azure Web Apps with CI/CD via GitHub Actions.

---

## ✨ Features

### 🔐 Authentication & Security
- JWT-based login with access + refresh token rotation
- **Single Sign-On (SSO)**: Integrated enterprise SSO for streamlined authentication
- Password recovery via email (Nodemailer / Gmail SMTP)
- Change-password flow
- Role-based access control (RBAC) — roles managed dynamically in the database
- Soft-delete for users and roles
- Brute-force protection (login attempt tracking & account lockout)

### 👥 User & Role Management (Admin)
- Full CRUD for users
- Role creation, listing, and soft-deletion
- Assign multiple roles per user

### 🏗️ Form Template Builder
- Drag-and-drop interface with a palette of 12 field types (text, email, number, date, textarea, dropdown, radio, checkbox, file upload, headings, labels, dividers)
- Multi-column row layouts with configurable column spans and easy row addition by dragging a new element into empty space on the template canvas
- **Group Box Re-Use & Numeration**: Create, delete, and insert reusable template group boxes, complete with auto-numeration
- **Input Constraints & Form Labels**: Definition settings for inputs (max length, number range) and robust search-by-form functionality
- **Time Series / Quick Time Forms**: Support for start time/end time events (functions as a permanent form if nodes are defined)
- Row duplication, reordering, and deletion
- Per-template role-based submit permissions (`allowedSubmitRoles`)
- Template versioning — new versions supersede old ones; deprecated templates block new submissions
- Draft templates (save in-progress work, resume later via dedicated modal)
- Split-button dropdown: **Save Template** as primary, with ▼ revealing **Save as Draft**, **Load Draft**, **Import JSON**, **Export JSON**
- Live preview tab

### 🔀 Approval Flow Editor
- Visual node-based editor for designing multi-step approval workflows
- Built-in loop detection to prevent cyclic workflows (client and server-side validation)
- Nodes: **Start** (who can submit), **Approval** (roles + specific users, "any one" / "all must" modes), **End** (approved / denied outcome)
- Edge labels define conditional paths (approved, denied, forwarded)
- Flows are frozen into submission snapshots for auditability

### 📝 Form Submission & Urgency System
- Users browse and fill only forms they are authorised to submit
- Submitted data stored with full template snapshot (field definitions + submitted values) for auditability
- Automatic seeding of the approval engine upon submission
- **Urgency Flagging**: Users can mark requests as urgent, triggering specific fee flows and visual 🚨 indicators across dashboards

### 🔁 Submission Lifecycle, Approval Engine & Real-Time OCC
- State machine: `submitted` → `in_progress` → `approved` / `denied`
- **Optimistic Concurrency Control (OCC)**: Mitigates pending approval race conditions combining database states, real-time WebSocket updates, and HTTP 409 conflict responses
- **WebSocket Notifications**: Real-time notification bell alerts users of new pending approvals or stage changes
- Approvers see pending submissions on their **Pending Reviews** page, including assigned roles, specific users, and **Unit/department user aggregation/flagging**
- Actions: **Approve**, **Deny**, **Forward** (to a specific user or an entire role)
- Approval nodes support "any one" or "all must" modes with configurable required count
- Full audit trail visualized as a pipeline timeline showing completed, current, and pending steps
- **Reviewed Forms History**: Non-admin users can access a dedicated page to track their historical review activity

### 📊 Admin — Form Management Dashboard
- Paginated, filterable, sortable master list of all submissions across the system
- Filters: form type, status, submitter (name/email search), date range
- Multi-tier column sorting (click headers to stack sort conditions: Ascending → Descending → None)
- Click any row to view the full submission lifecycle detail
- Server-side pagination and filtering via MongoDB aggregation

### 📄 My Submissions
- Dedicated page listing all forms submitted by the logged-in user
- Status badges per submission
- Read-only detail view rendering the complete form with submitted values and the pipeline timeline

### ⏳ Pending Reviews & Approvals
- Dedicated dashboard showing all forms awaiting the current user's action
- Shows template name, submitter, current step, assigned roles, and urgency status
- Action buttons for Approve / Deny / Forward with optional note
- Forward modal with user/role toggle
- Dedicated "Pending Urgent Approvals" stat card

### 🌍 Internationalisation & Security
- **133 Languages**: Massive translation support allowing global reach

### 🎨 Theming, UX & Platforms
- **Native Mobile App**: Dedicated React Native app for on-the-go access
- **Advanced App Theming**: Supports Light, Dark, and an auto-switch mode based on local regional sunrise/sunset times
- **Dynamic Backgrounds**: Enriched visual experience with dynamic backgrounds
- **Responsive Layouts**: Major web mobile viewport UI responsiveness improvements
- **User Guide Videos**: Embedded manual videos for user onboarding

### 🐛 Bug Reporting
- Users can submit bug reports with title, description, and optional screenshot
- Admin panel to browse and review all submitted bug reports, including the ability to **mark bug reports as resolved**

### ☁️ Cloud Service Decoupling & Storage
- **Dedicated Blob Storage**: Direct client access via SAS tokens for highly scalable file operations
- Abstracted cloud dependencies (`IStorageService`, `IIdentityProvider`), utilizing a generic `StorageProvider` for blob storage instead of direct Azure SDK calls to support multi-cloud/local deployments

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Vanilla CSS (custom properties) |
| Backend | Node.js, Express, TypeScript, TSOA (auto-generated routes & Swagger) |
| Database | MongoDB (Mongoose ODM) |
| API Docs | Swagger UI (auto-generated via TSOA) |
| Auth | JWT (access + refresh tokens, bcrypt) |
| Email | Nodemailer (Gmail SMTP) |
| Hosting | Azure Web App (Decoupled storage ready for Multi-Cloud) |
| CI/CD | GitHub Actions |

---

## 📂 Project Structure

```
├── BackEnd/               # Express API + Mongoose models
│   ├── config/            # MongoDB connection
│   ├── controllers/       # TSOA-decorated route handlers
│   ├── models/            # Mongoose schemas
│   ├── routes/            # Auto-generated TSOA routes
│   ├── services/          # Flow engine, email service
│   ├── scripts/           # DB migration scripts
│   ├── server.js          # Entry point
│   └── tsoa.json          # TSOA configuration
├── FrontEnd/              # React SPA
│   ├── src/
│   │   ├── components/    # FormBuilder, FlowEditor, Navbar
│   │   ├── pages/         # Dashboard, FillForm, PendingReviews, SubmissionView, AdminFormManagement, etc.
│   │   ├── contexts/      # LanguageContext, ThemeContext
│   │   ├── styles/        # Global theme variables (light + dark)
│   │   └── utils/         # Storage helpers
│   └── public/
├── templates/             # Example form template JSON files
├── tests/                 # Python integration tests
└── package.json           # Root scripts (install:all, dev, full)
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- `npm` (bundled with Node.js)
- MongoDB (local instance or MongoDB Atlas / Azure Cosmos DB connection string in `BackEnd/.env`)

---

## 🚀 Running Locally

### Quick Start (production mode)
```bash
npm run install:all
npm run full
```

### Development Mode (hot reload)
```bash
npm run install:all
npm run dev
```
Runs the FrontEnd on port 3000 and BackEnd on port 5000 concurrently.

### Separate Terminals
**BackEnd:**
```bash
cd BackEnd
npm run dev
```
**FrontEnd:**
```bash
cd FrontEnd
npm start
```

### Regenerate API Routes & Swagger Docs
After modifying controllers or interfaces in `BackEnd/controllers/`:
```bash
cd BackEnd
npm run build:tsoa
```

---

## ☁️ Deployment

CI/CD via **GitHub Actions**. On push to the release branch:
1. Installs all dependencies
2. Builds the React FrontEnd
3. Generates TSOA routes and Swagger docs
4. Deploys to Azure Web App

---

## 🔔 Notification System (Azure Cosmos DB)

If using Azure Cosmos DB for MongoDB, enable change streams:
```bash
az rest \
  --method patch \
  --url "https://management.azure.com/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.DocumentDB/mongoClusters/<cluster-name>?api-version=<version>" \
  --body '{"properties": {"previewFeatures": ["ChangeStreams"]}}'
```

---

*Built by Team B — IPT Group Project 2026*
