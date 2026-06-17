# План: AI SEO-контент для карточек товаров

## Цель
После импорта/синхронизации с Digiseller AI автоматически создаёт уникальный SEO-контент для каждой карточки: meta-теги, заголовки, описания, FAQ, alt-тексты, ключевые слова и JSON-LD микроразметку. Админ может перегенерировать, редактировать вручную и блокировать автообновление.

## 1. Расширение схемы БД (миграция)

Добавить в `public.products` поля:
- `seo_title`, `seo_description`, `seo_keywords` (text)
- `seo_h1`, `seo_slug` (text)
- `short_description` (text) — краткое описание
- `full_description` (text) — расширенное (заменит/дополнит `description`)
- `advantages` (jsonb) — массив преимуществ
- `instructions` (text) — инструкция по использованию
- `faq` (jsonb) — `[{question, answer}]`
- `features` (jsonb) — особенности
- `keywords_grouped` (jsonb) — `{high, mid, low, lsi, commercial, informational}`
- `image_meta` (jsonb) — `[{url, alt, title, caption}]`
- `seo_locked` (boolean default false) — блокировка автообновления
- `seo_score` (int) — рейтинг 0–100
- `seo_generated_at` (timestamptz)

## 2. AI-генератор (`src/lib/seo/ai-seo.server.ts`)

Одна серверная функция `generateProductSeo(product)`:
- Через Lovable AI Gateway (`google/gemini-3-flash-preview`) с `Output.object` + Zod-схемой возвращает структурированный JSON со всеми полями выше за один вызов.
- Промпт включает: название, категорию, оригинальное описание Digiseller (как сырьё, не для копирования), URL изображений.
- Отдельная подзадача — alt/title для каждого изображения (батч в том же ответе).
- Подсчёт `seo_score` эвристикой (длина title 30–60, description 120–160, наличие H1/FAQ/keywords).

## 3. Интеграция в импорт/синхронизацию

В `src/lib/digiseller/sync.server.ts`:
- После `upsert` в `importDigisellerProductById` и `runDailySync` — если `seo_locked = false`, вызывать `generateProductSeo` и сохранять результат.
- Импорт остаётся быстрым: SEO-генерация — fire-and-forget (await, но с try/catch, чтобы ошибка AI не валила импорт).
- В `runDailyImport` — то же для каждого нового товара.

## 4. Отображение на странице товара (`src/routes/product.$slug.tsx`)

- `head()` использует `seo_title`, `seo_description`, `seo_keywords`, JSON-LD (Product, Offer, AggregateRating, FAQPage, BreadcrumbList).
- H1 = `seo_h1 ?? title`.
- Новые секции: Краткое описание, Преимущества (список), Особенности, Инструкция, FAQ (accordion).
- Изображения получают `alt` и `title` из `image_meta`.

## 5. Админ-панель (`src/routes/_authenticated/admin.tsx`)

Для каждого товара кнопки:
- **Перегенерировать SEO** — вызывает серверную функцию `regenerateSeo(productId)`.
- **Редактировать SEO** — модал с полями (title, description, H1, FAQ, advantages).
- **Заблокировать автообновление** — toggle `seo_locked`.
- Показ `seo_score` бейджем.
- Кнопка **Массовая перегенерация** — пройти по всем товарам с `seo_locked=false`.

## 6. Серверные функции (`src/lib/seo/seo.functions.ts`)

- `regenerateSeo({ productId })` — admin-only.
- `updateSeo({ productId, patch })` — ручное редактирование.
- `toggleSeoLock({ productId, locked })`.
- `bulkRegenerateSeo({ limit })`.

Все защищены `requireSupabaseAuth` + проверкой роли `admin` через `has_role`.

## 7. SEO URL (slug)

Текущий slug = `digi-{id}`. Добавить `seo_slug` (человекочитаемый, транслит названия) — опционально как редирект; основной роутинг оставить по `slug`, чтобы не ломать существующие ссылки. AI генерирует `seo_slug` для будущего использования / canonical.

## Технические детали

- **Модель**: `google/gemini-3-flash-preview` через существующий паттерн (как в `generateUniqueDescription`).
- **Schema** через Zod + `Output.object` (компактная, без длинных enum).
- **Уникальность**: в промпт добавляется `productId` + временной seed, температура 0.9.
- **Fallback**: если AI вернул ошибку — оставляем существующие поля, ставим `seo_score = 0`, лог в консоль.
- **Микроразметка**: рендерится в `head().scripts` в route файле.

## Что НЕ входит
- Реальная проверка уникальности через внешний антиплагиат (только за счёт температуры и индивидуальных промптов).
- Парсинг частотности из Wordstat/Google (AI генерирует кандидатов на основе своих знаний).
- Автогенерация новых изображений.
