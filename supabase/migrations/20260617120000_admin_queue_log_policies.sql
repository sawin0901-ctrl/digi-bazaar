-- Allow admins to manage product_import_queue and read product_availability_log via authenticated client
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_import_queue TO authenticated;

CREATE POLICY "import queue admin all"
  ON public.product_import_queue
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
