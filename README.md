# DIGIVAULT — Маркетплейс цифровых товаров

DIGIVAULT — это современный маркетплейс цифровых товаров (игры, подписки, ключи, карты пополнения, софт) с мгновенной доставкой, интеграцией Digiseller, курсами валют и удобным каталогом.

## Стек технологий

- **Фреймворк:** [TanStack Start](https://tanstack.com/start/) (React 19 + SSR)
- **Стили:** Tailwind CSS v4 + shadcn/ui компоненты
- **База данных:** PostgreSQL через Supabase
- **Авторизация:** Supabase Auth (email + Google OAuth)
- **API интеграции:** Digiseller (товары и оплата), ЦБ РФ (курсы USD/EUR), CoinGecko (курс BTC)
- **Сборка:** Vite 7 + Cloudflare Workers (edge runtime)

## Требования

- **Node.js** 20+ или **Bun** 1.2+
- **Git**
- Аккаунт [Supabase](https://supabase.com) (бесплатный подходит)
- Аккаунт [Digiseller](https://digiseller.ru) (для синхронизации товаров)

## Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/ВАШ_ЮЗЕРНЕЙМ/digivault.git
cd digivault
```

### 2. Установка зависимостей

```bash
# Если используете Bun (рекомендуется)
bun install

# Или через npm
npm install
```

### 3. Создание проекта в Supabase

1. Зайдите в [Supabase Dashboard](https://supabase.com/dashboard)
2. Создайте новый проект
3. Скопируйте **Project URL** и **anon/public key**
4. В разделе **Authentication → Providers** включите Google OAuth (опционально)

### 4. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Supabase
SUPABASE_PROJECT_ID="your-project-ref"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

> **Важно:** `your-project-ref` — это референс проекта Supabase (строка в URL после `https://` и до `.supabase.co`).

### 5. Применение миграций базы данных

Миграции находятся в папке `supabase/migrations/`. Примените их через Supabase Dashboard или SQL Editor:

1. Откройте **SQL Editor** в Supabase Dashboard
2. Выполните SQL-файлы из `supabase/migrations/` по порядку (от самого старого к самому новому)
3. Или используйте Supabase CLI:

```bash
# Установите Supabase CLI, если ещё не установлен
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### 6. Запуск локального сервера разработки

```bash
# С Bun
bun run dev

# С npm
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:8080`

### 7. Настройка Digiseller (опционально)

Для синхронизации товаров с Digiseller:

1. Получите API ID и ключ в личном кабинете Digiseller
2. Добавьте в `.env`:

```env
DIGISELLER_API_ID="your-api-id"
DIGISELLER_API_KEY="your-api-key"
```

3. Настройте webhook в Digiseller для автоматического обновления каталога

## Скрипты

| Команда | Описание |
|---------|----------|
| `bun run dev` | Запуск dev-сервера (localhost:8080) |
| `bun run build` | Сборка для продакшена |
| `bun run build:dev` | Сборка в development-режиме |
| `bun run preview` | Предпросмотр продакшен-сборки |
| `bun run lint` | Проверка ESLint |
| `bun run format` | Форматирование кода Prettier |

## Структура проекта

```
digivault/
├── src/
│   ├── assets/           # Изображения и статика
│   ├── components/       # React компоненты (UI, marketplace)
│   ├── hooks/            # Кастомные React-хуки
│   ├── integrations/     # Интеграции (Supabase клиенты)
│   ├── lib/              # Утилиты, API, бизнес-логика
│   ├── routes/           # Файлы маршрутов TanStack Router
│   ├── router.tsx        # Конфигурация роутера
│   ├── server.ts         # SSR entry point
│   ├── start.ts          # Middleware и конфигурация сервера
│   └── styles.css        # Tailwind + глобальные стили
├── supabase/
│   └── migrations/       # SQL-миграции базы данных
├── .env                  # Переменные окружения (не коммитить!)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Деплой

### Cloudflare Workers (рекомендуется)

Проект настроен для деплоя на Cloudflare Workers через TanStack Start:

```bash
bun run build
```

Сборка создаст оптимизированный бандл. Деплой осуществляется через Cloudflare Dashboard или Wrangler CLI.

### Vercel / Netlify

Также возможен деплой на Vercel или Netlify — TanStack Start поддерживает адаптеры для различных платформ. См. [документацию TanStack Start](https://tanstack.com/start/latest/docs/framework/react/server-env#deployment).

### Локальный продакшен-режим

```bash
bun run build
bun run preview
```

## Настройка домена и публикации

1. Подключите свой домен в настройках хостинга
2. Убедитесь, что переменные окружения настроены для продакшена
3. Для HTTPS настройте SSL-сертификат (Cloudflare предоставляет бесплатно)

## Лицензия

MIT
