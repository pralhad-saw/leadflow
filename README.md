# LeadFlow

LeadFlow is a multi-tenant lead and document platform for German mortgage brokerages. Brokerages share one application, but every tenant-owned query is scoped by the authenticated brokerage id.

## Features

- JWT authentication with four roles: platform_admin, brokerage_admin, advisor and client
- bcrypt password hashing and token revocation
- Brokerage-scoped lead APIs and inbound webhook
- Duplicate webhook protection and duplicate lead flags
- Kanban pipeline: New, Contacted, Qualified, Proposal, Won and Lost
- Advisor assignment with same-tenant validation
- Socket.io live lead and document status updates
- Lead to client conversion
- Client application portal
- Cloudinary PDF/JPG/PNG document upload
- Fake asynchronous document checking: Pending, Checking, Approved or Rejected

## Local setup

### Backend

```powershell
cd backend
npm install
npm run seed
npm run dev
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Backend environment

```env
MONGO_URI=your-mongodb-atlas-uri
JWT_SECRET=long-random-secret
PORT=5000
CLIENT_ORIGINS=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Demo users

The seed script prints the complete login table and webhook secrets. Default password is `Passw0rd!123`, unless `SEED_PASSWORD` is set.

- platform_admin: `platform@leadflow.test`
- Berlin admin: `admin@berlin.test`
- Berlin advisor: `advisor1@berlin.test`
- Berlin client: `client@berlin.test`
- Munich admin: `admin@munich.test`
- Munich advisor: `advisor1@munich.test`
- Munich client: `client@munich.test`

## Architecture decisions

The server never trusts a brokerageId from a normal request body. The authentication middleware sets the tenant from the database-backed user session and controllers use that value in every tenant-owned query. The global email uniqueness rule keeps login simple for this take-home; production would use subdomain tenant resolution and compound tenant-email uniqueness.

JWTs are stored in localStorage for simple Vercel to Render cross-origin setup. This is a deliberate demo trade-off. Production would use short-lived access tokens and an httpOnly secure refresh cookie.

The document checker uses setTimeout to demonstrate slow and flaky background work. A production system would put this job in BullMQ, Redis or a managed queue. Email automation, task triggers, dashboard caching, OCR and advanced fuzzy duplicate detection were intentionally cut to keep the core workflow reliable within the time limit.
