# Project Status - Diya B2B Platform

Current implementation status of core modules and features.

## Authentication

- [x] **DONE** - User registration (Retailer & Wholesaler)
- [x] **DONE** - OTP-based phone verification
- [x] **DONE** - Email/Phone + Password login
- [x] **DONE** - JWT token generation and validation
- [x] **DONE** - Role-based access control (WHOLESALER, RETAILER, ADMIN)
- [x] **DONE** - Token storage (FlutterSecureStorage for mobile)
- [ ] **TODO** - Token refresh mechanism
- [ ] **TODO** - Password reset flow
- [ ] **TODO** - Two-factor authentication (optional)

## Connection

- [x] **DONE** - Wholesaler discovery (search by name/invite code)
- [x] **DONE** - Connection request from retailer
- [x] **DONE** - Connection approval/rejection by wholesaler
- [x] **DONE** - Connection status management (PENDING, APPROVED, REJECTED, BLOCKED)
- [x] **DONE** - Visibility modes (PUBLIC, PRIVATE)
- [x] **DONE** - Retailer view of approved connections
- [x] **DONE** - Wholesaler view of all connections
- [ ] **TODO** - Connection blocking/unblocking
- [ ] **TODO** - Connection request notifications

## Catalog

- [x] **DONE** - Category management (CRUD)
- [x] **DONE** - SubCategory management with hierarchy
- [x] **DONE** - Product CRUD operations
- [x] **DONE** - Product visibility gating (connection-based)
- [x] **DONE** - Stock management
- [x] **DONE** - Reserved stock for pending orders
- [x] **DONE** - Product search and filtering
- [x] **DONE** - Category tree view
- [ ] **TODO** - Bulk product import/export
- [ ] **TODO** - Product image upload
- [ ] **TODO** - Product variants (size, color, etc.)

## Orders

- [x] **DONE** - Multi-wholesaler cart system
- [x] **DONE** - Add/update/remove cart items
- [x] **DONE** - Cart per wholesaler-retailer pair
- [x] **DONE** - Order checkout from cart
- [x] **DONE** - Order number generation
- [x] **DONE** - Order lifecycle (PLACED → ACCEPTED → PACKING → DISPATCHED → DELIVERED → COMPLETED)
- [x] **DONE** - Order cancellation (retailer - PLACED only)
- [x] **DONE** - Order status updates by wholesaler
- [x] **DONE** - Wholesaler order accept with optional payload (paymentMode, creditDays)
- [x] **DONE** - Wholesaler order edit (items/quantities)
- [x] **DONE** - Price snapshots in order items
- [x] **DONE** - Order list with filters
- [x] **DONE** - Order detail view (retailer app + dashboard)
- [ ] **TODO** - Order history archive
- [ ] **TODO** - Order tracking (real-time updates)
- [ ] **TODO** - Order notifications (push/email)
- [ ] **TODO** - Reorder functionality

## Payments + Ledger

- [x] **DONE** - Payment recording by retailer (backend API + Flutter UI wired)
- [x] **DONE** - Payment modes (UPI, CASH, NEFT, NET_BANKING, RTGS)
- [x] **DONE** - Payment verification workflow (backend)
- [x] **DONE** - Payment confirmation/rejection by wholesaler (backend API + dashboard UI wired)
- [x] **DONE** - Ledger entry system (DEBIT/CREDIT)
- [x] **DONE** - Outstanding balance calculation
- [x] **DONE** - Retailer statement view (backend API + dashboard wired)
- [x] **DONE** - Payment status tracking
- [x] **DONE** - Order-payment linkage
- [x] **DONE** - Flutter: Payments screen wired to `POST /api/retailer/payments`
- [x] **DONE** - Dashboard: Khatabook wired to ledger API; payments pending/confirm/reject wired
- [ ] **TODO** - Payment gateway integration (Razorpay, Stripe)
- [ ] **TODO** - Automated payment reminders
- [ ] **TODO** - Payment reconciliation
- [ ] **TODO** - Payment reports and analytics

## Analytics

- [x] **DONE** - Dashboard KPI metrics (dashboard uses API)
- [x] **DONE** - Territory statistics (dashboard uses API)
- [x] **DONE** - Activity feed (dashboard uses API)
- [x] **DONE** - Monthly sales trends (backend API)
- [x] **DONE** - Wholesaler summary analytics (backend API; dashboard Analytics page uses mock charts)
- [x] **DONE** - Retailer summary analytics (backend API)
- [ ] **TODO** - Dashboard: wire Analytics page to /api/analytics/wholesaler/* endpoints
- [ ] **TODO** - Advanced sales reports
- [ ] **TODO** - Product performance analytics
- [ ] **TODO** - Retailer behavior analytics
- [ ] **TODO** - Revenue forecasting
- [ ] **TODO** - Export analytics data (CSV, PDF)

## Deployment

- [ ] **TODO** - Production database setup
- [ ] **TODO** - Environment configuration (dev, staging, prod)
- [ ] **TODO** - Docker containerization
- [ ] **TODO** - CI/CD pipeline setup
- [ ] **TODO** - Backend deployment (AWS/Heroku/etc.)
- [ ] **TODO** - Flutter app build and distribution (Play Store, App Store)
- [ ] **TODO** - Dashboard deployment (Vercel/Netlify/etc.)
- [ ] **TODO** - SSL/HTTPS configuration
- [ ] **TODO** - Database backup strategy
- [ ] **TODO** - Monitoring and logging setup
- [ ] **TODO** - Error tracking (Sentry, etc.)

## Testing

- [ ] **TODO** - Unit tests for services
- [ ] **TODO** - Integration tests for controllers
- [ ] **TODO** - Repository tests
- [ ] **TODO** - Flutter widget tests
- [ ] **TODO** - Flutter integration tests
- [ ] **TODO** - Dashboard component tests
- [ ] **TODO** - End-to-end testing
- [ ] **TODO** - Performance testing
- [ ] **TODO** - Security testing

## Documentation

- [x] **DONE** - Project architecture documentation
- [x] **DONE** - API endpoint documentation
- [x] **DONE** - Database schema documentation
- [x] **DONE** - Frontend architecture documentation
- [x] **DONE** - Engineering standards documentation
- [ ] **TODO** - API usage examples
- [ ] **TODO** - Deployment guide
- [ ] **TODO** - Developer onboarding guide
- [ ] **TODO** - User manuals (Retailer & Wholesaler)

## Performance & Optimization

- [ ] **TODO** - Database query optimization
- [ ] **TODO** - API response caching
- [ ] **TODO** - Image optimization and CDN
- [ ] **TODO** - Pagination for large lists
- [ ] **TODO** - Lazy loading for Flutter app
- [ ] **TODO** - Code splitting for Dashboard

## Security

- [x] **DONE** - JWT authentication
- [ ] **NOT DONE** - Role-based authorization (Spring Security is currently in temporary `permitAll("/**")` mode)
- [x] **DONE** - Password hashing (BCrypt)
- [ ] **TODO** - Rate limiting
- [ ] **TODO** - Input validation and sanitization
- [ ] **TODO** - SQL injection prevention (already handled by JPA)
- [ ] **TODO** - XSS prevention
- [ ] **TODO** - CORS configuration review
- [ ] **TODO** - Security audit

## Frontend implementation summary (as of codebase review)

**Flutter (retailer app)**  
- **API-wired:** Auth, Connect, Home/Dashboard, Orders list & detail, New Order (products, cart, checkout), Connected Wholesalers (`/wholesalers`).  
- **Mock / UI only:** Payments screen (no `payment_service.dart`, no POST to `/api/retailer/payments`).

**Wholesaler Dashboard**  
- **API-wired:** Login, Signup, Dashboard (KPI, territory, activity), Orders list & detail (accept/reject/status/edit), Connection requests, Categories, Category detail & subcategories, Add product, Settings (visibility).  
- **Mock data:** Retailers list (`retailers.tsx`), Retailer profile (`retailer-profile.tsx`), Khatabook (`khatabook.tsx`), Analytics (`analytics.tsx`). Ledger and payment confirm/reject APIs are not called from the dashboard.

---

**Last Updated**: 2026-04-10  
**Next Review**: Weekly status updates
