# Engineering Standards - Diya B2B Platform

## Branch Naming Convention

### Feature Branches
```
feature/<feature-name>
```
Examples:
- `feature/order-tracking`
- `feature/payment-gateway-integration`
- `feature/retailer-notifications`

### Fix Branches
```
fix/<bug-name>
```
Examples:
- `fix/cart-calculation-error`
- `fix/jwt-token-expiry`
- `fix/connection-request-duplicate`

### Development Branch
- `dev` - Main development branch
- All feature branches merge into `dev`
- `dev` is periodically merged to `main` after testing

## Commit Message Style

### Format
```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config)

### Examples
```
feat(orders): Add order cancellation for retailers

- Allow retailers to cancel orders with PLACED status
- Update OrderService with cancellation logic
- Add validation for order status

fix(auth): Resolve JWT token expiry issue

- Extend token validity period
- Add token refresh mechanism

docs(api): Update API_MAP.md with new payment endpoints
```

## DTO Conventions

### Naming
- Request DTOs: `<Action><Entity>Request`
  - Example: `ProductCreateRequest`, `OrderCheckoutRequest`
- Response DTOs: `<Entity><Purpose>DTO` or `<Entity>ResponseDTO`
  - Example: `ProductResponseDTO`, `ConnectionResponseDTO`, `OrderListItemDTO`

### Structure
- Use `@Builder` pattern for complex DTOs
- Include validation annotations (`@NotNull`, `@NotBlank`, etc.)
- Use appropriate types (UUID for IDs, LocalDateTime for timestamps)
- Document complex fields with JavaDoc

### Example
```java
@Builder
@Getter
@Setter
public class ProductCreateRequest {
    @NotNull
    private UUID categoryId;
    
    @NotBlank
    private String name;
    
    @NotNull
    @Min(0)
    private Double price;
    
    @Min(0)
    private Integer stock;
}
```

## Controller Patterns

### Structure
- One controller per domain (e.g., `RetailerOrderController`, `WholesalerProductController`)
- Use `@RestController` and `@RequestMapping` for base path
- Extract authentication logic to helper methods
- Return `ResponseEntity<?>` for consistent responses

### Authentication
- Use `SecurityContextHolder.getContext().getAuthentication()` to get current user
- Extract identifier (email/phone) from authentication
- Support both email and phone as identifiers

### Example
```java
@RestController
@RequestMapping("/api/retailer/orders")
@RequiredArgsConstructor
public class RetailerOrderController {
    
    private final OrderService orderService;
    
    @GetMapping
    public ResponseEntity<?> getRetailerOrders() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        return ResponseEntity.ok(orderService.getOrdersForRetailer(identifier));
    }
}
```

## Service Layer Patterns

### Structure
- One service per domain entity or use case
- Services contain business logic
- Services call repositories for data access
- Services handle transactions with `@Transactional`

### Naming
- Service interfaces: `<Entity>Service`
- Service implementations: `<Entity>ServiceImpl` (if using interfaces)
- Methods: verb + entity (e.g., `createProduct`, `getOrdersForRetailer`)

### Example
```java
@Service
@RequiredArgsConstructor
@Transactional
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final CartService cartService;
    
    public OrderCheckoutResponse checkoutFromCart(String identifier, OrderCheckoutRequest req) {
        // Business logic here
    }
}
```

## Repository Patterns

### Structure
- Extend `JpaRepository<Entity, UUID>` for standard CRUD
- Use `@Query` for custom queries
- Use method naming conventions for Spring Data JPA
- Return `Optional<T>` for single entity queries

### Naming
- Repository interfaces: `<Entity>Repository`
- Methods: `findBy<Field>`, `existsBy<Field>`, `countBy<Field>`

### Example
```java
@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    
    List<Order> findByRetailerAndStatus(Retailer retailer, Order.Status status);
    
    @Query("SELECT o FROM Order o WHERE o.wholesaler.id = :wholesalerId")
    List<Order> findByWholesalerId(@Param("wholesalerId") UUID wholesalerId);
}
```

## Error Handling Rules

### Exception Types
- Use custom exceptions for business logic errors
- Use `RuntimeException` for unexpected errors
- Create exception hierarchy if needed

### Response Format
- Return consistent error response structure
- Include error code and message
- Use appropriate HTTP status codes:
  - `400 Bad Request` - Validation errors
  - `401 Unauthorized` - Authentication required
  - `403 Forbidden` - Authorization failed
  - `404 Not Found` - Resource not found
  - `500 Internal Server Error` - Server errors

### Example
```java
try {
    // Business logic
} catch (EntityNotFoundException e) {
    return ResponseEntity.status(404)
        .body(Map.of("success", false, "message", e.getMessage()));
} catch (ValidationException e) {
    return ResponseEntity.status(400)
        .body(Map.of("success", false, "message", e.getMessage()));
}
```

## Authentication Token Rules

### JWT Token
- Store JWT tokens securely (FlutterSecureStorage for mobile, secure session for web)
- Include user identifier (email or phone) in token claims
- Include user role in token claims
- Set appropriate token expiry (e.g., 24 hours)
- Validate token on every protected endpoint

### Token Injection
- Flutter: Use Dio interceptor to inject token in `Authorization: Bearer <token>` header
- Dashboard: Use session-based auth or JWT in cookies/headers
- Backend: Extract token from `Authorization` header in `JwtAuthFilter`

### Token Refresh
- Implement token refresh mechanism for long sessions
- Store refresh token separately from access token
- Validate refresh token before issuing new access token

### Security
- Never log tokens in production
- Use HTTPS in production
- Implement token blacklisting for logout
- Rotate JWT secret keys periodically

## Code Review Checklist

- [ ] Code follows naming conventions
- [ ] DTOs are properly structured
- [ ] Controllers handle authentication correctly
- [ ] Services contain business logic (not in controllers)
- [ ] Repositories use appropriate query methods
- [ ] Error handling is consistent
- [ ] Tests are included for new features
- [ ] Documentation is updated
- [ ] No secrets or sensitive data committed
- [ ] Branch naming follows convention
