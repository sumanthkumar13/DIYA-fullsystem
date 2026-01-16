# Diya B2B Platform - Frontend Map

Complete frontend architecture documentation for Flutter mobile app and React web dashboard.

## Flutter Mobile App (diya_frontend/)

### Project Structure

```
diya_frontend/lib/
├── main.dart                    # App entry point, route definitions
├── config/
│   └── dio_client.dart         # HTTP client with JWT interceptor
├── screens/                     # 14+ screen files
│   ├── splash/
│   ├── auth/
│   ├── connect/
│   ├── home/
│   ├── orders/
│   ├── payments/
│   ├── account/
│   ├── new_order/
│   └── wholesaler/
├── services/                    # 6 API service classes
│   ├── auth_service.dart
│   ├── product_service.dart
│   ├── cart_service.dart
│   ├── order_service.dart
│   ├── connection_service.dart
│   └── wholesaler_discovery_service.dart
├── providers/                   # Riverpod state providers
│   ├── auth_provider.dart
│   ├── cart_provider.dart
│   ├── products_provider.dart
│   ├── approved_wholesalers_provider.dart
│   └── selected_wholesaler_provider.dart
├── models/                      # Data models
│   ├── cart/
│   ├── orders/
│   ├── products/
│   ├── connections/
│   └── common/
└── widgets/                      # Reusable widgets
```

### Technology Stack

- **Framework**: Flutter 3.5.0+
- **State Management**: Riverpod 2.6.1
- **HTTP Client**: Dio 5.9.0
- **Storage**: flutter_secure_storage 9.2.4
- **Platforms**: Android, iOS, Web, Windows, Linux, macOS

### Screens

#### Authentication Screens

| Screen | File | Route | Description |
|--------|------|-------|-------------|
| Splash Screen | `screens/splash/splash_screen.dart` | `/splash` | Initial loading screen, checks auth state |
| Welcome Screen | `screens/auth/welcome_screen.dart` | `/welcome` | Landing page with login/signup options |
| Login Screen | `screens/auth/login_screen.dart` | `/login` | Email/phone + password login |
| Signup Screen | `screens/auth/signup_screen.dart` | `/signup` | OTP-based retailer registration |
| Role Selection | `screens/auth/role_selection.dart` | - | Role selection (if multi-role support) |

#### Main App Screens

| Screen | File | Route | Description |
|--------|------|-------|-------------|
| Retailer Dashboard | `screens/home/retailer_dashboard.dart` | `/home` | Main dashboard with wholesaler cards, quick stats |
| Connect Screen | `screens/connect/connect_screen.dart` | `/connect` | Wholesaler discovery and connection requests |
| Orders Screen | `screens/orders/orders_screen.dart` | `/orders` | List of all orders with status filters |
| Payments Screen | `screens/payments/payments_screen.dart` | `/payments` | Payment history and record new payment |
| Account Screen | `screens/account/account_screen.dart` | `/account` | Profile settings, logout |
| New Order Screen | `screens/new_order/new_order_screen.dart` | `/new-order` | Browse products, add to cart, checkout |

#### Wholesaler Screens (if implemented)

| Screen | File | Route | Description |
|--------|------|-------|-------------|
| Wholesaler Dashboard | `screens/wholesaler/wholesaler_dashboard.dart` | - | Wholesaler view (if multi-role) |
| Connection Requests | `screens/wholesaler/connection_requests_screen.dart` | - | Approve/reject retailer requests |

### Navigation Flow

```
Splash Screen
    ↓
Welcome Screen
    ↓
    ├─→ Login Screen ──→ (Auth Success) ──→ Retailer Dashboard (Home)
    │                                           ↓
    └─→ Signup Screen ──→ (OTP Verify) ──→ Retailer Dashboard (Home)
                                                ↓
                    ┌───────────────────────────┼───────────────────────────┐
                    ↓                           ↓                           ↓
            Orders Screen              Payments Screen            Account Screen
                    │                           │                           │
                    └───────────────────────────┴───────────────────────────┘
                                                │
                                                ↓
                                        New Order Screen (FAB)
                                                
Connect Screen (Optional)
    - Accessible via /connect route
    - Can be accessed from dashboard quick actions
    - Not part of mandatory post-auth flow
```

**Bottom Navigation Tabs:**
- Home (Dashboard)
- Orders
- Payments
- Account

**Floating Action Button (FAB):**
- New Order (opens product browsing)

**Post-Authentication Flow:**
- After successful login or signup, users are **directly navigated to Retailer Dashboard** (`/home`)
- Connect Screen is **optional** and can be accessed when needed via `/connect` route or from dashboard actions

### Services Layer

#### 1. AuthService
**File**: `lib/services/auth_service.dart`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `login(identifier, password)` | `POST /api/auth/login` | Login with email/phone + password |
| `registerRetailer(payload)` | `POST /api/auth/register-retailer` | Register new retailer, saves JWT token |
| `logout()` | - | Clears JWT token from secure storage |
| `getToken()` | - | Retrieves stored JWT token |

**Token Management:**
- Stores JWT in `FlutterSecureStorage` with key `jwt_token`
- Token automatically injected via `DioClient` interceptor

#### 2. ProductService
**File**: `lib/services/product_service.dart`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getProducts(wholesalerId, search, categoryId, subcategoryId, page, size)` | `GET /api/retailer/products` | Get paginated product list for connected wholesaler |
| `getProductDetail(wholesalerId, productId)` | `GET /api/retailer/products/{productId}` | Get product details |

**Used By:**
- `new_order_screen.dart` - Product browsing
- `retailer_dashboard.dart` - Featured products

#### 3. CartService
**File**: `lib/services/cart_service.dart`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getCart(wholesalerId)` | `GET /api/retailer/cart?wholesalerId=uuid` | Get cart for specific wholesaler |
| `addToCart(productId, quantity)` | `POST /api/retailer/cart/add` | Add item to cart |
| `updateCart(productId, quantity)` | `PUT /api/retailer/cart/update` | Update item quantity |
| `removeFromCart(productId)` | `DELETE /api/retailer/cart/remove/{productId}` | Remove item from cart |

**Used By:**
- `new_order_screen.dart` - Cart management
- `cart_provider.dart` - State management

#### 4. OrderService
**File**: `lib/services/order_service.dart`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `checkout(req)` | `POST /api/retailer/orders/checkout` | Checkout cart and create order |

**Used By:**
- `new_order_screen.dart` - Order placement

#### 5. ConnectionService
**File**: `lib/services/connection_service.dart`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getApprovedWholesalers()` | `GET /api/retailer/connections/approved` | Get list of approved wholesalers |
| `myConnections()` | `GET /api/retailer/connections` | Get all connections (pending + approved) |
| `requestConnection(wholesalerId)` | `POST /api/retailer/connections/request` | Request connection with wholesaler |

**Used By:**
- `connect_screen.dart` - Connection management
- `retailer_dashboard.dart` - Display connected wholesalers

#### 6. WholesalerDiscoveryService
**File**: `lib/services/wholesaler_discovery_service.dart`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `searchWholesalers(q)` | `GET /api/retailer/wholesalers/search?q=query` | Search wholesalers by name or invite code |

**Used By:**
- `connect_screen.dart` - Wholesaler search

### State Management (Riverpod)

#### Providers

| Provider | File | Purpose |
|----------|------|---------|
| `authProvider` | `providers/auth_provider.dart` | Current user authentication state |
| `cartProvider` | `providers/cart_provider.dart` | Shopping cart state |
| `productsProvider` | `providers/products_provider.dart` | Product list state |
| `approvedWholesalersProvider` | `providers/approved_wholesalers_provider.dart` | Connected wholesalers list |
| `selectedWholesalerProvider` | `providers/selected_wholesaler_provider.dart` | Currently selected wholesaler |

**Usage Pattern:**
```dart
final authState = ref.watch(authProvider);
final cartState = ref.watch(cartProvider);
```

### Networking Configuration

#### DioClient
**File**: `lib/config/dio_client.dart`

**Configuration:**
- Base URL: `http://localhost:8081` (configurable)
- Timeout: 10 seconds
- Content-Type: `application/json`

**Interceptors:**
1. **Auth Interceptor** (`_AuthInterceptor`):
   - Reads JWT token from `FlutterSecureStorage`
   - Adds `Authorization: Bearer <token>` header to all requests
   - Automatically handles token injection

2. **Logging Interceptor**:
   - Logs request/response for debugging
   - Logs errors with status codes

**Example Request:**
```dart
final response = await DioClient.dio.get(
  '/api/retailer/products',
  queryParameters: {'wholesalerId': 'uuid'},
  options: Options(headers: await _authHeaders()),
);
```

### Models

#### Data Models Structure

| Model | File | Description |
|-------|------|-------------|
| `CartDTO` | `models/cart/cart_dto.dart` | Cart with items and totals |
| `OrderCheckoutRequest` | `models/orders/order_checkout.dart` | Checkout request payload |
| `OrderCheckoutResponse` | `models/orders/order_checkout.dart` | Checkout response |
| `ProductResponseDTO` | `models/products/product_dto.dart` | Product list item |
| `ProductDetailDTO` | `models/products/product_dto.dart` | Product details |
| `ConnectionResponseDTO` | `models/connections/connection_response_dto.dart` | Connection info |
| `WholesalerSearchModel` | `models/wholesaler_search_model.dart` | Wholesaler search result |
| `PageResponse<T>` | `models/common/page_response.dart` | Paginated response wrapper |
| `UserModel` | `models/user_model.dart` | User profile data |

### Widgets

**Location**: `lib/widgets/`

Reusable UI components:
- Layout widgets (shell, navigation)
- Form widgets
- Product cards
- Order cards
- Connection cards

### Key Features

1. **Multi-Wholesaler Support**: Retailers can connect to multiple wholesalers
2. **Per-Wholesaler Carts**: Separate cart for each wholesaler
3. **JWT Authentication**: Secure token-based auth with automatic header injection
4. **State Management**: Riverpod for reactive state updates
5. **Offline Support**: Token persistence via secure storage

---

## Wholesaler Dashboard (DiyaWholesalerDashboard/)

### Project Structure

```
DiyaWholesalerDashboard/
├── client/src/
│   ├── App.tsx                 # Main router component
│   ├── main.tsx                # React entry point
│   ├── pages/                  # 19 page components
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   └── ui/                 # 55+ UI components (Radix UI)
│   ├── services/               # 4 API service files
│   ├── hooks/                  # React hooks
│   └── lib/                    # Utilities
├── server/                     # Express server
│   ├── app.ts
│   ├── routes.ts
│   └── storage.ts
└── shared/
    └── schema.ts               # Shared types/schemas
```

### Technology Stack

- **Framework**: React 19.2.0 + TypeScript 5.6.3
- **Build Tool**: Vite 7.1.9
- **Routing**: Wouter 3.3.5
- **Data Fetching**: TanStack Query 5.60.5
- **UI Components**: Radix UI + Tailwind CSS 4.1.14
- **Forms**: React Hook Form 7.66.0 + Zod 3.25.76
- **Server**: Express 4.21.2 (minimal, mostly static)
- **Database ORM**: Drizzle ORM 0.39.1
- **Charts**: Recharts 2.15.4

### Pages

#### Public Pages

| Page | File | Route | Description |
|------|------|-------|-------------|
| Landing Page | `pages/landing.tsx` | `/` | Public landing page |
| Login | `pages/login.tsx` | `/login` | Wholesaler login |
| Signup | `pages/signup.tsx` | `/signup` | Wholesaler registration |
| Onboarding | `pages/onboarding.tsx` | `/onboarding` | Onboarding checklist |

#### Protected Pages (App Routes)

| Page | File | Route | Description |
|------|------|-------|-------------|
| Dashboard | `pages/dashboard.tsx` | `/dashboard` | Main dashboard with KPIs, activity feed |
| Orders | `pages/orders.tsx` | `/orders` | Order list with filters |
| Order Detail | `pages/order-detail.tsx` | `/orders/:id` | Order details, status updates |
| Retailers | `pages/retailers.tsx` | `/retailers` | Connected retailers list |
| Retailer Profile | `pages/retailer-profile.tsx` | `/retailers/:id` | Retailer details, outstanding balance |
| Connection Requests | `pages/connection-requests.tsx` | `/connection-requests` | Approve/reject retailer requests |
| Categories | `pages/categories.tsx` | `/categories` | Category management |
| Category Detail | `pages/CategoryDetailPage.tsx` | `/categories/:categoryId` | Category with subcategories |
| SubCategory Page | `pages/SubCategoryPage.tsx` | `/subcategories/:id` | Subcategory management |
| Add Product | `pages/product-new.tsx` | `/products/new` | Create new product |
| Khatabook | `pages/khatabook.tsx` | `/khatabook` | Ledger view, retailer statements |
| Business | `pages/business.tsx` | `/business` | Business profile, settings |
| Analytics | `pages/analytics.tsx` | `/analytics` | Sales analytics, trends |
| Settings | `pages/settings.tsx` | `/settings` | Account settings, visibility mode |
| Not Found | `pages/not-found.tsx` | `*` | 404 page |

### Navigation Structure

```
Landing Page
    ↓
Login / Signup
    ↓
Onboarding (first time)
    ↓
Dashboard (Main Hub)
    ├─→ Orders ──→ Order Detail
    ├─→ Retailers ──→ Retailer Profile
    ├─→ Connection Requests
    ├─→ Categories ──→ Category Detail ──→ SubCategory
    ├─→ Products (New)
    ├─→ Khatabook
    ├─→ Business
    ├─→ Analytics
    └─→ Settings
```

**Layout Structure:**
- All app routes wrapped in `<Layout>` component
- Sidebar navigation (if implemented)
- Header with user info

### Services Layer

**Location**: `client/src/services/`

API service files for backend communication:
- Order services
- Product services
- Retailer services
- Analytics services

**Pattern:**
- Uses TanStack Query for data fetching
- Axios or fetch for HTTP requests
- Session-based authentication (Passport.js)

### State Management

- **TanStack Query**: Server state management, caching, refetching
- **React Context**: Client-side state (if needed)
- **React Hook Form**: Form state management

### Routing

**File**: `client/src/App.tsx`

**Route Structure:**
```tsx
<Switch>
  <Route path="/" component={LandingPage} />
  <Route path="/login" component={LoginPage} />
  <Route path="/signup" component={SignupFlow} />
  
  <Route path="/dashboard">
    <AppLayout><Dashboard /></AppLayout>
  </Route>
  
  {/* More protected routes */}
</Switch>
```

### UI Components

**Location**: `client/src/components/ui/`

55+ Radix UI components:
- Buttons, Cards, Tables
- Dialogs, Dropdowns, Menus
- Forms, Inputs, Selects
- Charts, Data tables
- Toast notifications

**Styling:**
- Tailwind CSS 4.1.14
- Custom theme configuration
- Dark mode support (next-themes)

### Server (Express)

**Location**: `server/`

Minimal Express server:
- Static file serving
- API proxy (if needed)
- Session management (Passport.js)
- WebSocket support (if implemented)

**Files:**
- `app.ts` - Express app setup
- `routes.ts` - Route definitions
- `storage.ts` - Storage interface
- `index-dev.ts` - Development server
- `index-prod.ts` - Production server

### Key Features

1. **Session Authentication**: Passport.js with local strategy
2. **Real-time Updates**: WebSocket support (if implemented)
3. **Responsive Design**: Mobile-friendly with Tailwind
4. **Data Visualization**: Charts for analytics
5. **Form Validation**: Zod schemas with React Hook Form
6. **Type Safety**: Full TypeScript coverage

---

## Integration Points

### Flutter ↔ Backend
- Base URL: `http://localhost:8081`
- Auth: JWT tokens in `Authorization` header
- Storage: `FlutterSecureStorage` for tokens
- HTTP: Dio with interceptors

### Dashboard ↔ Backend
- Base URL: `http://localhost:8081` (same backend)
- Auth: Session-based (Passport.js) or JWT
- HTTP: Axios or fetch
- CORS: Configured in `SecurityConfig.java`

### Shared Backend
Both frontends use the same Spring Boot backend:
- Flutter: Mobile retailer app
- Dashboard: Web wholesaler app
- Unified API: `/api/retailer/**` and `/api/wholesaler/**`

---

## Development Setup

### Flutter
```bash
cd diya_frontend
flutter pub get
flutter run
```

### Dashboard
```bash
cd DiyaWholesalerDashboard
npm install
npm run dev:client  # Client on port 5000
npm run dev         # Server
```

### Backend
```bash
cd backend
mvn spring-boot:run  # Runs on port 8081
```
