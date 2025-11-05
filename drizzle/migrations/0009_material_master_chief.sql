-- Step 1: Delete duplicate profiles, keeping only one record per (tenant_id, user_id) pair
-- Using DISTINCT ON to identify which IDs to keep, then delete the rest
WITH ids_to_keep AS (
  SELECT DISTINCT ON (tenant_id, user_id) id
  FROM profiles
  ORDER BY tenant_id, user_id, id
)
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM ids_to_keep);

-- Step 2: Add UNIQUE constraint to prevent future duplicates
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_tenant_id_user_id_unique" UNIQUE("tenant_id","user_id");