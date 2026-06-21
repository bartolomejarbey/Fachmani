-- =============================================================
-- Kampaňové leady z landing pages — poptávka BEZ registrace (skrytá možnost).
-- Primární cesta je registrace (vytvoří se rovnou účet + poptávka). Tato tabulka
-- slouží jen pro leady, kteří účet nechtějí: uložíme kontakt + poptávku + GDPR souhlas
-- a tým / systém je kontaktuje. Zápis výhradně přes service-role (API /api/lead/submit).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  phone TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT,
  description TEXT,
  location TEXT,
  source TEXT,                       -- která landing page (elektroinstalace/koupelna/zdarma)
  gdpr_consented_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'spam', 'closed')),
  converted_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT                       -- hash IP pro anti-spam, ne plné IP (GDPR minimalizace)
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_status_created
  ON public.campaign_leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_email ON public.campaign_leads (email);

-- RLS: zápis i čtení jen service-role (API) + admin. Veřejnost nemá přístup.
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_leads_admin_read ON public.campaign_leads;
CREATE POLICY campaign_leads_admin_read ON public.campaign_leads
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin', 'admin')));

DROP POLICY IF EXISTS campaign_leads_admin_update ON public.campaign_leads;
CREATE POLICY campaign_leads_admin_update ON public.campaign_leads
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin', 'admin')));

COMMENT ON TABLE public.campaign_leads IS
  'Leady z landing pages bez registrace (kontakt + poptávka + GDPR souhlas). Zápis přes service-role.';
