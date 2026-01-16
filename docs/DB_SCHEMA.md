# Diya B2B Platform - Database Schema

Complete database entity documentation with relationships and constraints.

## Entity Overview

The system uses **14 core entities** with PostgreSQL as the database and JPA/Hibernate for ORM.

## Entity Details

### 1. User
**Table**: `users`  
**Location**: `backend/src/main/java/com/diya/backend/entity/User.java`

Base authentication entity for all users (wholesalers, retailers, admins).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `phone` | String | Unique, Indexed | Phone number (optional) |
| `email` | String | Unique | Email address (optional) |
| `password` | String | Not null, @JsonIgnore | BCrypt hashed password |
| `name` | String | - | User's full name |
| `role` | Enum | Not null, Indexed | WHOLESALER, RETAILER, ADMIN |
| `isActive` | Boolean | Default: true | Account status flag |
| `createdAt` | LocalDateTime | Default: now() | Creation timestamp |
| `updatedAt` | LocalDateTime | Default: now(), Auto-update | Last update timestamp |

**Indexes:**
- `idx_user_phone` on `phone`
- `idx_user_role` on `role`

**Relationships:**
- OneToOne → `Retailer` (via `user_id`)
- OneToOne → `Wholesaler` (via `user_id`)

---

### 2. Retailer
**Table**: `retailer_profiles`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Retailer.java`

Retailer profile information.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `user_id` | UUID | FK, Not null, Unique | References `users.id` |
| `shopName` | String | - | Shop/business name |
| `address` | String | - | Street address |
| `city` | String | - | City |
| `state` | String | - | State |
| `phoneContact` | String | - | Contact phone |
| `isActive` | Boolean | Default: true | Profile status |

**Relationships:**
- ManyToOne → `User` (OneToOne inverse)
- OneToMany → `Connection` (as retailer)
- OneToMany → `Cart` (as retailer)
- OneToMany → `Order` (as retailer)
- OneToMany → `Payment` (as retailer)
- OneToMany → `LedgerEntry` (as retailer)

---

### 3. Wholesaler
**Table**: `wholesaler_profiles`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Wholesaler.java`

Wholesaler profile with business details.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `user_id` | UUID | FK, Not null, Unique | References `users.id` |
| `handle` | String(50) | Not null, Unique, Indexed | @handle identifier |
| `inviteCode` | String(20) | Not null, Unique, Indexed | DIYA-XXXX format |
| `businessName` | String | Not null | Business name |
| `gstin` | String | - | GST number |
| `city` | String | Indexed | City |
| `state` | String | - | State |
| `pincode` | String(10) | Indexed | PIN code |
| `address` | String(250) | - | Full address |
| `logoUrl` | String | - | Logo image URL |
| `visibilityMode` | Enum | Default: PUBLIC | PUBLIC or PRIVATE |
| `invoiceSequence` | Integer | Default: 0 | Invoice number counter |
| `orderSequence` | Integer | Default: 0 | Order number counter |
| `deliveryModel` | Enum | - | DELIVERY or PICKUP |
| `upiId` | String | - | UPI payment ID |
| `upiQrImage` | String | - | UPI QR code image |
| `categories` | List<String> | - | Business categories (ElementCollection) |
| `createdAt` | LocalDateTime | Default: now() | Creation timestamp |
| `updatedAt` | LocalDateTime | Default: now(), Auto-update | Last update timestamp |

**Indexes:**
- `idx_wh_handle` on `handle`
- `idx_wh_city` on `city`
- `idx_wh_pincode` on `pincode`
- `idx_wh_invite_code` on `inviteCode`

**Enums:**
- `VisibilityMode`: PUBLIC, PRIVATE
- `DeliveryModel`: DELIVERY, PICKUP

**Relationships:**
- ManyToOne → `User` (OneToOne inverse)
- OneToMany → `Connection` (as wholesaler)
- OneToMany → `Category` (owns categories)
- OneToMany → `Product` (owns products)
- OneToMany → `Cart` (as wholesaler)
- OneToMany → `Order` (as wholesaler)
- OneToMany → `Payment` (as wholesaler)
- OneToMany → `LedgerEntry` (as wholesaler)
- OneToMany → `Invoice` (generates invoices)

---

### 4. Connection
**Table**: `connections`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Connection.java`

Wholesaler-Retailer connection relationship.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `wholesaler_id` | UUID | FK, Not null | References `wholesaler_profiles.id` |
| `retailer_id` | UUID | FK, Not null | References `retailer_profiles.id` |
| `status` | Enum | Default: PENDING | PENDING, APPROVED, REJECTED, BLOCKED |
| `requestedAt` | LocalDateTime | Default: now() | Request timestamp |
| `respondedAt` | LocalDateTime | - | Response timestamp |

**Unique Constraint:**
- `(wholesaler_id, retailer_id)` - One connection per pair

**Enums:**
- `Status`: PENDING, APPROVED, REJECTED, BLOCKED

**Relationships:**
- ManyToOne → `Wholesaler`
- ManyToOne → `Retailer`

---

### 5. Category
**Table**: `categories`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Category.java`

Product categories owned by wholesalers.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `wholesaler_id` | UUID | FK, Not null | References `wholesaler_profiles.id` |
| `name` | String | Not null | Category name |

**Unique Constraint:**
- `(wholesaler_id, name)` - Unique category name per wholesaler

**Relationships:**
- ManyToOne → `Wholesaler`
- OneToMany → `SubCategory` (parent category)
- OneToMany → `Product` (products in category)

---

### 6. SubCategory
**Table**: `subcategories`  
**Location**: `backend/src/main/java/com/diya/backend/entity/SubCategory.java`

Subcategories with hierarchical support (can have parent subcategory).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `category_id` | UUID | FK | References `categories.id` |
| `parent_sub_id` | UUID | FK | References `subcategories.id` (self-referential) |
| `name` | String | Not null | Subcategory name |

**Unique Constraint:**
- `(parent_sub_id, name)` - Unique name per parent

**Relationships:**
- ManyToOne → `Category` (optional parent category)
- ManyToOne → `SubCategory` (parent subcategory - self-referential)
- OneToMany → `SubCategory` (children subcategories)
- OneToMany → `Product` (products in subcategory)

---

### 7. Product
**Table**: `products`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Product.java`

Product catalog items.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `wholesaler_id` | UUID | FK, Not null | References `wholesaler_profiles.id` |
| `category_id` | UUID | FK | References `categories.id` |
| `subcategory_id` | UUID | FK | References `subcategories.id` |
| `sku` | String | Indexed | SKU code (not globally unique) |
| `sequenceNumber` | Integer | - | Display order |
| `reservedStock` | Integer | Default: 0 | Stock locked for pending orders |
| `name` | String | - | Product name |
| `description` | String | - | Product description |
| `unit` | String | - | Unit of measurement |
| `price` | Double | - | Selling price |
| `mrp` | Double | - | Maximum retail price |
| `stock` | Integer | - | Available stock |
| `imageUrl` | String | - | Product image URL |
| `active` | Boolean | Default: true | Product active status |
| `visibleToRetailer` | Boolean | Default: true | Visibility flag |

**Indexes:**
- `idx_product_sku` on `sku`

**Unique Constraint:**
- `(wholesaler_id, sku)` - Unique SKU per wholesaler

**Relationships:**
- ManyToOne → `Wholesaler`
- ManyToOne → `Category` (optional)
- ManyToOne → `SubCategory` (optional)
- OneToMany → `CartItem` (in carts)
- OneToMany → `OrderItem` (in orders)

---

### 8. Cart
**Table**: `carts`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Cart.java`

Shopping cart per wholesaler-retailer pair.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `wholesaler_id` | UUID | FK, Not null | References `wholesaler_profiles.id` |
| `retailer_id` | UUID | FK, Not null | References `retailer_profiles.id` |
| `createdAt` | LocalDateTime | Auto-set on create | Creation timestamp |
| `updatedAt` | LocalDateTime | Auto-update | Last update timestamp |

**Relationships:**
- ManyToOne → `Wholesaler`
- ManyToOne → `Retailer`
- OneToMany → `CartItem` (cart items)

---

### 9. CartItem
**Table**: `cart_items`  
**Location**: `backend/src/main/java/com/diya/backend/entity/CartItem.java`

Items in a shopping cart.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `cart_id` | UUID | FK, Not null | References `carts.id` |
| `product_id` | UUID | FK, Not null | References `products.id` |
| `quantity` | Integer | - | Item quantity |
| `priceAtTime` | Double | - | Price snapshot when added |
| `mrpAtTime` | Double | - | MRP snapshot when added |
| `stockSnapshot` | Integer | - | Stock snapshot when added |

**Relationships:**
- ManyToOne → `Cart`
- ManyToOne → `Product`

---

### 10. Order
**Table**: `orders`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Order.java`

Order entity with lifecycle tracking.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `wholesaler_id` | UUID | FK, Not null | References `wholesaler_profiles.id` |
| `retailer_id` | UUID | FK, Not null | References `retailer_profiles.id` |
| `orderNumber` | String | Not null, Unique | Auto-generated order number |
| `status` | Enum | Not null, Default: PLACED | Order status |
| `paymentStatus` | Enum | Not null, Default: UNPAID | Payment status |
| `subtotal` | Double | - | Subtotal amount |
| `taxAmount` | Double | - | Tax amount |
| `deliveryCharge` | Double | - | Delivery charge |
| `totalAmount` | Double | - | Total amount |
| `placedAt` | LocalDateTime | Default: now() | Order placed timestamp |
| `acceptedAt` | LocalDateTime | - | Accepted timestamp |
| `dispatchedAt` | LocalDateTime | - | Dispatched timestamp |
| `deliveredAt` | LocalDateTime | - | Delivered timestamp |
| `cancelledAt` | LocalDateTime | - | Cancelled timestamp |

**Enums:**
- `Status`: PLACED, ACCEPTED, REJECTED, PACKING, DISPATCHED, DELIVERED, COMPLETED, CANCELLED
- `PaymentStatus`: UNPAID, PARTIAL, PAID

**Relationships:**
- ManyToOne → `Wholesaler`
- ManyToOne → `Retailer`
- OneToMany → `OrderItem` (order items)
- OneToMany → `Payment` (payments for order)
- OneToOne → `Invoice` (generated invoice)
- OneToMany → `LedgerEntry` (related ledger entries)

---

### 11. OrderItem
**Table**: `order_items`  
**Location**: `backend/src/main/java/com/diya/backend/entity/OrderItem.java`

Items in an order (with price snapshots).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `order_id` | UUID | FK, Not null | References `orders.id` |
| `product_id` | UUID | FK | References `products.id` (nullable if product deleted) |
| `productIdSnapshot` | UUID | Not null | Product ID at time of order |
| `productNameSnapshot` | String | Not null | Product name at time of order |
| `unitSnapshot` | String | Not null | Unit at time of order |
| `qty` | Integer | Not null | Quantity ordered |
| `unitPriceSnapshot` | Double | Not null | Price at time of order |
| `lineTotal` | Double | Not null | Line total (qty × price) |

**Relationships:**
- ManyToOne → `Order`
- ManyToOne → `Product` (optional, nullable)

**Note**: Snapshot fields ensure order history remains accurate even if product details change.

---

### 12. Payment
**Table**: `payments`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Payment.java`

Payment records with verification workflow.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `order_id` | UUID | FK | References `orders.id` (optional) |
| `wholesaler_id` | UUID | FK, Not null | References `wholesaler_profiles.id` |
| `retailer_id` | UUID | FK, Not null | References `retailer_profiles.id` |
| `amount` | Double | Not null | Payment amount |
| `mode` | Enum | Not null | Payment mode |
| `status` | Enum | Not null, Default: PENDING_VERIFICATION | Payment status |
| `reference` | String | - | UTR/txn ID/UPI reference |
| `note` | String | - | Payment note |
| `createdAt` | LocalDateTime | Default: now() | Payment recorded timestamp |
| `confirmedAt` | LocalDateTime | - | Confirmed timestamp |
| `rejectedAt` | LocalDateTime | - | Rejected timestamp |
| `confirmedBy` | String | - | Wholesaler identifier who confirmed |

**Enums:**
- `PaymentMode`: UPI, CASH, NEFT, NET_BANKING, RTGS
- `PaymentStatus`: PENDING_VERIFICATION, CONFIRMED, REJECTED, FAILED

**Relationships:**
- ManyToOne → `Order` (optional)
- ManyToOne → `Wholesaler`
- ManyToOne → `Retailer`

---

### 13. LedgerEntry
**Table**: `ledger_entries`  
**Location**: `backend/src/main/java/com/diya/backend/entity/LedgerEntry.java`

Ledger entries for tracking outstanding balances (Khatabook-style).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `wholesaler_id` | UUID | FK, Not null | References `wholesaler_profiles.id` |
| `retailer_id` | UUID | FK, Not null | References `retailer_profiles.id` |
| `related_order_id` | UUID | FK | References `orders.id` (optional) |
| `entryType` | Enum | Not null | DEBIT or CREDIT |
| `amount` | Double | Not null | Entry amount |
| `description` | String(500) | - | Entry description |
| `entryDate` | LocalDateTime | Default: now() | Entry timestamp |

**Enums:**
- `EntryType`: 
  - **DEBIT**: Retailer owes wholesaler (increases outstanding)
  - **CREDIT**: Retailer paid wholesaler (decreases outstanding)

**Relationships:**
- ManyToOne → `Wholesaler`
- ManyToOne → `Retailer`
- ManyToOne → `Order` (optional, for order-related entries)

**Business Logic:**
- Outstanding balance = Sum(DEBIT) - Sum(CREDIT) for a wholesaler-retailer pair
- Orders create DEBIT entries
- Confirmed payments create CREDIT entries

---

### 14. Invoice
**Table**: `invoices`  
**Location**: `backend/src/main/java/com/diya/backend/entity/Invoice.java`

Generated invoices for orders.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, Auto-generated | Primary key |
| `order_id` | UUID | FK, Not null, Unique | References `orders.id` |
| `wholesaler_id` | UUID | FK, Not null | References `wholesaler_profiles.id` |
| `invoiceNumber` | String | - | Invoice number |
| `invoiceUrl` | String | - | Invoice PDF/document URL |
| `generatedAt` | LocalDateTime | Default: now() | Generation timestamp |

**Relationships:**
- OneToOne → `Order`
- ManyToOne → `Wholesaler`

---

## Entity Relationship Diagram

```
User (1) ──┬── (1) Retailer
           │
           └── (1) Wholesaler

Wholesaler (1) ──┬── (N) Connection ── (N) Retailer
                  │
                  ├── (N) Category ── (N) SubCategory
                  │                    │
                  │                    └── (self-ref) SubCategory
                  │
                  ├── (N) Product ── (N) CartItem ── (N) Cart ── (N) Retailer
                  │
                  ├── (N) Order ──┬── (N) OrderItem
                  │               ├── (N) Payment
                  │               ├── (1) Invoice
                  │               └── (N) LedgerEntry
                  │
                  └── (N) LedgerEntry ── (N) Retailer
```

## Key Constraints Summary

### Unique Constraints
- `users.phone` - Unique phone number
- `users.email` - Unique email
- `wholesaler_profiles.handle` - Unique handle
- `wholesaler_profiles.inviteCode` - Unique invite code
- `wholesaler_profiles.user_id` - One wholesaler per user
- `retailer_profiles.user_id` - One retailer per user
- `connections(wholesaler_id, retailer_id)` - One connection per pair
- `categories(wholesaler_id, name)` - Unique category name per wholesaler
- `subcategories(parent_sub_id, name)` - Unique subcategory name per parent
- `products(wholesaler_id, sku)` - Unique SKU per wholesaler
- `orders.orderNumber` - Unique order number
- `invoices.order_id` - One invoice per order

### Indexes
- `users`: phone, role
- `wholesaler_profiles`: handle, city, pincode, inviteCode
- `products`: sku

## Database Configuration

**Location**: `backend/src/main/resources/application.properties`

- Database: PostgreSQL
- Connection pooling: HikariCP (default Spring Boot)
- JPA: Hibernate with auto-ddl (likely `update` or `validate` in production)

## Notes

1. **Price Snapshots**: `OrderItem` stores price/name at order time to prevent historical data changes
2. **Multi-Wholesaler Carts**: Each retailer has separate carts per wholesaler
3. **Connection Gating**: Products only visible to retailers with APPROVED connections
4. **Ledger System**: Separate from payments, tracks outstanding balances (DEBIT/CREDIT)
5. **Order Numbering**: Auto-generated using `Wholesaler.orderSequence` with prefix
6. **Soft Deletes**: `isActive` flags used instead of hard deletes
7. **Self-Referential SubCategories**: Supports nested subcategory hierarchies
