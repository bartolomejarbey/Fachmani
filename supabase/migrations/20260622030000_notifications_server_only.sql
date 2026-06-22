-- =============================================================
-- Audit fix (high): notifications_insert_auth měl WITH CHECK(true) → kdokoli přihlášený
-- vložil notifikaci libovolnému user_id s plně řízeným type/title/message/link. cron
-- push-fanout to pak rozeslal jako reálný Web Push / iOS APNs = phishing na lock-screen
-- („Vaše platba selhala" + /payment?evil).
--
-- Řešení: tvorbu notifikací přesunout do SECURITY DEFINER triggerů na zdrojových
-- tabulkách (messages, offers) a klientský INSERT zakázat. Triggery (owner=postgres)
-- i service-role RLS bypassují, takže legitimní notifikace dál fungují.
-- =============================================================

-- 1) Nová zpráva → notifikace příjemci
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.receiver_id,
    'new_message',
    'Nová zpráva',
    left(NEW.content, 120),
    CASE WHEN NEW.request_id IS NULL
      THEN '/zpravy/direct/' || NEW.sender_id
      ELSE '/zpravy/' || NEW.request_id || '/' || NEW.sender_id
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 2) Nová nabídka → notifikace vlastníkovi poptávky
CREATE OR REPLACE FUNCTION public.notify_new_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_title text;
BEGIN
  SELECT user_id, title INTO v_owner, v_title FROM public.requests WHERE id = NEW.request_id;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      v_owner,
      'new_offer',
      'Nová nabídka',
      'Na vaši poptávku "' || COALESCE(v_title, '') || '" přišla nová nabídka za ' || NEW.price || ' Kč.',
      '/poptavka/' || NEW.request_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_offer ON public.offers;
CREATE TRIGGER trg_notify_new_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_offer();

-- 3) Nabídka přijata → notifikace fachmanovi
CREATE OR REPLACE FUNCTION public.notify_offer_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT title INTO v_title FROM public.requests WHERE id = NEW.request_id;
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.provider_id,
      'offer_accepted',
      'Nabídka přijata! 🎉',
      'Vaše nabídka na "' || COALESCE(v_title, '') || '" byla přijata.',
      '/poptavka/' || NEW.request_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_offer_accepted ON public.offers;
CREATE TRIGGER trg_notify_offer_accepted
  AFTER UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_offer_accepted();

-- 4) Zakázat klientský INSERT do notifications (triggery + service-role RLS bypassují).
DROP POLICY IF EXISTS notifications_insert_auth ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY notifications_no_client_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (false);

-- 5) Defense-in-depth: délka obsahu zpráv (klient slice(0,2000), ale i přímý insert).
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_content_len;
ALTER TABLE public.messages ADD CONSTRAINT messages_content_len
  CHECK (char_length(content) BETWEEN 1 AND 4000);
