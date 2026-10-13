# FleetFlow — Commercial Fleet & Logistics Operations System

FleetFlow is a complete, production-grade fleet management web application engineered for transport corporations operating fleets of ~50 vehicles.

Built with **Next.js App Router**, **TypeScript (Strict Mode)**, **Tailwind CSS**, and **Supabase PostgreSQL** with **Row Level Security (RLS)**.

---

## 1. System Architecture & Features

### Core Operations
- **Daily Duty Allocations**: Assign drivers and vehicles to daily duties with real-time schedule conflict detection and maintenance vehicle enforcement.
- **Fixed-Route & Flexible Rostering**: Support for fixed-route driver templates with automatic corridor pre-filling, as well as daily-changing flexible duties.
- **Multiple Sequential Duties per Day**: Legitimate consecutive duties are supported (e.g. 06:00–10:00 morning shift and 14:00–18:00 evening shift), with concurrency protection against overlapping time windows.
- **Audit History & Reassignment**: Concurrency-safe reassignment captures old vs. new allocations with mandatory audit justification in `assignment_events`.
- **Driver Mobile Portal**: Mobile-first browser interface allowing drivers to view assigned duties, confirm allocations, start trips with start odometer, and complete trips with end odometer and notes.
- **Multiple Trips under Single Duty**: Record multiple sequential trip legs under a single daily duty without data collision.
- **Monthly Operations Reporting**: Distinct duty dates calculation, distinct completed trip counting, valid odometer distance aggregation, CSV/Excel export, and print-ready PDF reports.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (Strict mode enabled) |
| **Styling** | Tailwind CSS v4 |
| **Database** | Supabase PostgreSQL 15+ |
| **Auth & Security** | Supabase Auth (SMS Phone OTP) + Row Level Security (RLS) |
| **Data Validation** | Zod + React Hook Form |
| **Testing** | Vitest (14/14 automated unit & state machine tests passing) |
| **Icons** | Lucide React |

---

## 3. User Roles & Security Matrix

| Feature / Table | Owner | Dispatcher | Driver |
|---|---|---|---|
| **Profiles & Roles** | Full CRUD | View Only | View Own Profile |
| **Vehicles Master** | Full CRUD + Maintenance Toggle | Full CRUD | View Assigned/Active |
| **Drivers Master** | Full CRUD + Status Toggle | Update Status | View Own Driver Profile |
| **Teams / Clients** | Full CRUD | Manage Operations | View Only |
| **Routes** | Full CRUD | Manage Operations | View Only |
| **Assignments** | Full CRUD + Reassign | Create, Edit, Reassign | View Own Assignments Only |
| **Trips** | Full Access | Full Access | Start & Complete Own Trips |
| **Duty Confirmation** | Admin Override | Admin Override | Confirm Own Duty |
| **Audit Logs & History**| Full Visibility | Operational Visibility | Own Assignment Events |
| **Monthly Reports & CSV**| Full Access | Full Access | No Access (Isolated) |

---

## 4. Database Schema & SQL Migrations

Versioned migrations are located in [`supabase/migrations/`](file:///d:/kore/nalakath/supabase/migrations/):

1. [`00001_initial_schema.sql`](file:///d:/kore/nalakath/supabase/migrations/00001_initial_schema.sql):
   - Tables: `profiles`, `teams`, `routes`, `vehicles`, `drivers`, `assignments`, `trips`, `assignment_events`, `audit_logs`.
   - Primary keys (`UUID`), foreign keys, check constraints, unique constraints, and performance indexes.
2. [`00002_functions_and_triggers.sql`](file:///d:/kore/nalakath/supabase/migrations/00002_functions_and_triggers.sql):
   - `check_assignment_overlap()`: PL/pgSQL trigger function preventing overlapping active duties and blocking assignments to maintenance vehicles.
   - Stored Procedures (`SECURITY DEFINER` with `SET search_path = public`):
     - `confirm_duty(p_assignment_id UUID)`
     - `start_trip(p_assignment_id UUID, p_start_odometer NUMERIC, ...)`
     - `complete_trip(p_trip_id UUID, p_end_odometer NUMERIC, ...)`
     - `reassign_assignment(p_assignment_id UUID, p_new_driver_id UUID, ...)`
3. [`00003_rls_policies.sql`](file:///d:/kore/nalakath/supabase/migrations/00003_rls_policies.sql):
   - Enables RLS across all tables. Strict tenant and driver isolation policies.
4. [`00004_seed_data.sql`](file:///d:/kore/nalakath/supabase/migrations/00004_seed_data.sql):
   - 8 commercial vehicles, 8 drivers, 4 corporate clients, 5 routes, and realistic operational duties.
5. [`schema.sql`](file:///d:/kore/nalakath/supabase/schema.sql):
   - Consolidated one-click execution script for the Supabase SQL Editor.

---

## 5. Local Setup & Windows 11 Instructions

### Prerequisites
- Node.js `v20+` or `v24+` (verified on Node `v24.19.0`)
- Git

### Installation Steps (PowerShell)

```powershell
# 1. Navigate to project root
cd d:\kore\nalakath

# 2. Install dependencies
npm.cmd install

# 3. Configure environment variables
# Copy .env.example to .env.local
Copy-Item .env.example .env.local

# 4. Run database migrations in Supabase:
# Paste the contents of supabase/schema.sql into your Supabase project's SQL Editor.

# 5. Run automated test suite
npm.cmd test

# 6. Run Next.js development server
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Demo Accounts & Testing Walkthrough

The application features a built-in demo mode (`NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`) with simulated SMS OTP authentication so you can immediately explore all screens:

### Pre-configured Accounts (SMS Code: `123456`)
- **Fleet Owner**: `+919876543200` (Full operational & administrative control)
- **Dispatcher**: `+919876543201` (Daily assignments & fleet oversight)
- **Driver (Rajesh K. Nair)**: `+919400112233` (Mobile portal, Confirm Duty, Start/Complete Trip)
- **Driver (Muhammed Shafeeq)**: `+919400223344` (Flexible duty operator)

You can also use the role switcher buttons in the top navigation header to test different roles instantly.

---

## 7. Quality Assurance & Verification Results

All checks have been executed and verified:

- **Vitest Unit Tests**: `14 passed (100%)` across 4 test suites:
  - `tests/conflict-detector.test.ts`: 5 tests passing
  - `tests/odometer-calculator.test.ts`: 4 tests passing
  - `tests/report-aggregator.test.ts`: 2 tests passing
  - `tests/state-machine-and-roles.test.ts`: 3 tests passing
- **TypeScript Typecheck**: `tsc --noEmit` exited with code 0 (Strict mode, 0 errors).
- **ESLint**: `npm run lint` exited with code 0 (0 errors).
- **Production Build**: `next build` compiled all 15 routes into optimized static & server bundles with code 0.
- **HTTP Endpoints**: Verified 200 OK across `/login`, `/dashboard`, `/assignments`, `/trips`, `/vehicles`, `/drivers`, `/teams`, `/routes`, `/reports`, `/driver`, and `/audit-logs`.

---

## 8. Deployment Guide

### Deploying to Vercel / Cloud
1. Push repository to GitHub or GitLab.
2. In Vercel, import repository and set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_DEMO_MODE=false`
3. Deploy.

### Production Supabase SMS Provider Setup
1. In the Supabase Dashboard, navigate to **Authentication** → **Providers** → **Phone**.
2. Enable Phone Provider and select your SMS gateway (**Twilio**, **MessageBird**, or **Vonage**).
3. Provide your Twilio Account SID, Auth Token, and Message Service SID.
4. For staging, configure test phone numbers under **Phone Auth** with static OTP codes.
