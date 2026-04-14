-- HOTFIX: provider_categories RLS policies referenced non-existent user_id column
-- This blocked all category saves for fachmani profiles

DROP POLICY IF EXISTS "provider_categories_insert_own" ON provider_categories;
DROP POLICY IF EXISTS "provider_categories_delete_own" ON provider_categories;

CREATE POLICY "provider_categories_insert_own" ON provider_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM provider_profiles WHERE id = provider_id AND user_id = auth.uid())
  );

CREATE POLICY "provider_categories_delete_own" ON provider_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM provider_profiles WHERE id = provider_id AND user_id = auth.uid())
  );
