-- V2: critical production fixes (safe, non-breaking)

-- 1. REMOVE reliance on floating point for money → convert to NUMERIC
ALTER TABLE products 
    ALTER COLUMN price TYPE NUMERIC(19,2),
    ALTER COLUMN mrp TYPE NUMERIC(19,2);

ALTER TABLE order_items
    ALTER COLUMN unit_price_snapshot TYPE NUMERIC(19,2),
    ALTER COLUMN original_unit_price TYPE NUMERIC(19,2),
    ALTER COLUMN line_total TYPE NUMERIC(19,2),
    ALTER COLUMN original_line_total TYPE NUMERIC(19,2);

ALTER TABLE cart_items
    ALTER COLUMN price_at_time TYPE NUMERIC(19,2),
    ALTER COLUMN mrp_at_time TYPE NUMERIC(19,2);


-- 2. MAKE critical FK NOT NULL (only safe one)
-- WARNING: ensure no existing NULL data before running in prod

ALTER TABLE retailer_profiles
    ALTER COLUMN user_id SET NOT NULL;


-- 3. ADD missing indexes (performance-critical)

CREATE INDEX IF NOT EXISTS idx_prh_product 
    ON product_retailer_hide(product_id);

CREATE INDEX IF NOT EXISTS idx_prh_retailer 
    ON product_retailer_hide(retailer_id);


-- 4. ADD NOT NULL to critical business fields

ALTER TABLE products
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN price SET NOT NULL;

ALTER TABLE orders
    ALTER COLUMN placed_at SET NOT NULL;


-- 5. (SAFE CLEANUP)
-- No schema-level SET search_path needed (handled by config)
-- (No SQL required here, just ensuring future migrations avoid it)