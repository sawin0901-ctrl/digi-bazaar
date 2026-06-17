
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS hide_reason text,
  ADD COLUMN IF NOT EXISTS last_available_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS products_hidden_at_idx ON public.products (hidden_at) WHERE hidden_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_availability_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  digiseller_id text,
  slug text,
  event text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pa_log_product_idx ON public.product_availability_log (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pa_log_created_idx ON public.product_availability_log (created_at DESC);

GRANT SELECT ON public.product_availability_log TO authenticated;
GRANT ALL ON public.product_availability_log TO service_role;

ALTER TABLE public.product_availability_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability log admin read"
  ON public.product_availability_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
