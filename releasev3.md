🎉 Version 3.0 — Urgency System, Advanced Workflows & UI Optimizations
----------------------------------------------------------------

The third major release of the **Form & Approval Builder** platform, developed for the professors and staff of **[Instituto Politécnico de Tomar (IPT)](https://www.ipt.pt/)**.

The application is live at **[https://bgp.azurewebsites.net](https://bgp.azurewebsites.net)**.

---

### 🆕 What's New in 3.0

#### 📱 Native Mobile App & Responsiveness
- **React Native Mobile App**: Launched the official native mobile app.
- **Web Mobile Viewport Enhancements**: Major UI responsiveness improvements across the web application for smaller viewports.

#### ⚡ Real-Time Collaboration & OCC
- **Optimistic Concurrency Control (OCC)**: Mitigates pending approval race conditions combining database document states, real-time WebSocket updates (for form stage approved/denied + new pending approvals), and backend HTTP 409 conflict responses.
- **WebSocket Notifications**: Added a real-time notification bell to instantly alert users of updates.

#### 🔐 Security, Auth & Globalisation
- **Single Sign-On (SSO)**: Integrated enterprise SSO for streamlined authentication.
- **Massive Translation Expansion**: Extended internationalization support to an unprecedented **133 languages**.

#### 🚨 Urgency Flagging & Fee System
- **Full-stack urgency flagging** for form submissions, allowing users to prioritize requests.
- **Urgency Fee Integration**: Triggers payment flows for urgent requests on both web and native mobile clients.
- Visual 🚨 urgency indicators deployed across all approval interfaces.
- New **"Pending Urgent Approvals"** stat card on the web dashboard.
- Dashboard urgency indicator dynamically triggers when urgent pending counts exceed zero.

#### 🏗️ Form Builder & Template Enhancements
- **Group Box Re-Use & Numeration**: Create, delete, and insert reusable template group boxes, complete with auto-numeration.
- **Input Constraints**: Added definition settings for inputs, including max length and number range.
- **Time Series / Quick Time Forms**: Support for start time/end time events; if nodes are defined, it functions as a permanent form.
- **Form Labels & Search**: Integrated form labels and robust search-by-form functionality.
- **Drag-and-Drop Enhancements**: Easily add rows by dragging a new element directly into empty space on the template canvas.
- **Relocated Drafts Interface**: Draft loading moved to a dedicated modal within the `FormBuilder`'s split button ("Load Draft (x)").

#### 🔀 Advanced Workflow Engine Architecture
- **Dynamic step-based assignment**: Refactored `assignedTo` persistence logic to justify a dynamic step-based approach over static lookups.
- **Enhanced Pending Reviews**: The UI now explicitly displays assigned roles, specific users, and incorporates **Unit/department user aggregation and flagging**.
- Optimized UI rendering performance on the approval list to prevent screen flickers during submission actions.

#### 🔄 Flow Builder Loop Prevention
- **Client-side loop detection** in `FlowEditor.jsx` prevents the creation of cycles when connecting nodes.
- **Server-side validation** in the controllers ensures data integrity and enforces acyclic structures during template and draft submission.

#### 🎨 UX, Theming & Support
- **Advanced App Theming**: Supports Light, Dark, and an **auto-switch mode based on local regional sunrise/sunset times**.
- **Dynamic Backgrounds**: Implemented dynamic backgrounds to enrich the visual experience.
- **User Guide Videos**: Added embedded manual videos to help users navigate the system.
- **Toast Notifications**: Centralized and repositioned all system error toasts to the top-right for increased prominence.

#### ☁️ Cloud Service Decoupling & Storage
- **Dedicated Blob Storage**: Implemented direct client access utilizing SAS tokens for highly scalable file operations.
- **Service Abstraction Layer**: Implemented `IStorageService` and `IIdentityProvider` interfaces, allowing future platform-agnostic deployments.

#### 📜 Reviewer History & Bug Tracking
- **Reviewed Forms Interface**: Allows non-admin users to track their historical review activity.
- **Bug Reporting Updates**: Admins can now mark bug reports as resolved directly from the dashboard.
- **Clean Codebase**: Eliminated unused imports to ensure zero ESLint warnings and stable CI builds.

---

### ✨ Features (Complete — Carried Forward from 2.0)

#### 🔁 Submission Lifecycle & Approval Engine
- **State machine**: `submitted` → `in_progress` → `approved` / `denied`
- **Approval actions**: Approve, Deny, and Forward (to a specific user or an entire role)
- Approval nodes support **"any one"** or **"all must"** modes with a configurable required count
- Full audit trail captured via `ApprovalEvent` documents and visualized as a **Pipeline timeline**

#### 📊 Admin — Form Management Dashboard
- Master list of **all form submissions across the system** with server-side pagination, filtering, and multi-tier column sorting.

#### 🔐 Authentication & User Management
- Secure JWT-based login with access and refresh token rotation, brute-force protection, and account lockout.
- Password recovery via email and change password flow.
- Role-based access control (RBAC) with full CRUD admin panels for users and roles.

#### 🏗️ Form Builder
- Drag-and-drop interface supporting 12 field types, multi-column row layouts, and role-based access control.
- Form template **versioning** and draft support.

#### 🌍 Internationalisation & Theming (i18n)
- **5 languages**: English, Português, Español, Deutsch, Français
- Full light/dark theme support via CSS custom properties (`--color-*`).

#### 🐛 Bug Reporting System
- Users can submit bug reports with title, description, and optional screenshots for admins to review.

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
| Hosting | Azure Web App (Decoupled storage ready for Multi-Cloud) |
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
