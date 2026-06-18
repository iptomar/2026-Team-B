🎉 Version 2.0 — Submission Lifecycle, Admin Dashboard & i18n
----------------------------------------------------------------

The second major release of the **Form & Approval Builder** platform, developed for the professors and staff of **[Instituto Politécnico de Tomar (IPT)](https://www.ipt.pt/)**.

The application is live at **[https://bgp.azurewebsites.net](https://bgp.azurewebsites.net)**.

---

### 🆕 What's New in 2.0

#### 🔁 Submission Lifecycle & Approval Engine
The approval workflow engine, scaffolded in 1.0, is now **fully functional**:
- **State machine**: `submitted` → `in_progress` → `approved` / `denied`
- **Approval actions**: Approve, Deny, and Forward (to a specific user or an entire role)
- Approval nodes support **"any one"** or **"all must"** modes with a configurable required count
- Forward modal with user/role toggle and optional note
- Full audit trail captured via `ApprovalEvent` documents
- **Pipeline timeline** visualisation on the submission detail page — shows completed, current, and pending steps with actor names, actions, notes, and timestamps
- Automatic engine seeding on form submission — advances past the start node and resolves the first set of approvers

#### 📊 Admin — Form Management Dashboard
A new restricted admin view with a master list of **all form submissions across the system**:
- **Server-side pagination** — MongoDB aggregation with `$facet` for count + data in a single query
- **Filtering**: form type, status, submitter (name/email search), date range — all applied at the database level
- **Multi-tier column sorting**: click table headers to cycle Ascending → Descending → None; stack multiple sort conditions
- Default sort prioritises oldest pending forms
- Click any row to navigate to the full submission lifecycle detail
- Row-level admin access override — admins can view any submission regardless of submitter

#### ⏳ Pending Reviews & Approvals (now operational)
- Dashboard page lists all submissions **awaiting the current user's action**
- Displays template name, submitter, current step, and assigned roles
- Inline Approve / Deny / Forward buttons with confirmation modals and optional notes
- Live count badge on the Dashboard

#### 📄 Submission Detail View
- Read-only rendering of the submitted form with all field values
- **Pipeline Timeline** replaces the old audit trail — visual step-by-step lifecycle
- Status badges (Submitted, In Progress, Approved, Denied)
- Old approval history section removed (replaced by pipeline)

#### 🐛 Bug Reporting System
- Users can submit bug reports with title, description, and optional screenshot
- Admin panel to browse and review all submitted reports
- Bug report detail view with full information

#### 🌍 Internationalisation (i18n)
- **5 languages**: English, Português, Español, Deutsch, Français
- All UI text is externalised in `translations.json`
- Language selector in the navbar with persistent preference
- Status labels, filter labels, column headers, and form builder UI all translate dynamically

#### 🌙 Dark Mode
- Full light/dark theme support via CSS custom properties (`--color-*`)
- Theme toggle in the navbar with persistent preference
- Every page and component respects the active theme — glassmorphism cards, modals, tables, form controls, and the flow editor canvas

#### 📝 Draft Form Templates
- Template authors can save in-progress work as a draft
- Drafts appear on the Dashboard under "In Progress" with a resume button
- On final save, the draft is automatically cleaned up

#### 🏗️ Form Builder UX Improvements
- **Split-button dropdown**: "Save Template" is the primary action; a ▼ toggle opens a menu with Save as Draft, Import JSON, and Export JSON — visually cohesive with shared borders and zero gap
- Column span controls with reset button in row toolbars

#### 🔒 Security Hardening
- Brute-force protection: login attempt tracking with account lockout after consecutive failures
- Rate limiting on authentication endpoints
- Refresh token rotation and revocation
- Admin-only access gates on all management endpoints

---

### ✨ Features (Complete — Carried Forward from 1.0)

#### 🔐 Authentication & User Management
- Secure JWT-based login with access and refresh token rotation
- Password recovery via email (Nodemailer / Gmail SMTP)
- Change password flow
- Soft-delete support for users
- Role-based access control (RBAC) — roles are dynamically managed through the database

#### 👥 Admin — User & Role Management
- Full CRUD for users via the **User Management** panel
- Role creation, listing, and soft-deletion

#### 🏗️ Form Builder
- Drag-and-drop interface for constructing form templates
- 12 supported field types: text, email, number, date, textarea, dropdown, radio, checkbox, file upload, headings, labels, and dividers
- Multi-column row layouts with configurable column spans
- Duplicate row functionality
- Role-based access control per template (`allowedSubmitRoles`)
- Form template **versioning** — new versions supersede old ones; deprecated templates are blocked from new submissions

#### 🔀 Approval Flow Editor
- Visual node-based editor for designing multi-step approval workflows
- Support for role-based and user-specific approver assignments
- Conditional edge labels (approved, denied)

#### 📝 Form Submission
- Users can browse and fill forms they are authorised to submit
- Submitted data is stored with the full template snapshot (field definitions + submitted values) for auditability
- Submission status tracking (submitted, in_progress, approved, denied)

#### 📄 My Submissions
- Dedicated page listing all forms submitted by the logged-in user
- Status badges per submission
- Read-only view for each submission — renders the complete form with submitted answers and the pipeline timeline

#### 📊 Dashboard
- Role-aware action cards (admin vs. regular user views)
- "My Submissions" stat card with live count, clickable
- "Pending Reviews" stat card with live count, clickable
- "In Progress" drafts card, clickable — shows saved drafts

---

### 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Vanilla CSS (custom properties) |
| Backend | Node.js, Express, TypeScript, TSOA |
| Database | MongoDB (Mongoose ODM) |
| API Docs | Swagger UI (auto-generated via TSOA) |
| Auth | JWT (access + refresh tokens, bcrypt) |
| Email | Nodemailer (Gmail SMTP) |
| Hosting | Azure Web App |
| CI/CD | GitHub Actions |

---

### ⚙️ Running Locally

```bash
# Install all dependencies
npm run install:all

# Run full stack (production build)
npm run full

# Or in dev mode with hot-reload
npm run dev
```

> Requires Node.js ≥ 20 and a MongoDB connection string in `BackEnd/.env`.

---

*Built by Team B — IPT Group Project 2026*
