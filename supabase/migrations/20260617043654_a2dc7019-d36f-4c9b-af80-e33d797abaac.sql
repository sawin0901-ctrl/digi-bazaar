
CREATE TABLE public.product_import_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digiseller_id text NOT NULL UNIQUE,
  source_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

GRANT ALL ON public.product_import_queue TO service_role;

ALTER TABLE public.product_import_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX product_import_queue_status_idx ON public.product_import_queue(status, created_at);
