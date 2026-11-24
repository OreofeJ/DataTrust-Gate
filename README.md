# DataTrust Gate 

An open-source prototype for transparent, community governed health research data access control, policy evaluation, and application level auditing in Nigeria.
<img width="1892" height="861" alt="dtg" src="https://github.com/user-attachments/assets/8218c750-2918-4e1e-9938-c414099f34dd" />


> **App Instance & Synthetic Data Notice:** All initial researchers, access requests, governance policies, consent references, and Nigerian state geographic labels are synthetic demonstration records. This instance demonstrates access authorisation workflows only it does **not** store, transfer, or expose real patient health records and is **not** connected to a live Health Data Cooperative (HDC) instance.

---

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, custom SVG brand geometry and lightweight SVG data visualisations (Nigeria state activity map, decision distribution donut, compliance gauge, activity timeline).
- **Backend**: Node.js + Express (`server.ts`) hosting REST endpoints under `/api/v1/*` 
- **Database & Auth**: Google Cloud Firestore with Firebase Authentication (Google Sign-In required) and hardened `firestore.rules`.


## Firestore Collections

| Collection | Purpose |
| :--- | :--- |
| `researchers` | Fictional researcher directory with `VERIFIED`, `PENDING`, or `SUSPENDED` status |
| `accessRequests` | Access requests, submitted metadata, deterministic decision status, and explanations |
| `governancePolicies` | Community-governed rules (`ACTIVE` / `INACTIVE`), allowed organisations, purposes, categories, duration limits |
| `consentReferences` | Synthetic consent references (`VALID`, `EXPIRED`, `REVOKED`, `PENDING`) |
| `auditEvents` | Append-only application-level governance log (`update` and `delete` disabled in rules) |
| `systemMeta` | Idempotent `seedState` marker preventing duplicate synthetic seeding on restarts |

---

## REST API Overview (`/api/v1/*`)

Protected endpoints require a Firebase Auth ID token in `Authorization: Bearer <idToken>`, which Firestore enforces against `firestore.rules`.

- `GET /api/v1/health` — Public API health and version status
- `POST /api/v1/engine/evaluate` — Stateless policy evaluation
- `GET /api/v1/dashboard/summary` — Total, approved, denied, and awaiting-review counts
- `GET /api/v1/dashboard/geography` — Synthetic Nigerian state-level request counts
- `GET /api/v1/dashboard/decisions` — Decision distribution counts and percentages
- `GET /api/v1/dashboard/compliance` — Policy compliance rate (excludes `PENDING` from denominator)
- `GET /api/v1/dashboard/activity` — Weekly or daily submitted vs evaluated activity
- `GET /api/v1/requests` — Searchable and filterable request register
- `POST /api/v1/requests` — Submit a new request (enforced initial `PENDING` status)
- `GET /api/v1/requests/:id` — Inspect a single access request
- `POST /api/v1/requests/:id/evaluate` — Deterministically evaluate a request and append audit events
- `GET /api/v1/policies` — List governance policies
- `POST /api/v1/policies` — Create a governance policy (admin)
- `PATCH /api/v1/policies/:id` — Activate or deactivate a policy (admin)
- `GET /api/v1/consent-references` — List synthetic consent references
- `GET /api/v1/audit` — Search and filter append-only audit events

---

## Local Development

```bash
npm install
npm run dev
```

The server listens on port `3000` (`http://localhost:3000`).

### Verification & Build

```bash
npm run lint
npm run build
npx eslint firestore.rules
```

---


## Cloud Run Deployment

1. Build the frontend bundle:
   ```bash
   npm run build
   ```
2. Start the production server (`NODE_ENV=production PORT=3000`):
   ```bash
   npm start
   ```
3. Ensure `PORT=3000` (or Cloud Run's injected `PORT`) and `APP_URL` are configured in Cloud Run environment variables.

---

