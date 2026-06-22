-- =============================================================
-- Audit fix (high): payment webhook nebyl idempotentní. Side-effecty (credit peněženky,
-- insert premium) běžely podle STALE payment.status načteného před atomickým claimem.
-- Dvě souběžná/retry doručení PAID webhooku (ComGate běžně retryuje) → dvojí připsání
-- kreditu / duplicitní premium. Navíc credit peněženky byl neatomický read-modify-write
-- (lost update při souběhu dvou různých plateb téhož usera).
--
-- Tato migrace dodává:
--   1) atomický credit_wallet RPC (increment v DB + get-or-create wallet)
--   2) UNIQUE backstopy: wallet_transactions.payment_id, premium_subscriptions.initial_payment_id
-- Webhook se opraví v kódu (side-effecty navázat na výsledek atomického claimu).
-- =============================================================

-- jedna peněženka na usera (pro get-or-create a integritu)
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_user_id_key;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);

-- backstop: jeden transakční záznam na payment (NULL payment_id pro spend zůstává distinct,
-- takže UNIQUE umožní libovolně mnoho NULL). Plný constraint kvůli ON CONFLICT v credit_wallet.
DROP INDEX IF EXISTS uniq_wallet_tx_payment;
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS uniq_wallet_tx_payment;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT uniq_wallet_tx_payment UNIQUE (payment_id);

-- backstop: jedno premium na initial payment
ALTER TABLE public.premium_subscriptions DROP CONSTRAINT IF EXISTS uniq_premium_initial_payment;
ALTER TABLE public.premium_subscriptions ADD CONSTRAINT uniq_premium_initial_payment UNIQUE (initial_payment_id);

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id uuid, p_amount int, p_payment_id uuid, p_description text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance int;
BEGIN
  -- get-or-create peněženka
  INSERT INTO public.wallets (user_id, balance_kc, total_topped_up_kc, total_spent_kc)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;

  -- IDEMPOTENCE: transakční log je gate. UNIQUE(payment_id) → druhý souběžný/retry
  -- pokus neprojde a NEdojde k incrementu balance (jinak by se kredit zdvojil).
  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, type, amount_kc, balance_after_kc, description, payment_id)
  VALUES (v_wallet_id, p_user_id, 'topup', p_amount, 0, p_description, p_payment_id)
  ON CONFLICT (payment_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN; -- už připsáno
  END IF;

  -- teprve teď atomický increment + dopočet balance_after
  UPDATE public.wallets
     SET balance_kc = balance_kc + p_amount,
         total_topped_up_kc = total_topped_up_kc + p_amount,
         updated_at = now()
   WHERE id = v_wallet_id
   RETURNING balance_kc INTO v_new_balance;

  UPDATE public.wallet_transactions
     SET balance_after_kc = v_new_balance
   WHERE payment_id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet(uuid, int, uuid, text) FROM public, anon, authenticated;
