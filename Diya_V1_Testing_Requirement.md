# Diya V1 — QA Testing Requirements (Code-Based)

**Audience**: External QA agency / final pre-production testing team  
**Systems in scope**: Diya Wholesaler Web (React), Backend APIs (Spring Boot), Postgres DB (JPA entities)  
**Source of truth**: Actual code in this repository (routes, controllers, services, entities, configs)

## Executive Summary

This document defines **exactly what to test in Diya V1** based on current implementation. It is designed so testers can execute without a full code walkthrough.

### Business-critical flows (must pass before launch)
- **Wholesaler onboarding** (signup → onboarding checklist → setup catalog → setup retailers)
- **Retailer access / connection approvals**
- **Product catalog management** (categories/subcategories/product creation/edit/visibility)
- **Order lifecycle** (placed/created → accept/reject → packing → dispatch → deliver → invoice → complete/cancel)
- **Credit + outstanding due** (khatabook, retailer statement, credit limit)
- **Payments** (record → pending verification → confirm/reject → ledger mapping)
- **Invoice generation** (tax calculations + export to Tally)
- **Dashboard KPIs + analytics** (numbers consistent across screens)
- **Role access / security hardening**
- **Production deployment safety**

### Risk heatmap (based on code)
- **Critical**
  - **Authorization currently disabled globally** in backend security config (`permitAll("/**")`).
  - **OTP is returned in API responses** (both wholesaler + retailer OTP endpoints).
  - **JWT secret hardcoded** in code (token forgery risk if leaked).
  - **Prod config uses `spring.jpa.hibernate.ddl-auto=create`** (data loss risk).
  - **Invoice-per-order is not enforced at DB level** (service assumes it).
- **High**
  - **Outstanding/due inconsistencies** (ledger vs order-based vs analytics).
  - **Ledger debit creation mismatch** depending on which accept path is used.
  - **Unit conversion mismatch risk** in invoice stock check (unitsPerSelling vs stock units).
  - **Concurrency races** (order number, invoice number, stock/reserved updates, payment confirm).
- **Medium**
  - Logout UX does not clear token (web).
  - Map-based request bodies can generate 500s on malformed input.
  - Subcategory uniqueness gaps at top-level (NULL parent + UNIQUE constraint behavior).

## 1) System Modules Present (Actual)

### 1.1 Wholesaler Web (React) — pages/routes
Routes are defined in `DiyaWholesalerDashboard/client/src/App.tsx`.

**Public**
- `/`, `/landing` — Landing (`pages/landing.tsx`)
- `/login` — Login (`pages/login.tsx`)
- `/signup` — Signup flow (`pages/signup.tsx`)
- `/onboarding` — Onboarding checklist (`pages/onboarding.tsx`)

**App (layout-wrapped)**
- `/dashboard` — Dashboard KPIs + quick actions (`pages/dashboard.tsx`)
- `/orders` — Orders list + create order (`pages/orders.tsx`)
- `/orders/:id` — Order detail + lifecycle actions + invoice (`pages/order-detail.tsx`)
- `/invoices/:invoiceId` — Invoice preview + export (`pages/invoice-preview.tsx`)
- `/retailers` — Retailers list + add retailer (`pages/retailers.tsx`)
- `/retailers/:id` — Retailer profile (credit limit, ledger) (`pages/retailer-profile.tsx`)
- `/khatabook` — Dues overview (`pages/khatabook.tsx`)
- `/khatabook/:retailerId` — Retailer statement (`pages/retailer-statement.tsx`)
- `/connection-requests` — Approve/reject connection requests (`pages/connection-requests.tsx`)
- `/business` — Product management + category tree (`pages/business.tsx`)
- `/products/new`, `/products/edit/:id` — Add/Edit product (`pages/product-new.tsx`)
- `/categories` — Category list (`pages/categories.tsx`)
- `/categories/:categoryId` — Category detail + create subcategory (`pages/CategoryDetailPage.tsx`)
- `/payments` — Pending payment verification (`pages/payments.tsx`)
- `/analytics` — Analytics dashboard (`pages/analytics.tsx`)
- `/settings` — Profile/business/security/tally (`pages/settings.tsx`)

**Key modals used in flows**
- Create order: `components/orders/CreateOrderModal.tsx`
- Add retailer: `components/retailers/AddRetailerModal.tsx`
- Add/record payment: `components/payments/AddPaymentModal.tsx`

### 1.2 Backend API modules
Controllers are under `backend/src/main/java/com/diya/backend/controller`.

**Auth**
- `/api/auth/*` (wholesaler + shared auth)
- `/api/retailer/*` (retailer login / OTP flows)

**Catalog**
- Wholesaler: `/api/wholesaler/categories/*`, `/api/wholesaler/subcategories/*`, `/api/wholesaler/products/*`
- Retailer: `/api/retailer/products/*`
- Public: `/api/catalog/*`, `/api/public/categories`
- HSN suggest: `/api/hsn/suggest`

**Connections**
- Retailer: `/api/retailer/connections/*`
- Wholesaler: `/api/wholesaler/connections/*`

**Orders**
- Retailer cart: `/api/retailer/cart/*`
- Retailer orders: `/api/retailer/orders/*`
- Wholesaler orders: `/api/wholesaler/orders/*`

**Invoices + Tally**
- `/api/invoices/*`
- `/api/tally/*`

**Payments + Ledger**
- `/api/retailer/payments/*`
- `/api/wholesaler/payments/*`
- `/api/ledger/*`

**Dashboards + Analytics**
- `/api/wholesaler/dashboard/*`
- `/api/analytics/*`

**Retailers mgmt**
- `/api/wholesaler/retailers/*`

**Settings**
- `/api/wholesaler/settings/*`

**Regions**
- `/api/regions/active`

**Users (currently exposed as coded)**
- `/api/users/*`

### 1.3 Database domain (high-level)
Key entities (JPA tables): `User`, `Wholesaler`, `Retailer`, `Connection`, `Category`, `SubCategory`, `Product`, `ProductRetailerHide`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `Invoice`, `InvoiceItem`, `LedgerEntry`, `RetailerOtp`, `HsnMaster`.

## 2) Test Execution Rules (for QA agency)

### Environments required
- **Staging** (must match intended production security config, CORS, DB migrations)
- **Production-like dataset environment** (load/perf + concurrency testing)

### Data setup required (minimum)
- **2 wholesalers**
  - WholesalerA: PUBLIC visibility
  - WholesalerB: PRIVATE visibility
- **5+ retailers** across regions
  - At least 2 with credit limits set, 1 with no credit limit, 1 with overdue credit
- **Products**
  - At least 1 product with `unitsPerSelling=1`
  - At least 1 product with `unitsPerSelling>1` (mandatory for invoice/stock edge cases)
  - Mix of GST rates (0%, 5%, 12%, 18%), and with/without HSN auto-fill
- **Orders**
  - Cash, UPI, Credit modes
  - Multiple statuses across the lifecycle
- **Payments**
  - Pending verification, confirmed, rejected

### Evidence required in QA report
- For each defect: **steps, expected vs actual, screenshots, API request/response (redacted), DB evidence** if relevant
- For finance-related defects: include **reconciliation math** and affected endpoints/screens

## 3) User Flows — Step-by-Step Required Tests

### 3.1 Wholesaler onboarding flow (Web)
**Pages**: `/signup` → `/onboarding` → `/business` → `/retailers` → `/dashboard`

**Signup (`/signup`, `pages/signup.tsx`)**
- **Step 1 (Owner details)**
  - Fields: Full Name, Email, Mobile, Send OTP, OTP, Password, Terms checkbox
  - Buttons: “Send OTP”, “Verify & Continue”
  - Tests:
    - Empty/invalid email and mobile formats
    - OTP wrong/expired behavior (backend returns OTP in response; log as security issue)
    - Weak password acceptance (compare register vs set-password vs change-password policies)
- **Step 2–4 (Business + payments)**
  - Fields: business type, business name, GSTIN, pincode, region, state, address, UPI ID, QR upload/skip
  - Tests:
    - Required fields enforced and error messaging clear
    - Successful register routes to `/onboarding`

**Onboarding checklist (`/onboarding`, `pages/onboarding.tsx`)**
- Verify all checklist actions route correctly.
- **Known UX risk**: “Go to Dashboard” link currently routes to `/` (landing), not `/dashboard`. Report if unintended.

### 3.2 Authentication/session behavior (Web)
**Login (`/login`, `pages/login.tsx`)**
- Fields: Mobile, Password (show/hide)
- Tests:
  - Valid login stores token and navigates to `/dashboard`
  - Invalid login: error shown, no token stored
  - Deep link (e.g. `/orders/:id`) without token:
    - UI currently has no ProtectedRoute; relies on API and axios interceptor redirects.

**Logout**
- Sidebar “Sign Out” redirects to `/landing` but may not clear token.
- Tests:
  - After “Sign Out”, attempt to load `/dashboard`: should be blocked if logout is real.
  - Document behavior; classify as **High** if token persists.

### 3.3 Retailer access / connection flow
**Visibility toggle (`/dashboard`, `pages/dashboard.tsx`)**
- Toggle: PUBLIC/PRIVATE retailer access
- Tests:
  - When PRIVATE, retailer discovery endpoint should not return this wholesaler
  - When PUBLIC, discovery returns

**Connection approvals (`/connection-requests`, `pages/connection-requests.tsx`)**
- Sections: Pending / Approved / Rejected
- Tests:
  - Approve moves request into Approved and enables retailer for ordering/visibility
  - Reject moves into Rejected; Re-Approve returns it to Approved
  - Verify list updates without duplicates

### 3.4 Catalog management flow (Products + Categories)
**Business product mgmt (`/business`, `pages/business.tsx`)**
- Products tab tests:
  - Add Product navigates to `/products/new`
  - Inline edit MRP/Stock: persists and reflects after refresh
  - Bulk delete: only selected rows deleted; confirm UI state resets
  - Visibility (global + per-product + retailer visibility dialog): persists and affects retailer product listing
- Categories tree tests:
  - Create/rename/delete category and subcategory
  - Drag/drop product between categories/subcategories:
    - Verify product’s category/subcategory updates and persists
  - Add subcategory inside/beside:
    - Verify hierarchy correct (parent/child)

**Add/Edit product (`/products/new`, `/products/edit/:id`, `pages/product-new.tsx`)**
- Fields: name, category, subcategory, price, MRP, stock, tax/billing (HSN, GST, units)
- Tests:
  - Required fields validation
  - Numeric boundaries (stock negative? GST > 100? unitsPerSelling 0?)
  - HSN suggest:
    - Type name triggers `/api/hsn/suggest`
    - Auto-fill only for medium/high confidence

### 3.5 Order lifecycle flow (Highest priority)
**Orders list (`/orders`, `pages/orders.tsx`)**
- Create order modal opens and creates order successfully
- Search (retailer name/order number) and status filter work

**Order detail (`/orders/:id`, `pages/order-detail.tsx`)**
- Approve flow:
  - Payment Type: CASH / UPI / CREDIT
  - If CREDIT: Credit Days required
  - Force accept when stock shortage (must test both paths)
- Reject flow
- Status actions:
  - Mark Packed → Dispatch Order → Mark Delivered
  - Must respect allowed transitions (backend enforces strict transition graph)
- Edit order modal:
  - Reason required
  - Per-item qty and unit price changes persist
  - Totals/outstanding update correctly
- Invoice:
  - Generate Invoice (finalize) appears at correct status
  - View Invoice routes to `/invoices/:invoiceId`

### 3.6 Credit / Khatabook / Retailer statement
**Khatabook (`/khatabook`, `pages/khatabook.tsx`)**
- Filters: All Dues / Critical / Pending / Settled
- Tests:
  - “Settled” only when outstanding is truly zero
  - Critical/overdue matches due date logic

**Retailer statement (`/khatabook/:retailerId`, `pages/retailer-statement.tsx`)**
- Ledger history consistent with payments and accepted credit orders

**Retailer profile (`/retailers/:id`, `pages/retailer-profile.tsx`)**
- Credit limit set:
  - Accepts non-negative, rejects negative
  - Persists and reflects in credit summary endpoints

### 3.7 Payments workflow (Record → Verify → Ledger)
**Payments page (`/payments`, `pages/payments.tsx`)**
- Shows pending verification payments
- Confirm:
  - Status changes to CONFIRMED
  - Outstanding decreases correctly
  - Ledger CREDIT entry created
- Reject:
  - Status changes to REJECTED
  - Reject reason stored/visible (if supported)
- Concurrency test:
  - Two confirmations in parallel for same payment must not double-credit

### 3.8 Invoice + Tally export
**Invoice finalize**
- Allowed only for ACCEPTED/DISPATCHED/DELIVERED
- Sets order status to INVOICED
- Tests:
  - Duplicate finalize attempts must be blocked (1 invoice per order)
  - Validate tax/rounding math and totals

**Export to Tally**
- “Send to Tally” button triggers export endpoint
- Tests:
  - Export success and errors
  - Repeat export idempotency
  - Access control (must not be public in production)

### 3.9 Dashboard + Analytics reconciliation
**Dashboard (`/dashboard`)**
- KPIs load (region filter changes results)
- Quick actions work

**Analytics (`/analytics`)**
- Summary + lists (top/slow products, top retailers, pending payments)
- Test:
  - Numbers consistent with dashboard and ledger
  - Large dataset doesn’t time out

### 3.10 Settings (profile/business/security/tally)
**Settings (`/settings`, `pages/settings.tsx`)**
- Profile save works
- Change password:
  - wrong current password fails
  - new password min rules consistent
- Tally ping endpoint reachable and stable

## 4) Edge Cases Specific to Diya (Must Explicitly Test)

### 4.1 Stock reservation + acceptance
- Partial reservation allowed on order placement.
- Force accept can short-fulfill due to stock shortage but still marks order ACCEPTED.

**Required tests**
- Create order > available stock:
  - Non-force accept fails
  - Force accept succeeds; verify resulting stock/reserved correctness

### 4.2 Units-per-selling mismatch (invoice finalize)
Invoice finalize checks base units (qty × unitsPerSelling) against `available = stock - reserved`.

**Required tests**
- Product with `unitsPerSelling>1`
- Create order, accept, then finalize invoice:
  - Verify finalize does not incorrectly fail due to unit mismatch
  - If it fails, capture as **High** defect (blocks invoicing)

### 4.3 Outstanding definitions are inconsistent (cross-screen mismatch risk)
There are multiple “outstanding” computations (order-based vs ledger-based vs analytics).

**Required reconciliation checks**
- Retailers list outstanding vs Khatabook outstanding vs Dashboard KPI outstanding vs Analytics outstanding
- If mismatch:
  - Record exact screens and the API responses used
  - Provide DB ledger entries proving correct amount

### 4.4 Ledger debit creation mismatch on acceptance
Depending on accept path, ledger debit may be created only for credit or for any ACCEPTED order.

**Required tests**
- Accept order with CASH and with UPI:
  - Verify ledger does **not** create debit entry (if that’s intended)
- Accept order with CREDIT:
  - Verify exactly one debit ledger entry is created

### 4.5 Payment mode parsing edge case
Payment mode uses `PaymentMode.valueOf(mode.toUpperCase())`.

**Required tests**
- Submit payment mode strings:
  - Valid: CASH/UPI/CREDIT (and any others used)
  - Invalid variants (e.g., `netbanking` vs `NET_BANKING`) should return 400, not 500

### 4.6 Race conditions (concurrency)
- Order number generation (orderSequence) and invoice number generation are not locked.
- Stock/reserved and payment confirm flows have no obvious locking/idempotency keys.

**Required tests**
- 20 parallel order creations for same wholesaler: no duplicate order numbers, no 500s
- 20 parallel invoice finalizations: no duplicate invoice numbers
- Parallel payment confirmations: no over-crediting ledger

## 5) Critical Calculations to Verify (Finance-Grade)

### 5.1 Invoice calculations (per line and totals)
Verify the following for each invoice item:
- Taxable value = qtySelling × rate
- GST = taxable × (gstRate/100)
- CGST = GST/2
- SGST = GST − CGST
- Line total = taxable + GST

**Required tests**
- GST rate 0, 5, 12, 18
- Mixed GST rates across items in same invoice
- Rounding rules: verify exact paise-level totals match backend

### 5.2 Order outstanding (order-based)
- Paid = sum(CONFIRMED payments linked to order)
- Unpaid = max(total − paid, 0)
- For PLACED/REJECTED/CANCELLED, unpaid forced to 0 in list outputs

### 5.3 Ledger outstanding (source for khatabook)
- Outstanding = SUM(DEBIT) − SUM(CREDIT) per wholesaler+retailer pair

### 5.4 Overdue logic (credit due)
Verify due date logic matches UI “Critical/Overdue” tags and analytics.

## 6) Role-based Permissions to Validate (Current vs Intended)

### 6.1 Current security posture (Critical)
Backend `SecurityConfig` is in “temporary deployment mode” and permits all:
- `requestMatchers("/**").permitAll()`

**Required tests (current branch)**
- Call “protected” endpoints without Authorization:
  - Must not 500 / NPE
  - Must not leak sensitive data

### 6.2 Intended production posture (must be validated before launch)
Once role security is re-enabled, validate:
- Wholesaler token cannot access `/api/retailer/**`
- Retailer token cannot access `/api/wholesaler/**`, `/api/ledger/wholesaler/**`, `/api/invoices/**`
- Public endpoints are limited to intended:
  - `/api/catalog/**`, `/api/public/**` (as intended), `/api/hsn/suggest` (if intended)

### 6.3 High-risk endpoints that must be protected in prod
- `/api/users/all`, `/api/users/{id}` (PII exposure)
- `/api/tally/export/{invoiceId}` (export access)
- Any ledger endpoints

## 7) API Checklist (by Screen/Flow)

> QA should validate **request/response shapes**, error codes (400 vs 500), and authorization behavior.

### Auth
- `POST /api/auth/send-otp` (security risk: OTP returned)
- `POST /api/auth/verify-otp`
- `POST /api/auth/set-password`
- `POST /api/auth/register`
- `POST /api/auth/login`
- Retailer auth: `POST /api/retailer/request-otp`, `POST /api/retailer/verify-otp`, `POST /api/retailer/login`, etc.

### Products/Categories
- `GET/POST/PUT/DELETE /api/wholesaler/categories`
- `GET /api/wholesaler/categories/tree`
- `GET/POST/PUT/DELETE /api/wholesaler/subcategories`
- `GET /api/wholesaler/products` (search/pagination)
- `POST/PUT/DELETE /api/wholesaler/products`
- `GET/PUT /api/wholesaler/products/{id}/retailer-visibility`
- `GET /api/hsn/suggest`

### Connections
- `GET /api/wholesaler/connections`
- `PUT /api/wholesaler/connections/{connectionId}`

### Orders
- `GET /api/wholesaler/orders` (status/search/dateRange/page/size)
- `POST /api/wholesaler/orders` (create)
- `GET /api/wholesaler/orders/{orderId}`
- `POST /api/wholesaler/orders/{orderId}/accept?force=...`
- `POST /api/wholesaler/orders/{orderId}/reject`
- `POST /api/wholesaler/orders/{orderId}/packing|dispatch|deliver|complete|cancel`
- `POST /api/wholesaler/orders/{orderId}/edit`
- `PATCH /api/wholesaler/orders/{orderId}/credit`
- `GET /api/wholesaler/orders/retailer/{retailerId}/previous-due`

### Invoices/Tally
- `POST /api/invoices/{orderId}/finalize`
- `GET /api/invoices/{invoiceId}`
- `POST /api/invoices/{invoiceId}/export-tally`
- `GET /api/tally/ping`
- `GET /api/tally/export/{invoiceId}` (must not be public in prod)

### Payments/Ledger
- `POST /api/retailer/payments` (creates pending)
- `GET /api/wholesaler/payments/pending`
- `POST /api/wholesaler/payments/{paymentId}/confirm`
- `POST /api/wholesaler/payments/{paymentId}/reject`
- `GET /api/ledger/wholesaler/summary`
- `GET /api/ledger/wholesaler/retailers`
- `GET /api/ledger/wholesaler/retailer/{retailerId}/statement`
- `POST /api/ledger/wholesaler/record-payment`

### Dashboard/Analytics
- `GET /api/wholesaler/dashboard/kpi?region=...`
- `GET /api/wholesaler/dashboard/territory`
- `GET /api/wholesaler/dashboard/activity`
- `GET /api/analytics/*` (multiple endpoints)
- `GET /api/regions/active`

### Settings
- `GET/PUT /api/wholesaler/settings`
- `PUT /api/wholesaler/settings/password`
- `GET/PUT /api/wholesaler/settings/visibility`

## 8) Database Consistency Checks (Post-run Validation)

QA must validate DB integrity after running test suites and after concurrency tests.

### Mandatory checks
- **One invoice per order**
  - No two `invoices` rows with same `order_id`
- **Ledger correctness**
  - CREDIT entries equal sum of confirmed payments
  - DEBIT entries exist only for credit exposure (as intended)
  - Outstanding = debit − credit matches UI
- **No negative stock/reserved stock**
  - Product stock/reservedStock never below 0
- **No duplicate connections**
  - `connections` unique wholesaler+retailer
- **No duplicated pending payments for same order/reference**
  - If duplicates exist, report idempotency gap
- **Cart uniqueness**
  - Only one cart per retailer+wholesaler pair (if intended)
  - No duplicate cart_items (same product twice) (if intended)

## 9) Security Requirements (Current Findings + Test Cases)

### 9.1 Production blockers (must be resolved before launch)
- **Disable global permitAll** and enforce role rules (backend).
- **Remove OTP from API responses**; add throttling/attempt limits.
- **Move JWT secret to environment**; rotate per environment.
- **Fix prod ddl-auto** (`create` is not acceptable for production).

### 9.2 Security test cases
- Unauthorized access attempts:
  - No auth header → must return 401/403 (not 500)
  - Retailer token → wholesaler endpoints forbidden
  - Wholesaler token → retailer endpoints forbidden
- Sensitive endpoints:
  - `/api/users/all` must be forbidden in prod
  - `/api/tally/export/{invoiceId}` must be forbidden in prod
- Token tampering:
  - Expired token rejected
  - Modified role claim rejected

## 10) Performance & Scalability Testing Requirements

### 10.1 Load test targets (minimum)
- Order creation + order list fetch + order detail fetch
- Accept/reject transitions + invoice finalize
- Pending payments list + confirm payment
- Khatabook summary + retailer statement (ledger heavy)
- Analytics endpoints (top products/retailers/monthly sales)

### 10.2 Concurrency tests (mandatory)
- Parallel order creation: no duplicate orderNumber collisions, no 500s
- Parallel invoice finalize: no duplicate invoiceNumber collisions
- Parallel payment confirmations: no double-credit in ledger
- Parallel stock reservations: stock/reserved correctness maintained

## 11) Cloud Deployment Risks (from current repo config)

### Confirmed risks (must be addressed before production)
- `backend/src/main/resources/application-prod.properties` contains:
  - `spring.jpa.hibernate.ddl-auto=create` (**data loss risk**)
- Backend `SecurityConfig` is in temporary permit-all mode.

### Deployment validation checklist
- `SPRING_PROFILES_ACTIVE=prod` set and verified
- DB credentials injected via secrets manager (not committed)
- Migrations are controlled (no schema recreation)
- Correct CORS for production frontend domain(s)
- Health checks and monitoring/alerts enabled

## 12) Production Readiness Checklist (Go/No-Go)

### Critical (No-Go if failed)
- Role-based authorization enforced (no global permit-all)
- OTP flows secured (no OTP in responses, rate limit, expiry, attempt count)
- JWT secrets are env-based + rotated
- Prod schema settings safe (no ddl-auto=create)
- Finance-grade reconciliation passes (ledger vs UI vs invoices)

### High (No-Go unless accepted explicitly)
- Outstanding consistency across all screens
- Invoice finalize works for unitsPerSelling>1 products
- Payment confirmation is idempotent and safe under concurrency
- One invoice per order guaranteed (service + DB)

### Medium (Must be tracked with clear mitigation)
- Logout clears tokens and ends session client-side
- Input validation returns 400s not 500s for malformed payloads
- Subcategory uniqueness and cart uniqueness clarified and enforced

---

## Appendix A — Confirmed config excerpts (for QA awareness)

### A1) Backend security currently permits all
File: `backend/src/main/java/com/diya/backend/config/SecurityConfig.java`
- Contains `requestMatchers("/**").permitAll()` under “TEMPORARY DEPLOYMENT MODE”.

### A2) Production JPA schema mode is destructive
File: `backend/src/main/resources/application-prod.properties`
- `spring.jpa.hibernate.ddl-auto=create`

