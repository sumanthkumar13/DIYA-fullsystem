-- Invited retailers are created before the retailer installs the app; user_id must be nullable.
ALTER TABLE retailer_profiles
    ALTER COLUMN user_id DROP NOT NULL;

-- India Post territory labels can exceed 80 chars; align with RegionCatalog (120).
ALTER TABLE retailer_profiles
    ALTER COLUMN region TYPE VARCHAR(120);

-- Owner / contact name when there is no linked users row yet.
ALTER TABLE retailer_profiles
    ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);

ALTER TABLE retailer_profiles
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(6);
