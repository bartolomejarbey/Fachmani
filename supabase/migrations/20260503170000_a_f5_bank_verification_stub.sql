-- =============================================================
-- A.F5 — Bankovní ověření 1 Kč (stub: DB + admin manual confirm)
-- Spec: fachman zadá číslo účtu, systém vygeneruje unikátní částku
-- (v haléřích) a variabilní symbol. Fachman pošle 1 Kč + tu částku.
-- Webhook z banky (Fio/RB) v budoucnu detekuje příchod automaticky.
-- Pro teď: admin manuálně potvrzuje v /admin/verifikace.
-- =============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_verification_amount INT,           -- v haléřích, např. 137 = 1.37 Kč
  ADD COLUMN IF NOT EXISTS bank_verification_status TEXT
    CHECK (bank_verification_status IN ('pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS bank_verification_reference TEXT,       -- variabilní symbol
  ADD COLUMN IF NOT EXISTS bank_verification_initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bank_verification_verified_at TIMESTAMPTZ;

-- Index pro admin queue (pending bank verifications)
CREATE INDEX IF NOT EXISTS profiles_bank_verification_idx
  ON profiles (bank_verification_initiated_at)
  WHERE bank_verification_status = 'pending';

-- Helper: spuštění bank ověření (vrací data pro UI)
-- Generuje random částku 100-199 hal (= 1.00-1.99 Kč) — kombinace s VS dělá unique pár.
CREATE OR REPLACE FUNCTION initiate_bank_verification(p_user_id UUID, p_account TEXT)
RETURNS TABLE (
  amount_haler INT,
  reference_vs TEXT,
  initiated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_amount INT;
  v_vs TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Random částka 100-199 hal — pseudo-unique během jednoho dne (admin to ručně rozliší)
  v_amount := 100 + floor(random() * 100)::INT;
  -- VS = posledních 10 cifer z timestamp (epoch s) pro snadnou identifikaci
  v_vs := substring(extract(epoch from v_now)::TEXT, 1, 10);

  UPDATE profiles SET
    bank_account = p_account,
    bank_verification_amount = v_amount,
    bank_verification_reference = v_vs,
    bank_verification_status = 'pending',
    bank_verification_initiated_at = v_now,
    bank_verification_verified_at = NULL
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_amount, v_vs, v_now;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION initiate_bank_verification IS
  'A.F5 — fachman spustí ověření, dostane částku v haléřích + VS, pošle 1 Kč na firemní účet. TODO: webhook z Fio/RB.';
