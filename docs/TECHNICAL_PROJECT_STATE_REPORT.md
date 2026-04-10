# Diya Technical Project State Report

## 1. Project Overview

Diya currently implements a two-sided wholesale ordering system with a Spring Boot backend, a Flutter retailer app, and a React wholesaler dashboard. Retailers can sign up/login, search public wholesalers, request connections, browse approved wholesalers' catalogs, manage per-wholesaler carts, and place orders. Wholesalers can sign up/login, manage categories, subcategories, and products, approve retailer connection requests, view orders, accept/reject/edit them, progress order status, create invited retailer records, and adjust visibility between `PUBLIC` and `PRIVATE`. The backend also supports payments, ledger entries, invoice generation, HSN suggestion, dashboard KPI endpoints, analytics endpoints, and Tally export hooks. From a user perspective, the retailer mobile flow is strongest around discovery, ordering, and order history, while the wholesaler web flow is strongest around product, order, and connection management. There are major production blockers: Spring Security is currently in temporary `permitAll("/**")` mode, OTP is development-style (OTP returned in response), and the JWT signing secret is hardcoded in source.

## 2. Technology Stack

- Backend framework: Spring Boot 3.5.7, Spring Web, Spring Data JPA, Spring Security
- Frontend framework: Flutter (retailer app), React 19 + TypeScript + Vite (wholesaler dashboard)
- Database: PostgreSQL via Hibernate/JPA
- Authentication mechanism: JWT bearer tokens; BCrypt password hashing; OTP mock service in-memory
- External integrations: Tally HTTP/XML integration at `http://localhost:9000`
- Build tools and libraries:
  - Backend: Maven, Lombok, JJWT, Apache Commons Lang
  - Flutter: Riverpod, Dio, Flutter Secure Storage
  - Dashboard: Wouter, TanStack Query, Axios, Tailwind CSS, Radix UI, React Hook Form, Zod, Recharts
- Extra but currently unused/secondary stack: `DiyaWholesalerDashboard/server` includes Express + Drizzle/Neon scaffold, but no real application API routes are implemented there

## 3. Backend Architecture

- Package structure:
  - `config`: JWT utility/filter, Spring Security, HSN master bootstrap
  - `controller`: REST endpoints, grouped by auth, retailer, wholesaler, and common domains
  - `service`: business logic
  - `repository`: Spring Data repositories
  - `entity`: JPA models
  - `dto`: request/response contracts, with subpackages for `order`, `product`, `cart`, `invoice`, `connection`, `dashboard`, `khatabook`, `category`, `retailer`, `hsn`, `tally`
  - `util`: order prefix utility

- Main modules:
  - Auth: `AuthController`, `AuthService`, `OtpService`
  - Connections: `RetailerConnectionController`, `WholesalerConnectionController`, `ConnectionService`
  - Catalog: `CategoryController`, `SubCategoryController`, `WholesalerProductController`, `RetailerProductController`, `PublicCatalogController`, `ProductService`, `CategoryService`, `SubCategoryService`
  - Cart: `RetailerCartController`, `CartService`
  - Orders: `RetailerOrderController`, `WholesalerOrderController`, `OrderService`
  - Payments/Ledger/Khatabook: `RetailerPaymentController`, `WholesalerPaymentController`, `LedgerController`, `PaymentService`, `LedgerService`, `KhatabookService`
  - Invoice/Tally/HSN: `InvoiceController`, `TallyController`, `HsnSuggestController`, `InvoiceService`, `TallyGatewayService`, `TallyLedgerService`, `TallyVoucherExportService`, `HsnSuggestService`
  - Dashboard/Analytics/Settings: `DashboardController`, `AnalyticsController`, `WholesalerSettingsController`, `DashboardService`, `AnalyticsService`, `WholesalerSettingsService`
  - User/admin/testing: `UserController`, `TestController`, `RetailerTestController`, `WholesalerTestController`

- Controllers:
  - Retailer controllers handle discovery, connections, products, cart, orders, and payments
  - Wholesaler controllers handle products, categories, subcategories, retailers, orders, payments, connections, dashboard, and settings
  - Common controllers expose auth, analytics, invoices, ledger, HSN, public catalog, and Tally

- Services:
  - `OrderService` is the core orchestration layer: checkout, wholesaler direct order creation, listing, detail, accept/reject/status/edit
  - `ProductService` handles wholesaler CRUD plus retailer-side gated product access
  - `ConnectionService` enforces approved wholesaler-retailer relationships
  - `PaymentService` handles retailer payment recording and wholesaler confirm/reject
  - `KhatabookService` builds wholesaler credit summaries/statements and manual payment recording
  - `InvoiceService` finalizes invoices and builds invoice previews

- Repositories:
  - Mostly standard `JpaRepository` interfaces with finder methods
  - `ProductRepository`, `OrderRepository`, `ConnectionRepository`, `LedgerEntryRepository`, and `WholesalerRepository` contain most domain-specific queries

- DTOs:
  - Well-covered for API contracts; wholesaler order detail/list DTOs and cart/product DTOs are the most actively used by frontends

- Entities:
  - `User`, `Wholesaler`, `Retailer`, `Connection`, `Category`, `SubCategory`, `Product`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `LedgerEntry`, `Invoice`, `InvoiceItem`, `HsnMaster`, `TaxType`

## 4. Database Schema

Tables inferred from JPA entities:

- `users`: `id` PK, `phone` unique, `email` unique, `password`, `name`, `role`, `is_active`, `created_at`, `updated_at`
- `wholesaler_profiles`: `id` PK, `user_id` FK unique -> `users.id`, `order_sequence`, `handle` unique, `invite_code` unique, `business_name`, `gstin`, `city`, `state`, `pincode`, `address`, `logo_url`, `visibility_mode`, `invoice_sequence`, `delivery_model`, `upi_id`, `upi_qr_image`, `created_at`, `updated_at`
- `wholesaler_categories`: `wholesaler_id` FK -> `wholesaler_profiles.id`, `category`
- `retailer_profiles`: `id` PK, `user_id` FK unique nullable -> `users.id`, `shop_name`, `address`, `city`, `state`, `phone_contact`, `gst_number`, `is_active`, `account_status`, `credit_limit`, `notes`
- `connections`: `id` PK, `wholesaler_id` FK, `retailer_id` FK, `status`, `requested_at`, `responded_at`, unique (`wholesaler_id`, `retailer_id`)
- `categories`: `id` PK, `wholesaler_id` FK, `name`, unique (`wholesaler_id`, `name`)
- `subcategories`: `id` PK, `category_id` FK, `parent_sub_id` self-FK nullable, `name`, unique (`parent_sub_id`, `name`)
- `products`: `id` PK, `wholesaler_id` FK, `category_id` FK nullable, `subcategory_id` FK nullable, `sku`, `sequence_number`, `reserved_stock`, `name`, `description`, `unit`, `price`, `mrp`, `stock`, `image_url`, `active`, `visible_to_retailer`, `hsn_code`, `gst_rate`, `tax_type`, `base_unit`, `selling_unit`, `units_per_selling`, `price_includes_tax`, `tally_item_synced`, unique (`wholesaler_id`, `sku`)
- `carts`: `id` PK, `wholesaler_id` FK, `retailer_id` FK, `created_at`, `updated_at`
- `cart_items`: `id` PK, `cart_id` FK, `product_id` FK, `quantity`, `price_at_time`, `mrp_at_time`, `stock_snapshot`
- `orders`: `id` PK, `wholesaler_id` FK, `retailer_id` FK, `order_number` unique, `placed_at`, `accepted_at`, `dispatched_at`, `delivered_at`, `cancelled_at`, `edited_at`, `edited_by`, `edit_reason`, `payment_mode`, `credit_days`, `due_date`, `approved_credit_amount`, `credit_due_date`, `status`, `payment_status`, `subtotal`, `tax_amount`, `delivery_charge`, `total_amount`
- `order_items`: `id` PK, `order_id` FK, `product_id` FK nullable, `product_id_snapshot`, `product_name_snapshot`, `unit_snapshot`, `qty`, `original_qty`, `unit_price_snapshot`, `original_unit_price`, `line_total`, `original_line_total`
- `payments`: `id` PK, `order_id` FK nullable, `wholesaler_id` FK, `retailer_id` FK, `amount`, `mode`, `status`, `reference`, `note`, `created_at`, `confirmed_at`, `rejected_at`, `confirmed_by`
- `ledger_entries`: `id` PK, `wholesaler_id` FK, `retailer_id` FK, `related_order_id` FK nullable, `entry_type`, `amount`, `description`, `entry_date`
- `invoices`: `id` PK, `invoice_number` unique, `order_id` FK, `retailer_id` FK, `invoice_date`, `status`, `total_taxable`, `total_cgst`, `total_sgst`, `grand_total`, `tally_exported`, `created_at`, `updated_at`
- `invoice_items`: `id` PK, `invoice_id` FK, `product_id` FK, `quantity_selling_unit`, `quantity_base_unit`, `rate`, `taxable_value`, `cgst`, `sgst`, `line_total`
- `hsn_master`: `hsn_code` PK, `description`, `gst_rate`, `keywords`

ER structure:

- `User` 1:1 `Wholesaler`
- `User` 1:1 nullable `Retailer`
- `Wholesaler` 1:N `Category`, `Product`, `Order`, `Connection`, `Payment`, `LedgerEntry`, `Cart`
- `Retailer` 1:N `Order`, `Connection`, `Payment`, `LedgerEntry`, `Cart`
- `Category` 1:N `SubCategory`, `Product`
- `SubCategory` self-hierarchy via `parent_sub_id`; also 1:N `Product`
- `Cart` 1:N `CartItem`
- `Order` 1:N `OrderItem`, `Payment`
- `Order` -> `Invoice` is modeled as many-to-one from invoice side, but application logic assumes one invoice per order
- `Invoice` 1:N `InvoiceItem`

## 5. Authentication & Security

- Login flow:
  - `POST /api/auth/login` accepts `identifier` (email or phone) + password
  - `AuthService` resolves `User`, verifies BCrypt password, generates JWT with subject, `authType`, and `role`
- Signup:
  - Wholesaler signup via `/api/auth/register`
  - Retailer signup via `/api/auth/register-retailer`
  - OTP flow exists via `/send-otp` and `/verify-otp`, but OTP is generated/stored in-memory, logged, and returned in API response
- Token/session system:
  - JWT only; no refresh token, no server session on Spring backend
  - Expiry: 10 hours
  - Dashboard stores token in `localStorage`
  - Flutter stores token in `FlutterSecureStorage`
- Route protection:
  - Intended RBAC exists in comments, but `SecurityConfig` currently sets `requestMatchers("/**").permitAll()`
  - JWT filter still runs and populates `SecurityContext` if a valid bearer token is present
  - Result: authorization is effectively disabled at Spring Security level; some controllers still manually validate role/identity, others implicitly assume auth context
- Roles:
  - `WHOLESALER`, `RETAILER`, `ADMIN`
  - Tokens contain role claim, but server-wide role enforcement is currently off
- Security issues:
  - Hardcoded JWT secret
  - OTP not production-safe
  - CORS is permissive for localhost patterns and Vercel
  - No refresh tokens, rate limiting, password reset, or input validation layer

## 6. Implemented Functional Features

- Authentication
  - Frontend: dashboard `implemented`, Flutter `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working, but security model is incomplete/insecure
- OTP verification
  - Frontend: dashboard signup `implemented`, Flutter retailer signup currently does direct register flow without real OTP dependency
  - Backend API: `implemented`
  - Database: `not applicable`
  - Status: Development-only/mock
- Wholesaler discovery
  - Frontend: Flutter `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working for public wholesalers only
- Connection request/approval
  - Frontend: Flutter retailer `implemented`, dashboard wholesaler `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Add invited retailer
  - Frontend: dashboard modal `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working, but creates invited retailer without linked user and limited profile data
- Category management
  - Frontend: dashboard `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Subcategory management
  - Frontend: dashboard `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Product management
  - Frontend: dashboard create/list/toggle `implemented`, edit UI partial
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Mostly working
- Retailer catalog browsing
  - Frontend: Flutter `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Cart management
  - Frontend: Flutter `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Retailer order checkout
  - Frontend: Flutter `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Wholesaler direct order creation
  - Frontend: dashboard modal `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Order list/detail
  - Frontend: Flutter `implemented`, dashboard `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Order acceptance/rejection/status progression
  - Frontend: dashboard `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working, with stock and ledger side effects that need review
- Order editing by wholesaler
  - Frontend: dashboard `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working
- Payments by retailer
  - Frontend: Flutter `missing/mock`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Backend works; mobile UI not wired
- Payment confirm/reject by wholesaler
  - Frontend: dashboard `missing`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Backend only
- Ledger/Khatabook
  - Frontend: dashboard summary/list/statement partially wired
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Partial; some pages use real APIs, some details remain mocked
- Invoice generation
  - Frontend: dashboard `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Implemented but has double-stock and double-ledger bug after accepted orders
- Tally integration
  - Frontend: dashboard Tally check + invoice export trigger `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Partial; local Tally dependency, no robust sync state/retry strategy
- Dashboard KPIs/activity
  - Frontend: dashboard `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Partial realism; some territory values are hardcoded
- Analytics
  - Frontend: dashboard `mock`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Partial
- Settings/visibility mode
  - Frontend: dashboard `implemented`
  - Backend API: `implemented`
  - Database: `implemented`
  - Status: Working

## 7. API Endpoints

Method | Endpoint | Purpose | Status

- `POST /api/auth/send-otp` | generate OTP | implemented
- `POST /api/auth/verify-otp` | verify OTP | implemented
- `POST /api/auth/register` | register wholesaler | implemented
- `POST /api/auth/register-retailer` | register retailer | implemented
- `POST /api/auth/login` | login | implemented
- `GET /api/retailer/wholesalers/search` | wholesaler search by name/invite code | implemented
- `POST /api/retailer/connections/request` | request wholesaler connection | implemented
- `GET /api/retailer/connections` | list retailer connections | implemented
- `GET /api/retailer/connections/approved` | list approved wholesalers | implemented
- `GET /api/retailer/products` | retailer product catalog for wholesaler | implemented
- `GET /api/retailer/products/{productId}` | retailer product detail | implemented
- `GET /api/retailer/cart` | fetch cart by wholesaler | implemented
- `POST /api/retailer/cart/add` | add cart item | implemented
- `PUT /api/retailer/cart/update` | update cart item | implemented
- `DELETE /api/retailer/cart/remove/{productId}` | remove cart item | implemented
- `POST /api/retailer/orders/checkout` | checkout cart | implemented
- `GET /api/retailer/orders` | retailer order list | implemented
- `GET /api/retailer/orders/{orderId}` | retailer order detail | implemented
- `POST /api/retailer/orders/{orderId}/cancel` | cancel placed order | implemented
- `POST /api/retailer/payments` | retailer records payment | implemented
- `POST /api/wholesaler/retailers` | create invited retailer | implemented
- `POST /api/wholesaler/categories` | create category | implemented
- `GET /api/wholesaler/categories` | list categories | implemented
- `GET /api/wholesaler/categories/tree` | category tree | implemented
- `POST /api/wholesaler/subcategories` | create subcategory | implemented
- `GET /api/wholesaler/subcategories/category/{categoryId}` | top-level subcategories by category | implemented
- `GET /api/wholesaler/subcategories/children/{parentId}` | child subcategories | implemented
- `POST /api/wholesaler/products` | create product | implemented
- `GET /api/wholesaler/products` | wholesaler product list | implemented
- `GET /api/wholesaler/products/{id}` | product detail | implemented
- `PUT /api/wholesaler/products/{id}` | update product/toggles | implemented
- `GET /api/wholesaler/connections` | all wholesaler connections | implemented
- `GET /api/wholesaler/connections/requests` | pending requests only | implemented
- `PUT /api/wholesaler/connections/{connectionId}` | approve/reject request | implemented
- `GET /api/wholesaler/orders` | wholesaler order list | implemented
- `POST /api/wholesaler/orders` | wholesaler direct order create | implemented
- `GET /api/wholesaler/orders/{orderId}` | wholesaler order detail | implemented
- `POST /api/wholesaler/orders/{orderId}/accept` | accept order | implemented
- `POST /api/wholesaler/orders/{orderId}/reject` | reject order | implemented
- `POST /api/wholesaler/orders/{orderId}/packing` | mark packing | implemented
- `POST /api/wholesaler/orders/{orderId}/dispatch` | mark dispatched | implemented
- `POST /api/wholesaler/orders/{orderId}/deliver` | mark delivered | implemented
- `POST /api/wholesaler/orders/{orderId}/complete` | mark completed | implemented
- `POST /api/wholesaler/orders/{orderId}/cancel` | wholesaler cancel | implemented
- `POST /api/wholesaler/orders/{orderId}/edit` | edit order | implemented
- `GET /api/wholesaler/payments` | wholesaler payment list | implemented
- `GET /api/wholesaler/payments/pending` | pending payments | implemented
- `POST /api/wholesaler/payments/{paymentId}/confirm` | confirm payment | implemented
- `POST /api/wholesaler/payments/{paymentId}/reject` | reject payment | implemented
- `GET /api/wholesaler/dashboard/kpi` | KPI cards | implemented
- `GET /api/wholesaler/dashboard/territory` | territory stats | implemented but partially hardcoded
- `GET /api/wholesaler/dashboard/activity` | activity feed | implemented
- `GET /api/wholesaler/settings` | settings | implemented
- `PUT /api/wholesaler/settings` | update settings | implemented
- `GET /api/wholesaler/settings/visibility` | get visibility mode | implemented
- `PUT /api/wholesaler/settings/visibility` | update visibility mode | implemented
- `GET /api/analytics/wholesaler/summary` | wholesaler analytics summary | implemented
- `GET /api/analytics/retailer/summary` | retailer analytics summary | implemented
- `GET /api/analytics/wholesaler/monthly-sales` | monthly sales aggregation | implemented
- `GET /api/ledger/wholesaler/summary` | khatabook summary | implemented
- `GET /api/ledger/wholesaler/retailers` | retailer dues list | implemented
- `GET /api/ledger/wholesaler/retailers/credit-overview` | retailer credit overview | implemented
- `POST /api/ledger/wholesaler/record-payment` | manual payment record | implemented
- `GET /api/ledger/wholesaler` | wholesaler ledger entries | implemented
- `GET /api/ledger/retailer` | retailer ledger entries | implemented
- `GET /api/ledger/wholesaler/retailer/{retailerId}/statement` | retailer statement | implemented
- `GET /api/ledger/wholesaler/retailer/{retailerId}/credit-summary` | retailer credit summary | implemented
- `GET /api/ledger/wholesaler/retailer/{retailerId}/outstanding` | outstanding amount | implemented
- `POST /api/invoices/{orderId}/finalize` | generate invoice | implemented
- `GET /api/invoices/{invoiceId}` | invoice preview | implemented
- `POST /api/invoices/{invoiceId}/export-tally` | export invoice to Tally | implemented
- `GET /api/tally/ping` | Tally connectivity check | implemented
- `GET /api/tally/export/{invoiceId}` | Tally export trigger | implemented
- `GET /api/hsn/suggest` | HSN suggestion by name | implemented
- `GET /api/catalog/products` | public product catalog | implemented
- `GET /api/catalog/products/by-sku/{sku}` | public product by SKU | implemented
- `POST /api/users/register` | generic user create | implemented
- `GET /api/users/all` | list users | implemented
- `GET /api/users/{id}` | user lookup | implemented
- `GET /api/test`, `GET /api/retailer/test`, `GET /api/wholesaler/test` | test endpoints | implemented
- Dashboard Express server: no meaningful `/api` routes registered | missing/unused

## 8. Frontend Pages and Components

### Flutter retailer app

- `/splash`: checks stored auth token via `authProvider`; working
- `/welcome`: static entry page; working
- `/login`: calls `POST /api/auth/login`; working
- `/signup`: calls retailer register flow; working, OTP not truly enforced end-to-end
- `/connect`: calls wholesaler search and retailer connection APIs; working
- `/home`: retailer dashboard shell; mostly navigation/status surface, not deeply data-driven
- `/wholesalers`: uses approved wholesaler provider; working
- `/new-order`: fetches products/cart, updates cart, calls checkout; working
- `/orders`: calls retailer order list API; working
- order detail screen: calls retailer order detail API; working
- `/payments`: no payment API calls; mock data/UI only
- `/account`: logout/profile shell; working

### React wholesaler dashboard

- `/login`: calls wholesaler login API; working
- `/signup`: send OTP, verify OTP, register wholesaler; working as mock OTP flow
- `/dashboard`: calls KPI, territory, activity APIs; partially real because territory data is partly hardcoded in backend and UI copy is static
- `/orders`: calls wholesaler order list API; working
- `/orders/:id`: calls order detail, accept/reject/status/edit/finalize invoice APIs; working
- `/invoices/:invoiceId`: calls invoice preview/export Tally APIs; working
- `/connection-requests`: calls wholesaler connections APIs; working
- `/categories`: calls category APIs; working
- `/categories/:categoryId`: calls category/subcategory APIs; working
- `/products/new`: calls category/subcategory/product create + HSN suggest APIs; working
- `/business`: product list and visibility/active toggles are real; `Business Info` tab is placeholder
- `/retailers`: uses `/wholesaler/connections` and credit summary API; partially real
- `/retailers/:id`: credit summary + statement + orders are partly real, but owner/location/GST display is hardcoded mock data
- `/khatabook`: uses real ledger summary/list services; more real than older docs imply, but filtering and actions are still lightweight/mock-ish
- `/analytics`: pure mock chart data; backend analytics APIs not used
- `/settings`: real settings + visibility + Tally ping; notifications/security sections are UI only
- Route protection: no real guarded route wrapper; pages render and rely on axios `401/403` redirect

## 9. Known Bugs or Issues

- `SecurityConfig` permits all routes, so backend authorization is effectively disabled.
- `application-prod.properties` must not use destructive DDL (`create`). Use `validate` (or migrations) to avoid wiping production data.
- Stock quantities are treated as **base units** consistently in ordering/invoicing flow (order stock mutations convert using `unitsPerSelling`).
- Order acceptance posts ledger DEBIT only for the remaining credit exposure, and posts ledger CREDIT immediately for wholesaler-entered paid amounts at acceptance.
- Invoice schema allows multiple invoices per order, but repository/service logic assumes one invoice per order.
- OTP is insecure: stored in-memory, logged, and returned in API response.
- JWT secret is hardcoded in source.
- Dashboard retailer profile shows hardcoded location/GST/owner details rather than fully backend-driven data.
- Analytics page is mock-only despite backend analytics endpoints existing.
- Flutter payments screen is mock-only even though backend payment API exists.
- Backend dashboard territory stats use all retailers globally plus hardcoded top/risky areas, not wholesaler-scoped real analytics.
- `DiyaWholesalerDashboard/server` and docs imply session, Passport, and Drizzle usage, but the actual app uses Spring JWT and the Express server is mostly scaffold-only.
- Verification was limited: Maven wrapper failed in this sandbox, and dashboard `npm run check` failed with an environment `EPERM` path issue.

## 10. Missing Core Features

- Proper RBAC enforcement and secure production auth
- Token refresh and password reset
- Real OTP/SMS provider integration
- Input validation/error normalization across APIs
- Payment collection UI on Flutter and payment verification UI on dashboard
- Notifications: order, payment, connection request
- Product image upload/media storage
- Bulk import/export for products
- Real analytics/reporting/export
- Production migrations and data retention strategy
- Automated tests across backend, Flutter, and dashboard
- Observability, audit logs, rate limiting, and admin tooling

## 11. System Readiness Assessment

Current state: **Prototype / early MVP, not production ready**.

Why:

- Core business flows exist end-to-end for ordering and basic wholesaler operations.
- Two user-facing apps are present and partially integrated.
- But production blockers are severe: open security, destructive schema config, financial and stock double-posting around invoices, mock OTP, sparse tests, and several pages still mocked or partially wired.

## 12. Suggested Next Development Milestones

1. Lock down security and persistence: restore Spring RBAC, remove `permitAll("/**")`, externalize JWT secret, replace `ddl-auto=create` with migrations.
2. Fix financial integrity: make invoice generation idempotent, prevent double stock deduction, prevent double ledger debit, enforce one invoice per order.
3. Finish payment workflows: wire Flutter payments to `/api/retailer/payments`, add dashboard confirm/reject UI for wholesaler payments.
4. Replace mock surfaces with real data: dashboard analytics, retailer profile details, business info, and any remaining Khatabook actions.
5. Add quality gates: request validation, service/controller tests, frontend integration checks, and a documented deployment path.
