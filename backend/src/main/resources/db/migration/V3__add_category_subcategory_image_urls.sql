-- Add imageUrl support for categories and subcategories (Cloudinary URLs)

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048);

ALTER TABLE subcategories
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048);

