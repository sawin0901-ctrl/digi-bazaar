
-- =========================================================
-- ROLES
-- =========================================================
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create policy "users read own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "admins read all roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "admins manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- updated_at helper
-- =========================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- =========================================================
-- CATEGORIES
-- =========================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;

create policy "categories public read"
  on public.categories for select to anon, authenticated using (is_active);
create policy "categories admin all"
  on public.categories for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_categories_updated before update on public.categories
for each row execute function public.tg_set_updated_at();

-- =========================================================
-- PRODUCTS
-- =========================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category_slug text not null references public.categories(slug) on update cascade,
  seller text not null default '',
  seller_rating numeric(3,2) not null default 5.00,
  price integer not null default 0,         -- RUB, fallback / display
  old_price integer,
  rating numeric(2,1) not null default 5.0,
  reviews integer not null default 0,
  sales integer not null default 0,
  image text not null default '',
  badge text,                                -- HOT | NEW | -50% | ТОП
  description text not null default '',
  details_url text,                          -- partner page url
  buy_url text,                              -- partner pay url
  digiseller_id text,
  variant_label text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products(category_slug);
create index products_active_idx on public.products(is_active);

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;

create policy "products public read"
  on public.products for select to anon, authenticated using (is_active);
create policy "products admin all"
  on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_products_updated before update on public.products
for each row execute function public.tg_set_updated_at();

-- =========================================================
-- PRODUCT VARIANTS
-- =========================================================
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,                       -- shown to user, e.g. "5$ (USD)"
  usd_amount numeric(10,2),                  -- if set, RUB price is derived from FX rate
  price_rub integer,                         -- optional override
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index product_variants_product_idx on public.product_variants(product_id);

grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;
grant all on public.product_variants to service_role;
alter table public.product_variants enable row level security;

create policy "variants public read"
  on public.product_variants for select to anon, authenticated using (is_active);
create policy "variants admin all"
  on public.product_variants for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- SITE SETTINGS (key/value)
-- =========================================================
create table public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;

create policy "settings public read"
  on public.site_settings for select to anon, authenticated using (true);
create policy "settings admin all"
  on public.site_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_settings_updated before update on public.site_settings
for each row execute function public.tg_set_updated_at();

-- =========================================================
-- SITE TEXTS (rules / warranty / faq)
-- =========================================================
create table public.site_texts (
  slug text primary key,                     -- 'buyer_rules', 'warranty', ...
  title text not null,
  body text not null,                        -- markdown
  updated_at timestamptz not null default now()
);

grant select on public.site_texts to anon, authenticated;
grant insert, update, delete on public.site_texts to authenticated;
grant all on public.site_texts to service_role;
alter table public.site_texts enable row level security;

create policy "texts public read"
  on public.site_texts for select to anon, authenticated using (true);
create policy "texts admin all"
  on public.site_texts for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_texts_updated before update on public.site_texts
for each row execute function public.tg_set_updated_at();

-- =========================================================
-- CLICK EVENTS (analytics)
-- =========================================================
create table public.click_events (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  variant_label text,
  referer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index click_events_product_idx on public.click_events(product_slug, created_at desc);

grant insert on public.click_events to anon, authenticated;
grant select on public.click_events to authenticated;
grant all on public.click_events to service_role;
alter table public.click_events enable row level security;

create policy "anyone can log clicks"
  on public.click_events for insert to anon, authenticated with check (true);
create policy "admins read clicks"
  on public.click_events for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- SEED DATA
-- =========================================================
insert into public.site_settings(key, value) values
  ('partner_ai', '1022102'),
  ('partner_details_template', 'https://plati.market/itm/{id}?ai={ai}'),
  ('partner_buy_template', 'https://www.oplata.info/asp2/pay_wm.asp?id_d={id}&ai={ai}&_ow=0');

insert into public.categories(slug, name, description, sort_order) values
  ('games',    'Игры и ключи',     'Steam, Epic, Xbox, PlayStation',   1),
  ('subs',     'Подписки',         'Netflix, Spotify, YouTube Premium', 2),
  ('cards',    'Карты пополнения', 'Apple, Google Play, Steam Wallet',  3),
  ('software', 'Софт и лицензии',  'Windows, Office, антивирусы',       4);

-- Seed: Apple iTunes Gift Card USA
with p as (
  insert into public.products(
    slug, title, category_slug, seller, seller_rating, price, rating, reviews, sales,
    image, badge, description, details_url, buy_url, digiseller_id, variant_label
  ) values (
    'apple-itunes-usa-giftcard',
    'Apple iTunes Gift Card (USA) — от 2$ до 1000$ • Мгновенная доставка',
    'cards',
    'iTunes USA Store',
    4.98, 153, 4.9, 2601, 382375,
    'https://digiseller.mycdn.ink/imgwebp.ashx?idp=10433852&dc=833761589&w=576',
    'ТОП',
    'Официальная подарочная карта Apple iTunes для аккаунтов App Store, зарегистрированных в США. Большой выбор номиналов от 2$ до 1000$ — пополните Apple ID и оплачивайте приложения, игры, музыку, фильмы и подписки в App Store, iTunes и Apple Music. Карты приобретаются только в авторизованных точках продаж Apple — легальное происхождение и полная гарантия активации. Доставка кода происходит автоматически 24/7 сразу после оплаты. В случае проблем с кодом по нашей вине — гарантированный возврат или замена. Продавец работает с 2008 года и входит в топ‑10 по продажам подарочных карт iTunes USA на площадке.',
    'https://plati.market/itm/672298?ai=1022102',
    'https://www.oplata.info/asp2/pay_wm.asp?id_d=672298&ai=1022102&_ow=0',
    '672298',
    'Сумма на карте (моментальная доставка)'
  ) returning id
)
insert into public.product_variants(product_id, label, usd_amount, sort_order)
select p.id, v.label, v.usd, v.ord from p,
(values
  ('2$ (USD)',2,1),('3$ (USD)',3,2),('4$ (USD)',4,3),('5$ (USD)',5,4),
  ('6$ (USD)',6,5),('7$ (USD)',7,6),('8$ (USD)',8,7),('9$ (USD)',9,8),
  ('10$ (USD)',10,9),('15$ (USD)',15,10),('20$ (USD)',20,11),('25$ (USD)',25,12),
  ('30$ (USD)',30,13),('40$ (USD)',40,14),('50$ (USD)',50,15),('60$ (USD)',60,16),
  ('70$ (USD)',70,17),('80$ (USD)',80,18),('90$ (USD)',90,19),('100$ (USD)',100,20),
  ('150$ (USD)',150,21),('200$ (USD)',200,22),('250$ (USD)',250,23),('300$ (USD)',300,24),
  ('400$ (USD)',400,25),('500$ (USD)',500,26),('600$ (USD)',600,27),('800$ (USD)',800,28),
  ('1000$ (USD)',1000,29)
) as v(label, usd, ord);

insert into public.site_texts(slug, title, body) values
  ('buyer_rules', 'Правила покупки',
   E'## Правила покупки\n\nПеред оформлением заказа внимательно ознакомьтесь с описанием товара. Покупая цифровой товар, вы соглашаетесь с условиями продавца и подтверждаете, что регион вашего аккаунта соответствует региону приобретаемого товара.\n\n## Получение товара\n\nСразу после успешной оплаты вы получаете цифровой ключ на странице подтверждения заказа и продублированно — на e-mail.\n\n## Если возникла проблема\n\nВ течение 24 часов откройте диспут со страницы заказа — администрация площадки разберёт обращение и при подтверждении проблемы вернёт деньги.'),
  ('warranty', 'Гарантии',
   E'Сделка защищена площадкой: средства поступают продавцу только после успешного получения товара. Если товар не соответствует описанию или не активируется — деньги возвращаются в полном объёме.');
