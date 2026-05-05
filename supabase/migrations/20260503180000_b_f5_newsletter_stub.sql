-- =============================================================
-- B.F5 — Newsletter (stub: opt-in + admin compose + stubbed send)
-- TODO: integrace s Resend pro reálné odesílání. Pro teď batch endpoint
-- jen označí kampaň jako "sent" a logne do admin_activity_log.
-- Existující newsletter_subscribers table má jen (id, email, created_at) —
-- rozšiřujeme ji ALTER TABLE.
-- =============================================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_idx
  ON newsletter_subscribers (is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  recipient_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- RLS — subscribers
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can read subscribers" ON newsletter_subscribers;
CREATE POLICY "Admin can read subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE id = auth.uid() AND admin_role IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Admin can update subscribers" ON newsletter_subscribers;
CREATE POLICY "Admin can update subscribers"
  ON newsletter_subscribers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE id = auth.uid() AND admin_role IS NOT NULL
    )
  );

ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage campaigns" ON newsletter_campaigns;
CREATE POLICY "Admin manage campaigns"
  ON newsletter_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE id = auth.uid() AND admin_role IS NOT NULL
    )
  );

COMMENT ON TABLE newsletter_subscribers IS
  'B.F5 — opt-in newsletter subscribers. Token pro unsubscribe link, soft-unsubscribe (is_active=false, ne delete).';
COMMENT ON TABLE newsletter_campaigns IS
  'B.F5 — kampaně. Status sent = stub (zatím reálně neodesíláme přes Resend, jen logujeme).';
