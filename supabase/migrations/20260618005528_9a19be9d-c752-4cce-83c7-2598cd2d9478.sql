ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quality_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_quality_check_at timestamptz;

CREATE INDEX IF NOT EXISTS products_quality_issues_idx
  ON public.products USING gin (quality_issues)
  WHERE quality_issues <> '[]'::jsonb;