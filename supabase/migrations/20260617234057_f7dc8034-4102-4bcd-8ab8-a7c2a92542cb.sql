GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_import_queue TO authenticated;
CREATE POLICY "import queue admin all"
  ON public.product_import_queue
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));