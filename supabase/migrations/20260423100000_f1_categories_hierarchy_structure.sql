-- =============================================================
-- F1 — Hierarchické kategorie služeb (struktura)
-- 2úrovňový strom: parent_id IS NULL = hlavní kategorie.
-- Poznámka: ponecháváme stávající sloupce `name` a `description`
-- pro zpětnou kompatibilitu existujícího UI (UI je výhradně CZ).
-- =============================================================

-- Nové sloupce (idempotentně)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS categories_sort_order_idx ON public.categories(sort_order);

-- Constraint: nesmí existovat 3. úroveň (parent musí být hlavní kategorie)
CREATE OR REPLACE FUNCTION public.enforce_categories_two_levels()
RETURNS TRIGGER AS $$
DECLARE
  parent_parent_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Kategorie nemůže být vlastním rodičem.';
  END IF;

  SELECT parent_id INTO parent_parent_id
  FROM public.categories
  WHERE id = NEW.parent_id;

  IF parent_parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Hierarchie kategorií je omezena na 2 úrovně. Vybraný rodič (%) je sám podkategorií.', NEW.parent_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_enforce_two_levels ON public.categories;
CREATE TRIGGER categories_enforce_two_levels
  BEFORE INSERT OR UPDATE OF parent_id ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_categories_two_levels();

-- RLS: public read (už je). Přidáme admin write (master_admin / admin).
-- Existující policy "categories_select_all" ponecháme.

DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
CREATE POLICY "categories_admin_insert" ON public.categories
  FOR INSERT WITH CHECK (
    (SELECT admin_role FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
  );

DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
CREATE POLICY "categories_admin_update" ON public.categories
  FOR UPDATE USING (
    (SELECT admin_role FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
  ) WITH CHECK (
    (SELECT admin_role FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
  );

DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;
CREATE POLICY "categories_admin_delete" ON public.categories
  FOR DELETE USING (
    (SELECT admin_role FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
  );
