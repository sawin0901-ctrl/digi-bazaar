ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS in_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS digiseller_category_id text;

CREATE UNIQUE INDEX IF NOT EXISTS products_digiseller_id_unique
  ON public.products (digiseller_id)
  WHERE digiseller_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_last_synced_at_idx
  ON public.products (last_synced_at NULLS FIRST);