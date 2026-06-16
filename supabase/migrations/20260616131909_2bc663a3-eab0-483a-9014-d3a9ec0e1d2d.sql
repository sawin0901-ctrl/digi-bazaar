
-- Lock down has_role: it's only meant to be called by RLS policies (runs as definer),
-- not directly by clients.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;

-- Tighten click_events insert policy (avoid USING/CHECK = true warning)
drop policy if exists "anyone can log clicks" on public.click_events;
create policy "anyone can log clicks"
  on public.click_events for insert to anon, authenticated
  with check (product_slug is not null and length(product_slug) > 0);
