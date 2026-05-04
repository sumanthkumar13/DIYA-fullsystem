-- Flyway V1: initial schema for Diya backend (PostgreSQL)
-- This migration only creates tables/constraints/indexes (no data-loss logic).

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    phone VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(2048),
    role VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_users_phone ON users (phone);
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_user_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_user_role ON users (role);

CREATE TABLE IF NOT EXISTS wholesaler_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    order_sequence INTEGER DEFAULT 0,
    handle VARCHAR(50) NOT NULL,
    invite_code VARCHAR(20) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(80),
    gstin VARCHAR(255),
    city VARCHAR(255),
    region VARCHAR(80),
    state VARCHAR(255),
    pincode VARCHAR(10),
    address VARCHAR(250),
    logo_url VARCHAR(255),
    visibility_mode VARCHAR(255),
    invoice_sequence INTEGER DEFAULT 0,
    delivery_model VARCHAR(255),
    upi_id VARCHAR(255),
    upi_qr_image VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_wholesaler_user UNIQUE (user_id),
    CONSTRAINT uk_wholesaler_handle UNIQUE (handle),
    CONSTRAINT uk_wholesaler_invite_code UNIQUE (invite_code),
    CONSTRAINT fk_wholesaler_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_wh_handle ON wholesaler_profiles (handle);
CREATE INDEX IF NOT EXISTS idx_wh_city ON wholesaler_profiles (city);
CREATE INDEX IF NOT EXISTS idx_wh_pincode ON wholesaler_profiles (pincode);
CREATE INDEX IF NOT EXISTS idx_wh_invite_code ON wholesaler_profiles (invite_code);

CREATE TABLE IF NOT EXISTS wholesaler_categories (
    wholesaler_id UUID NOT NULL,
    category VARCHAR(255),
    CONSTRAINT fk_wholesaler_categories_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_wholesaler_categories_wholesaler ON wholesaler_categories (wholesaler_id);

CREATE TABLE IF NOT EXISTS retailer_profiles (
    id UUID PRIMARY KEY,
    user_id UUID,
    wholesaler_id UUID,
    shop_name VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(255),
    region VARCHAR(80) NOT NULL,
    state VARCHAR(255),
    phone_contact VARCHAR(255),
    password VARCHAR(255),
    gst_number VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    account_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMP,
    account_status VARCHAR(255) NOT NULL,
    credit_limit NUMERIC(19,2),
    notes TEXT,
    CONSTRAINT uk_retailer_user UNIQUE (user_id),
    CONSTRAINT fk_retailer_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_retailer_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_retailer_wholesaler ON retailer_profiles (wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_retailer_region ON retailer_profiles (region);

CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY,
    wholesaler_id UUID NOT NULL,
    retailer_id UUID NOT NULL,
    status VARCHAR(255),
    requested_at TIMESTAMP,
    responded_at TIMESTAMP,
    CONSTRAINT uk_connections_wholesaler_retailer UNIQUE (wholesaler_id, retailer_id),
    CONSTRAINT fk_connections_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id),
    CONSTRAINT fk_connections_retailer FOREIGN KEY (retailer_id) REFERENCES retailer_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_connections_wholesaler ON connections (wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_connections_retailer ON connections (retailer_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections (status);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    wholesaler_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT uk_categories_wholesaler_name UNIQUE (wholesaler_id, name),
    CONSTRAINT fk_categories_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_categories_wholesaler ON categories (wholesaler_id);

CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY,
    category_id UUID,
    parent_sub_id UUID,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT uk_subcategories_parent_name UNIQUE (parent_sub_id, name),
    CONSTRAINT fk_subcategories_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_subcategories_parent FOREIGN KEY (parent_sub_id) REFERENCES subcategories (id)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories (category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_parent ON subcategories (parent_sub_id);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    wholesaler_id UUID NOT NULL,
    category_id UUID,
    subcategory_id UUID,
    sku VARCHAR(255),
    sequence_number INTEGER,
    reserved_stock INTEGER DEFAULT 0,
    name VARCHAR(255),
    description VARCHAR(255),
    unit VARCHAR(255),
    price DOUBLE PRECISION,
    mrp DOUBLE PRECISION,
    stock INTEGER,
    image_url VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    visible_to_retailer BOOLEAN NOT NULL DEFAULT TRUE,
    hsn_code VARCHAR(8),
    gst_rate NUMERIC(5,2),
    tax_type VARCHAR(255),
    base_unit VARCHAR(255),
    selling_unit VARCHAR(255),
    units_per_selling INTEGER,
    price_includes_tax BOOLEAN,
    tally_item_synced BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_products_wholesaler_sku UNIQUE (wholesaler_id, sku),
    CONSTRAINT fk_products_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_products_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories (id)
);

CREATE INDEX IF NOT EXISTS idx_product_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_wholesaler ON products (wholesaler_id);

CREATE TABLE IF NOT EXISTS product_retailer_hide (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    retailer_id UUID NOT NULL,
    CONSTRAINT uk_product_retailer_hide UNIQUE (product_id, retailer_id),
    CONSTRAINT fk_product_retailer_hide_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_product_retailer_hide_retailer FOREIGN KEY (retailer_id) REFERENCES retailer_profiles (id)
);

CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY,
    wholesaler_id UUID NOT NULL,
    retailer_id UUID NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_carts_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id),
    CONSTRAINT fk_carts_retailer FOREIGN KEY (retailer_id) REFERENCES retailer_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_carts_wholesaler ON carts (wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_carts_retailer ON carts (retailer_id);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY,
    cart_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER,
    price_at_time DOUBLE PRECISION,
    mrp_at_time DOUBLE PRECISION,
    stock_snapshot INTEGER,
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items (cart_id);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    wholesaler_id UUID NOT NULL,
    retailer_id UUID NOT NULL,
    order_number VARCHAR(255) NOT NULL,
    placed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    edited_at TIMESTAMP,
    edited_by VARCHAR(255),
    edit_reason VARCHAR(255),
    payment_mode VARCHAR(255),
    credit_days INTEGER,
    due_date TIMESTAMP,
    approved_credit_amount NUMERIC(19,2),
    credit_due_date TIMESTAMP,
    status VARCHAR(255) NOT NULL,
    payment_status VARCHAR(255) NOT NULL,
    subtotal NUMERIC(19,2) NOT NULL,
    tax_amount NUMERIC(19,2) NOT NULL,
    delivery_charge NUMERIC(19,2) NOT NULL,
    total_amount NUMERIC(19,2) NOT NULL,
    CONSTRAINT uk_orders_order_number UNIQUE (order_number),
    CONSTRAINT fk_orders_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id),
    CONSTRAINT fk_orders_retailer FOREIGN KEY (retailer_id) REFERENCES retailer_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_orders_wholesaler ON orders (wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_orders_retailer ON orders (retailer_id);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    product_id UUID,
    product_id_snapshot UUID NOT NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_snapshot VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL,
    original_qty INTEGER,
    unit_price_snapshot DOUBLE PRECISION NOT NULL,
    original_unit_price DOUBLE PRECISION,
    line_total DOUBLE PRECISION NOT NULL,
    original_line_total DOUBLE PRECISION,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    order_id UUID,
    wholesaler_id UUID NOT NULL,
    retailer_id UUID NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    mode VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    reference VARCHAR(255),
    note VARCHAR(255),
    created_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    rejected_at TIMESTAMP,
    confirmed_by VARCHAR(255),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_payments_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id),
    CONSTRAINT fk_payments_retailer FOREIGN KEY (retailer_id) REFERENCES retailer_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_wholesaler ON payments (wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_payments_retailer ON payments (retailer_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY,
    wholesaler_id UUID NOT NULL,
    retailer_id UUID NOT NULL,
    related_order_id UUID,
    entry_type VARCHAR(255) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    description VARCHAR(500),
    entry_date TIMESTAMP NOT NULL,
    CONSTRAINT fk_ledger_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES wholesaler_profiles (id),
    CONSTRAINT fk_ledger_retailer FOREIGN KEY (retailer_id) REFERENCES retailer_profiles (id),
    CONSTRAINT fk_ledger_related_order FOREIGN KEY (related_order_id) REFERENCES orders (id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_wholesaler ON ledger_entries (wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_ledger_retailer ON ledger_entries (retailer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_related_order ON ledger_entries (related_order_id);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY,
    invoice_number VARCHAR(32) NOT NULL,
    order_id UUID NOT NULL,
    retailer_id UUID NOT NULL,
    invoice_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_taxable NUMERIC(19,2) NOT NULL,
    total_cgst NUMERIC(19,2) NOT NULL,
    total_sgst NUMERIC(19,2) NOT NULL,
    grand_total NUMERIC(19,2) NOT NULL,
    tally_exported BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_invoices_invoice_number UNIQUE (invoice_number),
    CONSTRAINT fk_invoices_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_invoices_retailer FOREIGN KEY (retailer_id) REFERENCES retailer_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_order ON invoices (order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoices (invoice_number);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY,
    invoice_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity_selling_unit NUMERIC(19,4) NOT NULL,
    quantity_base_unit NUMERIC(19,4) NOT NULL,
    rate NUMERIC(19,4) NOT NULL,
    taxable_value NUMERIC(19,2) NOT NULL,
    cgst NUMERIC(19,2) NOT NULL,
    sgst NUMERIC(19,2) NOT NULL,
    line_total NUMERIC(19,2) NOT NULL,
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_items_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_item_invoice ON invoice_items (invoice_id);

CREATE TABLE IF NOT EXISTS retailer_otp (
    id UUID PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retailer_otp_phone ON retailer_otp (phone);

CREATE TABLE IF NOT EXISTS hsn_master (
    hsn_code VARCHAR(20) PRIMARY KEY,
    description VARCHAR(500),
    gst_rate NUMERIC(5,2),
    keywords VARCHAR(1000)
);

