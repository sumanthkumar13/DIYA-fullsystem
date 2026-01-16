# Diya B2B Platform - API Map

Complete REST API endpoint documentation for all controllers.

## Authentication Endpoints

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/auth/send-otp` | POST | `{ "phone": "9876543210" }` | `{ "success": boolean, "message": string }` | Public | Flutter: `signup_screen.dart` |
| `/api/auth/verify-otp` | POST | `{ "phone": "9876543210", "otp": "123456" }` | `{ "success": boolean, "message": string }` | Public | Flutter: `signup_screen.dart` |
| `/api/auth/register` | POST | `RegisterWholesalerRequest` | `{ "success": boolean, "data": AuthResponse }` | Public | Dashboard: `signup.tsx` |
| `/api/auth/register-retailer` | POST | `RegisterRetailerRequest` | `{ "success": boolean, "data": AuthResponse }` | Public | Flutter: `signup_screen.dart` |
| `/api/auth/login` | POST | `{ "identifier": string, "password": string }` | `{ "success": boolean, "data": AuthResponse }` | Public | Flutter: `login_screen.dart`, Dashboard: `login.tsx` |

**AuthResponse Structure:**
```json
{
  "token": "jwt_token_string",
  "user": { "id": "uuid", "role": "RETAILER|WHOLESALER", ... }
}
```

## Retailer - Wholesaler Discovery

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/retailer/wholesalers/search` | GET | Query: `?q=<businessName or inviteCode>` | `List<WholesalerSearchDTO>` | Public | Flutter: `connect_screen.dart` via `WholesalerDiscoveryService` |

## Retailer - Connections

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/retailer/connections/request` | POST | `{ "wholesalerId": "uuid" }` | `ConnectionResponseDTO` | Retailer | Flutter: `connect_screen.dart` via `ConnectionService` |
| `/api/retailer/connections` | GET | - | `List<ConnectionResponseDTO>` | Retailer | Flutter: `ConnectionService.myConnections()` |
| `/api/retailer/connections/approved` | GET | - | `List<ConnectionResponseDTO>` | Retailer | Flutter: `connect_screen.dart` via `ConnectionService` |

## Retailer - Products

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/retailer/products` | GET | Query: `?wholesalerId=uuid&search=string&categoryId=uuid&subcategoryId=uuid&page=0&size=20` | `Page<ProductResponseDTO>` | Retailer | Flutter: `ProductService.getProducts()` |
| `/api/retailer/products/{productId}` | GET | Query: `?wholesalerId=uuid` | `ProductDetailDTO` | Retailer | Flutter: `ProductService.getProductDetail()` |

## Retailer - Cart

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/retailer/cart` | GET | Query: `?wholesalerId=uuid` | `CartDTO` | Retailer | Flutter: `CartService.getCart()` |
| `/api/retailer/cart/add` | POST | `{ "productId": "uuid", "quantity": int }` | `CartDTO` | Retailer | Flutter: `CartService.addToCart()` |
| `/api/retailer/cart/update` | PUT | `{ "productId": "uuid", "quantity": int }` | `CartDTO` | Retailer | Flutter: `CartService.updateCart()` |
| `/api/retailer/cart/remove/{productId}` | DELETE | - | `CartDTO` | Retailer | Flutter: `CartService.removeFromCart()` |

## Retailer - Orders

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/retailer/orders/checkout` | POST | `OrderCheckoutRequest` | `OrderCheckoutResponse` | Retailer | Flutter: `OrderService.checkout()` |
| `/api/retailer/orders` | GET | - | `List<OrderListItemDTO>` | Retailer | Flutter: `orders_screen.dart` |
| `/api/retailer/orders/{orderId}` | GET | - | `OrderDetailDTO` | Retailer | Flutter: `orders_screen.dart` |
| `/api/retailer/orders/{orderId}/cancel` | POST | - | `Order` | Retailer | Flutter: `orders_screen.dart` |

**OrderCheckoutRequest Structure:**
```json
{
  "wholesalerId": "uuid",
  "deliveryAddress": "string",
  "note": "string (optional)"
}
```

## Retailer - Payments

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/retailer/payments` | POST | `{ "orderId": "uuid", "amount": double, "mode": "UPI|CASH|NEFT|NET_BANKING|RTGS", "reference": "string (optional)", "note": "string (optional)" }` | `Payment` | Retailer | Flutter: `payments_screen.dart` |

## Wholesaler - Products

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/wholesaler/products` | POST | `ProductCreateRequest` | `ProductResponseDTO` | Wholesaler | Dashboard: `product-new.tsx` |
| `/api/wholesaler/products` | GET | Query: `?page=0&size=20&search=string&categoryId=uuid&subcategoryId=uuid` | `Page<ProductResponseDTO>` | Wholesaler | Dashboard: product listing |
| `/api/wholesaler/products/{id}` | GET | - | `ProductResponseDTO` | Wholesaler | Dashboard: product detail |
| `/api/wholesaler/products/{id}` | PUT | `ProductUpdateRequest` | `ProductResponseDTO` | Wholesaler | Dashboard: product edit |

## Wholesaler - Categories

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/wholesaler/categories` | POST | `CategoryCreateRequest` | `Category` | Wholesaler | Dashboard: `categories.tsx` |
| `/api/wholesaler/categories` | GET | - | `List<Category>` | Wholesaler | Dashboard: `categories.tsx` |
| `/api/wholesaler/categories/tree` | GET | - | `List<CategoryTreeDTO>` | Wholesaler | Dashboard: category tree view |

## Wholesaler - SubCategories

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/wholesaler/subcategories` | POST | `SubCategoryCreateRequest` | `SubCategoryDTO` | Wholesaler | Dashboard: `SubCategoryPage.tsx` |
| `/api/wholesaler/subcategories/category/{categoryId}` | GET | - | `List<SubCategoryDTO>` | Wholesaler | Dashboard: `CategoryDetailPage.tsx` |
| `/api/wholesaler/subcategories/children/{parentId}` | GET | - | `List<SubCategoryDTO>` | Wholesaler | Dashboard: nested subcategories |

## Wholesaler - Orders

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/wholesaler/orders` | GET | Query: `?status=string&search=string&dateRange=string&page=int&size=int` | `List<OrderListItemDTO>` | Wholesaler | Dashboard: `orders.tsx` |
| `/api/wholesaler/orders/{orderId}/accept` | POST | - | `Order` | Wholesaler | Dashboard: `order-detail.tsx` |
| `/api/wholesaler/orders/{orderId}/reject` | POST | - | `Order` | Wholesaler | Dashboard: `order-detail.tsx` |
| `/api/wholesaler/orders/{orderId}/packing` | POST | - | `Order` | Wholesaler | Dashboard: `order-detail.tsx` |
| `/api/wholesaler/orders/{orderId}/dispatch` | POST | - | `Order` | Wholesaler | Dashboard: `order-detail.tsx` |
| `/api/wholesaler/orders/{orderId}/deliver` | POST | - | `Order` | Wholesaler | Dashboard: `order-detail.tsx` |
| `/api/wholesaler/orders/{orderId}/complete` | POST | - | `Order` | Wholesaler | Dashboard: `order-detail.tsx` |
| `/api/wholesaler/orders/{orderId}/cancel` | POST | - | `Order` | Wholesaler | Dashboard: `order-detail.tsx` |

## Wholesaler - Connections

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/wholesaler/connections` | GET | - | `List<ConnectionResponseDTO>` | Wholesaler | Dashboard: `connection-requests.tsx` |
| `/api/wholesaler/connections/requests` | GET | - | `List<ConnectionResponseDTO>` | Wholesaler | Dashboard: `connection-requests.tsx` |
| `/api/wholesaler/connections/{connectionId}` | PUT | `{ "status": "APPROVED|REJECTED|BLOCKED" }` | `ConnectionResponseDTO` | Wholesaler | Dashboard: `connection-requests.tsx` |

## Wholesaler - Payments

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/wholesaler/payments` | GET | - | `List<Payment>` | Wholesaler | Dashboard: payments view |
| `/api/wholesaler/payments/pending` | GET | - | `List<Payment>` | Wholesaler | Dashboard: pending payments |
| `/api/wholesaler/payments/{paymentId}/confirm` | POST | - | `Payment` | Wholesaler | Dashboard: payment verification |
| `/api/wholesaler/payments/{paymentId}/reject` | POST | `{ "reason": "string (optional)" }` | `Payment` | Wholesaler | Dashboard: payment rejection |

## Wholesaler - Dashboard

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/wholesaler/dashboard/kpi` | GET | - | `DashboardKpiDTO` | Wholesaler | Dashboard: `dashboard.tsx` |
| `/api/wholesaler/dashboard/territory` | GET | - | `TerritoryDTO` | Wholesaler | Dashboard: `dashboard.tsx` |
| `/api/wholesaler/dashboard/activity` | GET | - | `List<ActivityItemDTO>` | Wholesaler | Dashboard: `dashboard.tsx` |

## Wholesaler - Settings

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/wholesaler/settings/visibility` | GET | - | `{ "visibilityMode": "PUBLIC|PRIVATE" }` | Wholesaler | Dashboard: `settings.tsx` |
| `/api/wholesaler/settings/visibility` | PUT | `{ "visibilityMode": "PUBLIC|PRIVATE" }` | `{ "visibilityMode": "PUBLIC|PRIVATE" }` | Wholesaler | Dashboard: `settings.tsx` |

## Analytics

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/analytics/wholesaler/summary` | GET | - | `Map<String, Object>` | Wholesaler | Dashboard: `analytics.tsx` |
| `/api/analytics/retailer/summary` | GET | - | `Map<String, Object>` | Retailer | Flutter: analytics (if implemented) |
| `/api/analytics/wholesaler/monthly-sales` | GET | - | `Map<String, Object>` | Wholesaler | Dashboard: `analytics.tsx` |

## Ledger

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/ledger/wholesaler` | GET | Query: `?fromDate=yyyy-MM-dd&toDate=yyyy-MM-dd&type=DEBIT|CREDIT` | `List<LedgerEntry>` | Wholesaler | Dashboard: `khatabook.tsx` |
| `/api/ledger/retailer` | GET | Query: `?fromDate=yyyy-MM-dd&toDate=yyyy-MM-dd&type=DEBIT|CREDIT` | `List<LedgerEntry>` | Retailer | Flutter: payments/ledger view |
| `/api/ledger/wholesaler/retailer/{retailerId}/statement` | GET | - | `List<LedgerEntry>` | Wholesaler | Dashboard: `khatabook.tsx` |
| `/api/ledger/wholesaler/retailer/{retailerId}/outstanding` | GET | - | `{ "retailerId": "uuid", "outstanding": double }` | Wholesaler | Dashboard: retailer profile |

## Public Catalog

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/catalog/products` | GET | Query: `?q=string&page=0&size=20&categoryId=uuid` | `Page<ProductResponseDTO>` | Public | Public product search |
| `/api/catalog/products/by-sku/{sku}` | GET | - | `ProductResponseDTO` | Public | SKU-based product lookup |

## User Management

| Endpoint | Method | Request Body | Response | Auth Required | Used By |
|----------|--------|--------------|----------|---------------|---------|
| `/api/users/register` | POST | `UserDTO` | `User` | Public | Admin/user registration |
| `/api/users/all` | GET | - | `List<User>` | Authenticated | Admin panel |
| `/api/users/{id}` | GET | - | `User` | Authenticated | User profile |

## Authentication Header Format

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

Standard response wrapper:
```json
{
  "success": boolean,
  "message": "string",
  "data": <response_object>
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Base URL

- **Development**: `http://localhost:8081`
- **Flutter Config**: `diya_frontend/lib/config/dio_client.dart`
- **Dashboard**: Uses same backend URL

## CORS Configuration

Allowed origins (configured in `SecurityConfig.java`):
- `http://localhost:5000` (Dashboard)
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (Alternative)
