#!/usr/bin/env bash
# GamePlaza one-command installer for Ubuntu 22.04+ (Beget VPS / любой VPS)
# Запуск одной командой на чистом сервере под root:
#   bash <(curl -fsSL https://raw.githubusercontent.com/sawin0901-ctrl/digi-bazaar/main/scripts/install.sh)

set -euo pipefail

### ─── Настройки (можно переопределить переменными окружения) ──────────────
DOMAIN="${DOMAIN:-gameplaza.site}"
WWW_DOMAIN="${WWW_DOMAIN:-www.gameplaza.site}"
EMAIL="${EMAIL:-admin@gameplaza.site}"
REPO_URL="${REPO_URL:-https://github.com/sawin0901-ctrl/digi-bazaar.git}"
APP_DIR="${APP_DIR:-/var/www/gameplaza}"
APP_NAME="${APP_NAME:-gameplaza}"
PORT="${PORT:-3000}"

# Supabase (Lovable Cloud) — публичные ключи, можно зашить
SUPABASE_URL_DEFAULT="https://ckgikatsuqgczqugpxoc.supabase.co"
SUPABASE_ANON_DEFAULT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2lrYXRzdXFnY3pxdWdweG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDczMTUsImV4cCI6MjA5NzE4MzMxNX0.IaDWjjwYenACckeElYlXg9wq-4odj8Zha1Fx0-ouDY4"
SUPABASE_PROJECT_ID_DEFAULT="ckgikatsuqgczqugpxoc"

VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-$SUPABASE_URL_DEFAULT}"
VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-$SUPABASE_ANON_DEFAULT}"
VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-$SUPABASE_PROJECT_ID_DEFAULT}"

### ─── Хелперы ─────────────────────────────────────────────────────────────
log() { printf "\n\033[1;32m==> %s\033[0m\n" "$*"; }
warn(){ printf "\n\033[1;33m!! %s\033[0m\n" "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Запустите скрипт от root:  sudo -i  затем повторите команду"; exit 1
fi

export DEBIAN_FRONTEND=noninteractive

### ─── 1. Системные пакеты ─────────────────────────────────────────────────
log "Обновление системы и установка базовых пакетов"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx ufw certbot python3-certbot-nginx \
  build-essential ca-certificates gnupg unzip

### ─── 2. Node.js 20 + Bun + PM2 ───────────────────────────────────────────
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -c2-3)" -lt 20 ]]; then
  log "Установка Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v bun >/dev/null 2>&1; then
  log "Установка Bun"
  curl -fsSL https://bun.sh/install | bash
  ln -sf /root/.bun/bin/bun /usr/local/bin/bun
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "Установка PM2"
  npm i -g pm2
fi

### ─── 3. Firewall ─────────────────────────────────────────────────────────
log "Настройка firewall (22, 80, 443)"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
yes | ufw enable || true

### ─── 4. Swap (если RAM < 3 ГБ) ───────────────────────────────────────────
if ! swapon --show | grep -q .; then
  RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
  if [[ "$RAM_MB" -lt 3000 ]]; then
    log "Создание swap-файла 2 ГБ (RAM=${RAM_MB}M)"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

### ─── 5. Клонирование репозитория ─────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  log "Обновление существующего репозитория в $APP_DIR"
  cd "$APP_DIR" && git pull
else
  log "Клонирование $REPO_URL в $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

### ─── 6. .env ─────────────────────────────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  log "Создание .env"
  cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=${PORT}
PUBLIC_SITE_URL=https://${DOMAIN}

VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}

# Digiseller — заполните вручную:
DIGISELLER_SELLER_ID=
DIGISELLER_API_KEY=

# Lovable AI Gateway — заполните при необходимости:
LOVABLE_API_KEY=
EOF
  chmod 600 "$APP_DIR/.env"
else
  warn ".env уже существует — пропускаю"
fi

### ─── 7. Установка зависимостей и сборка ──────────────────────────────────
log "bun install"
cd "$APP_DIR"
bun install

log "bun run build"
bun run build

### ─── 8. PM2 ──────────────────────────────────────────────────────────────
log "Запуск приложения через PM2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  cd "$APP_DIR"
  pm2 start .output/server/index.mjs --name "$APP_NAME" --env-file .env -i 2
fi
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null || true

### ─── 9. Nginx ────────────────────────────────────────────────────────────
log "Настройка Nginx для ${DOMAIN}"
cat > /etc/nginx/sites-available/${APP_NAME} <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

### ─── 10. SSL (Let's Encrypt) ─────────────────────────────────────────────
log "Проверка DNS перед выпуском SSL"
SERVER_IP=$(curl -fsSL https://api.ipify.org || echo "")
DOMAIN_IP=$(getent hosts "${DOMAIN}" | awk '{print $1; exit}' || echo "")

if [[ -n "$SERVER_IP" && "$SERVER_IP" == "$DOMAIN_IP" ]]; then
  log "DNS ок ($DOMAIN -> $DOMAIN_IP), выпускаю сертификат"
  certbot --nginx \
    -d "${DOMAIN}" -d "${WWW_DOMAIN}" \
    --redirect --agree-tos -m "${EMAIL}" --non-interactive || \
    warn "Certbot не смог выпустить сертификат — запустите вручную позже"
else
  warn "DNS ещё не указывает на этот сервер."
  warn "  Этот сервер: ${SERVER_IP:-?}"
  warn "  ${DOMAIN} -> ${DOMAIN_IP:-не резолвится}"
  warn "Добавьте A-записи @ и www -> ${SERVER_IP}, затем запустите:"
  warn "  certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN} --redirect --agree-tos -m ${EMAIL} --non-interactive"
fi

### ─── Готово ──────────────────────────────────────────────────────────────
log "Готово!"
echo
echo "  Сайт:         http://${DOMAIN}  (после SSL — https://${DOMAIN})"
echo "  Логи:         pm2 logs ${APP_NAME}"
echo "  Перезапуск:   pm2 reload ${APP_NAME}"
echo "  .env:         ${APP_DIR}/.env  (заполните DIGISELLER_* и LOVABLE_API_KEY)"
echo "  Обновление:   cd ${APP_DIR} && git pull && bun install && bun run build && pm2 reload ${APP_NAME}"
echo