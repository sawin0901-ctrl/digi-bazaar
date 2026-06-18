# План: чистка ссылок Plati + контроль качества каталога

## 1. Миграция БД

Добавить в `public.products`:
- `is_published boolean not null default false` — единый флаг видимости.
- `quality_issues jsonb` — массив причин, по которым товар скрыт (для админки).
- `last_quality_check_at timestamptz`.

Индекс: `create index on products (is_published) where is_published = true`.

Бэкфилл существующих строк: `is_published = true` для всех, где есть `image`, `price > 0`, `title`, и в `description` нет признаков заглушки — остальные ставим в `false` с заполнением `quality_issues`.

## 2. Удаление ссылок на plati.market

### 2.1. На уровне генерации (sync/import)
В `src/lib/digiseller/sync.server.ts` и `src/lib/digiseller/products.functions.ts`:
- Убрать формирование `plati.market/itm/{id}?ai=...` для `buy_url`, `details_url`, `external_url`.
- Кнопка «Купить» (по выбору пользователя) → ссылка на Digiseller-платёж: `https://oplata.info/asp2/pay_wm.asp?id_d={digiseller_id}` (без бренда plati). Это поле `buy_url`.
- `details_url` / `external_url` → внутренние `/product/{slug}`.

### 2.2. Очистка контента (универсальная функция `sanitizePlatiLinks(text)`)
Регулярка ловит `https?://(www\.)?plati\.market/...` (включая markdown- и HTML-ссылки) и:
- Если URL содержит `/itm/.../{digisellerId}` — ищем товар в `products` по `digiseller_id`. Найден → заменяем на `https://gameplaza.site/product/{slug}`. Не найден → ставим товар в `product_import_queue` со статусом `pending` и временно заменяем на маркер `[[PLATI:{id}]]`, который второй проход после импорта заменит на внутренний URL.
- Если URL не содержит распознаваемый `id` — просто удаляем ссылку, оставляя текст.

Применяем `sanitizePlatiLinks` ко всем текстовым полям при сохранении: `description`, `short_description`, `full_description`, `instructions`, `seo_title`, `seo_description`, `seo_keywords`, `faq` (вопрос+ответ), `advantages`, `features`, `image_meta` (alt/title/caption).

### 2.3. Бэкфилл
Server function `cleanupPlatiLinks({ limit })` (admin-only): проходит по всем `products`, прогоняет sanitizer, обновляет строки. Кнопка в админке + ручной запуск.

## 3. Контроль качества перед публикацией

Модуль `src/lib/quality/check.server.ts` с функцией `evaluateProduct(product) => { ok, issues[] }`.

Правила (товар не публикуется, если хоть одно нарушено):

**Изображение**
- `image` не пустое;
- URL отвечает 200, content-type начинается с `image/`;
- размер ≥ 200×200 px (через HEAD + потоковое чтение первых байт sharp-free парсером дименсий);
- URL не содержит признаков заглушки (`placeholder`, `no-image`, `noimage`, `default`).

**Цена**: `price > 0`, число, не NaN.

**Наличие**: `availability !== 'out_of_stock'`, `in_stock !== false` (по последнему `product_availability_log`).

**Название**: длина ≥ 5 символов, есть хотя бы одно слово из 3+ букв, не состоит из 80%+ цифр/спецсимволов.

**Описание**: длина ≥ 100 символов после удаления HTML и ссылок; не состоит на 90%+ из URL.

Итог: при `ok=true` ставим `is_published=true`, иначе `false` и записываем `quality_issues`.

Интеграция:
- `importDigisellerProductById` → после upsert вызывает `evaluateProduct` и проставляет `is_published`.
- `runDailySync`, `processOneFromImportQueue` — то же самое.
- `runFullAvailabilityCheck` — при смене наличия обновляет `is_published` (см. п.4).

## 4. Авто-скрытие и восстановление

Расширить `src/lib/digiseller/availability.server.ts`:
- При обнаружении «нет в наличии / заблокирован / удалён» → `is_published=false`, добавить `quality_issues: ["unavailable"]`.
- При возвращении товара в наличии → перезапустить `evaluateProduct`; если все проверки пройдены → `is_published=true`.

## 5. Фильтрация по `is_published`

Везде, где читаются товары для публичных страниц, добавить `.eq('is_published', true)`:
- `src/lib/marketplace/catalog.functions.ts` — листинг, поиск, рекомендации.
- `src/routes/product.$slug.tsx` loader — если `is_published=false` → `throw notFound()` (404).
- `src/routes/sitemap[.]xml.ts` — выборка товаров для sitemap.
- `listDigisellerProducts` (если используется на публичных страницах) — фильтр после маппинга через локальную проверку.

В админке (`/admin`) — наоборот, показывать скрытые с бейджем причины (`quality_issues`).

## 6. Админка

- Колонка «Статус» (Published / Hidden + причины).
- Кнопка «Перепроверить качество» (per-item) и «Массовая перепроверка».
- Кнопка «Очистить ссылки Plati» (вызывает `cleanupPlatiLinks`).
- Возможность вручную поставить `is_published=true` (override) — но при следующей проверке наличия снова применится автоматика.

## Технические детали

- Sanitizer и quality-checker лежат в `src/lib/quality/` (server-only, `.server.ts`).
- Серверные функции в `*.functions.ts` под `requireSupabaseAuth` + `has_role('admin')`.
- Для проверки размеров изображений — использовать `image-size` (npm, без нативных бинарей) или ручной парсер JPEG/PNG/WebP заголовков; ставить таймаут 5с, при ошибке считать «изображение битое».
- Все обновления товаров пишут `last_quality_check_at = now()`.
- В UI карточек (`ProductCard`, страница товара) убрать любые fallback на `plati.market` — `digiseller_id` остаётся в БД, но не показывается ссылкой.

## Что НЕ входит
- Внутренний checkout/корзина на GamePlaza (по ответу пользователя — оставляем покупку через Digiseller).
- Удаление товаров из БД (только скрытие).
- AI-перегенерация описаний при чистке ссылок (это уже делает существующая SEO-логика отдельно).
