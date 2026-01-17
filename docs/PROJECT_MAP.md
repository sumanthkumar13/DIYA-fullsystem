# Diya B2B Platform - Project Map

## Repository Structure

```
Diya_app/
├── backend/                    # Spring Boot REST API
│   ├── src/main/java/com/diya/backend/
│   │   ├── controller/         # 22 REST controllers
│   │   ├── service/            # Business logic layer
│   │   ├── entity/             # JPA entities (14 entities)
│   │   ├── repository/         # Spring Data JPA repositories
│   │   ├── dto/                # Data Transfer Objects
│   │   ├── config/             # Security, JWT, CORS config
│   │   └── util/               # Utilities
│   └── pom.xml                 # Maven dependencies
│
├── diya_frontend/              # Flutter mobile app (Retailer)
│   ├── lib/
│   │   ├── screens/           # 14+ screen files
│   │   ├── services/           # 6 API service classes
│   │   ├── providers/          # Riverpod state providers
│   │   ├── models/             # Data models
│   │   ├── widgets/            # Reusable widgets
│   │   └── config/             # Dio client config
│   └── pubspec.yaml
│
└── DiyaWholesalerDashboard/    # React web dashboard (Wholesaler)
    ├── client/src/
    │   ├── pages/              # 19 page components
    │   ├── components/         # UI components
    │   ├── services/             # API services
    │   └── hooks/               # React hooks
    ├── server/                 # Express server
    └── package.json
```

## Technology Stack

### Backend (`backend/`)
- **Framework**: Spring Boot 3.5.7
- **Language**: Java 17
- **Database**: PostgreSQL (via JPA/Hibernate)
- **Security**: Spring Security + JWT (jjwt 0.11.5)
- **Build Tool**: Maven
- **Key Dependencies**:
  - `spring-boot-starter-data-jpa` - Database access
  - `spring-boot-starter-web` - REST API
  - `spring-boot-starter-security` - Authentication
  - `lombok` - Boilerplate reduction
  - `postgresql` - Database driver

### Flutter Frontend (`diya_frontend/`)
- **Framework**: Flutter 3.5.0+
- **State Management**: Riverpod 2.6.1
- **HTTP Client**: Dio 5.9.0
- **Storage**: flutter_secure_storage 9.2.4 (JWT tokens)
- **Platform**: Android, iOS, Web, Windows, Linux, macOS

### Wholesaler Dashboard (`DiyaWholesalerDashboard/`)
- **Framework**: React 19.2.0 + TypeScript 5.6.3
- **Build Tool**: Vite 7.1.9
- **Routing**: Wouter 3.3.5
- **Data Fetching**: TanStack Query 5.60.5
- **UI Components**: Radix UI + Tailwind CSS 4.1.14
- **Server**: Express 4.21.2 (minimal, mostly static)
- **Database ORM**: Drizzle ORM 0.39.1

## Core Modules

### 1. Authentication Module
**Location**: `backend/src/main/java/com/diya/backend/controller/AuthController.java`

- **OTP-based Registration**: Send/verify OTP via phone
- **JWT Authentication**: Token-based auth for all protected endpoints
- **Role-based Access**: WHOLESALER, RETAILER, ADMIN roles
- **Dual Login**: Supports email or phone as identifier
- **Token Storage**: Flutter uses secure storage, Dashboard uses sessions

### 2. Connection Management
**Location**: 
- `backend/.../controller/RetailerConnectionController.java`
- `backend/.../controller/WholesalerConnectionController.java`
- `backend/.../controller/RetailerWholesalerDiscoveryController.java`

- **Wholesaler Discovery**: Retailers search by business name or invite code
- **Connection Requests**: Retailer requests → Wholesaler approves/rejects
- **Connection Status**: PENDING, APPROVED, REJECTED, BLOCKED
- **Visibility Modes**: PUBLIC (discoverable) or PRIVATE (invite-only)

### 3. Product Catalog
**Location**:
- `backend/.../controller/WholesalerProductController.java`
- `backend/.../controller/RetailerProductController.java`
- `backend/.../controller/CategoryController.java`
- `backend/.../controller/SubCategoryController.java`

- **Hierarchical Categories**: Category → SubCategory (with self-referential nesting)
- **Product Management**: CRUD operations for wholesalers
- **Retailer Catalog**: Filtered by connection status
- **Stock Management**: Reserved stock for pending orders
- **Product Visibility**: `visibleToRetailer` flag

### 4. Cart & Orders
**Location**:
- `backend/.../controller/RetailerCartController.java`
- `backend/.../controller/RetailerOrderController.java`
- `backend/.../controller/WholesalerOrderController.java`

- **Multi-Wholesaler Carts**: Separate cart per wholesaler-retailer pair
- **Order Lifecycle**: PLACED → ACCEPTED → PACKING → DISPATCHED → DELIVERED → COMPLETED
- **Order Cancellation**: Retailer can cancel (PLACED only), Wholesaler can cancel
- **Order Numbering**: Auto-generated with prefix (e.g., DIYA-ORD-001)
- **Price Snapshots**: Order items store price at time of order

### 5. Payments & Ledger
**Location**:
- `backend/.../controller/RetailerPaymentController.java`
- `backend/.../controller/WholesalerPaymentController.java`
- `backend/.../controller/LedgerController.java`

- **Payment Recording**: Retailer records payment (UPI, CASH, NEFT, etc.)
- **Payment Verification**: Wholesaler confirms/rejects payments
- **Ledger System**: DEBIT (retailer owes) / CREDIT (retailer paid)
- **Outstanding Balance**: Calculated from ledger entries
- **Khatabook View**: Statement view for wholesaler-retailer pair

### 6. Analytics & Dashboard
**Location**:
- `backend/.../controller/DashboardController.java`
- `backend/.../controller/AnalyticsController.java`

- **KPI Metrics**: Orders, revenue, retailers count
- **Territory Stats**: Geographic distribution
- **Activity Feed**: Recent orders, payments, connections
- **Monthly Sales Trends**: Time-series analytics

## Core Flows

### Authentication Flow
```
1. User enters phone → POST /api/auth/send-otp
2. User enters OTP → POST /api/auth/verify-otp
3. User registers → POST /api/auth/register-retailer (or /register for wholesaler)
4. Backend returns JWT token
5. Token stored in FlutterSecureStorage (Flutter) or session (Dashboard)
6. All subsequent requests include: Authorization: Bearer <token>
```

### Connection Flow
```
1. Retailer searches wholesalers → GET /api/retailer/wholesalers/search?q=<query>
2. Retailer requests connection → POST /api/retailer/connections/request
3. Wholesaler views pending → GET /api/wholesaler/connections/requests
4. Wholesaler approves/rejects → PUT /api/wholesaler/connections/{id}
5. Retailer sees approved → GET /api/retailer/connections/approved
```

### Order Flow
```
1. Retailer browses products → GET /api/retailer/products?wholesalerId=<id>
2. Retailer adds to cart → POST /api/retailer/cart/add
3. Retailer views cart → GET /api/retailer/cart?wholesalerId=<id>
4. Retailer checks out → POST /api/retailer/orders/checkout
5. Order created (status: PLACED) → GET /api/retailer/orders
6. Wholesaler accepts → POST /api/wholesaler/orders/{id}/accept
7. Wholesaler updates status → POST /api/wholesaler/orders/{id}/packing
8. Wholesaler dispatches → POST /api/wholesaler/orders/{id}/dispatch
9. Wholesaler delivers → POST /api/wholesaler/orders/{id}/deliver
10. Order completed → POST /api/wholesaler/orders/{id}/complete
```

### Payment Flow
```
1. Retailer records payment → POST /api/retailer/payments
   Body: { orderId, amount, mode, reference, note }
2. Payment status: PENDING_VERIFICATION
3. Wholesaler views pending → GET /api/wholesaler/payments/pending
4. Wholesaler confirms → POST /api/wholesaler/payments/{id}/confirm
5. Ledger entry created (CREDIT)
6. Order payment status updated (PARTIAL/PAID)
```

## Key Design Decisions

1. **Multi-Wholesaler Support**: Each retailer can connect to multiple wholesalers, with separate carts per wholesaler
2. **Price Snapshots**: Order items store price at time of order to prevent price changes affecting placed orders
3. **Connection Gating**: Retailers can only view products from approved wholesalers
4. **JWT Authentication**: Stateless auth suitable for mobile and web
5. **Ledger System**: Separate from payments, tracks outstanding balances (Khatabook-style)
6. **Order Numbering**: Auto-generated with wholesaler-specific prefix
7. **Visibility Modes**: Wholesalers can be PUBLIC (discoverable) or PRIVATE (invite-only)

## File Locations

- **Backend Controllers**: `backend/src/main/java/com/diya/backend/controller/`
- **Backend Entities**: `backend/src/main/java/com/diya/backend/entity/`
- **Backend Services**: `backend/src/main/java/com/diya/backend/service/`
- **Flutter Screens**: `diya_frontend/lib/screens/`
- **Flutter Services**: `diya_frontend/lib/services/`
- **Dashboard Pages**: `DiyaWholesalerDashboard/client/src/pages/`
