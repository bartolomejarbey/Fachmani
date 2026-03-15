-- =============================================================
-- RLS POLICIES pro Fachmani
-- Spustit v Supabase SQL Editoru (Dashboard → SQL Editor)
-- =============================================================

-- Zapnout RLS na všech tabulkách
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- FIX #6: Zprávy čitelné jen účastníky konverzace
-- =============================================================

-- Číst zprávy může jen odesílatel nebo příjemce
CREATE POLICY "messages_select_own" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Odesílat zprávy může jen přihlášený uživatel jako odesílatel
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

-- Aktualizovat (is_read) může jen příjemce
CREATE POLICY "messages_update_receiver" ON messages
  FOR UPDATE USING (
    auth.uid() = receiver_id
  );

-- =============================================================
-- FIX #7: Accept offer jen vlastník requestu
-- =============================================================

-- Číst nabídky: vlastník requestu nebo autor nabídky
CREATE POLICY "offers_select" ON offers
  FOR SELECT USING (
    auth.uid() = provider_id
    OR auth.uid() IN (
      SELECT user_id FROM requests WHERE id = offers.request_id
    )
  );

-- Vložit nabídku: jen provider sám za sebe
CREATE POLICY "offers_insert_provider" ON offers
  FOR INSERT WITH CHECK (
    auth.uid() = provider_id
  );

-- Aktualizovat nabídku (accept/reject): jen vlastník requestu
CREATE POLICY "offers_update_owner" ON offers
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM requests WHERE id = offers.request_id
    )
  );

-- =============================================================
-- FIX #4: Limit nabídek na DB úrovni (trigger)
-- =============================================================

CREATE OR REPLACE FUNCTION check_offer_limit()
RETURNS TRIGGER AS $$
DECLARE
  sub_type TEXT;
  offer_count INT;
BEGIN
  -- Zjistíme typ předplatného providera
  SELECT subscription_type INTO sub_type
  FROM profiles
  WHERE id = NEW.provider_id;

  -- Premium/Business nemají limit
  IF sub_type IN ('premium', 'business') THEN
    RETURN NEW;
  END IF;

  -- Free: max 3 nabídky za měsíc
  SELECT COUNT(*) INTO offer_count
  FROM offers
  WHERE provider_id = NEW.provider_id
    AND created_at >= date_trunc('month', NOW());

  IF offer_count >= 3 THEN
    RAISE EXCEPTION 'Překročen měsíční limit nabídek (3). Upgradujte na Premium.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_offer_limit ON offers;
CREATE TRIGGER enforce_offer_limit
  BEFORE INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION check_offer_limit();

-- =============================================================
-- FIX #5: Admin role může měnit jen master_admin
-- =============================================================

-- Profily: každý vidí veřejné profily
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

-- Profily: uživatel může editovat svůj profil (ale ne admin_role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
  ) WITH CHECK (
    -- Pokud se mění admin_role, musí být master_admin
    (admin_role IS NOT DISTINCT FROM (SELECT admin_role FROM profiles WHERE id = auth.uid()))
    OR
    (SELECT admin_role FROM profiles WHERE id = auth.uid()) = 'master_admin'
  );

-- Profily: master_admin může editovat cokoliv
CREATE POLICY "profiles_update_master_admin" ON profiles
  FOR UPDATE USING (
    (SELECT admin_role FROM profiles WHERE id = auth.uid()) = 'master_admin'
  );

-- =============================================================
-- Requests
-- =============================================================

-- Requests: veřejně čitelné
CREATE POLICY "requests_select_all" ON requests
  FOR SELECT USING (true);

-- Requests: vytvoření jen přihlášeným
CREATE POLICY "requests_insert_auth" ON requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Requests: update jen vlastník
CREATE POLICY "requests_update_owner" ON requests
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- =============================================================
-- Posts, Likes, Comments, Reactions
-- =============================================================

CREATE POLICY "posts_select_all" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_auth" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "post_likes_select_all" ON post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert_auth" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete_own" ON post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "post_comments_select_all" ON post_comments FOR SELECT USING (true);
CREATE POLICY "post_comments_insert_auth" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_comments_delete_own" ON post_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "post_reactions_select_all" ON post_reactions FOR SELECT USING (true);
CREATE POLICY "post_reactions_insert_auth" ON post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_reactions_delete_own" ON post_reactions FOR DELETE USING (auth.uid() = user_id);

-- =============================================================
-- Notifications
-- =============================================================

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_auth" ON notifications
  FOR INSERT WITH CHECK (true);  -- Server/triggers potřebují vkládat

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
