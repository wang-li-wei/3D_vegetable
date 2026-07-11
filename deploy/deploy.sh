#!/bin/bash
# ================================================================
#  生菜水培数字孪生平台 - 一键部署脚本
#  适用于 Ubuntu 22.04 / 20.04 阿里云服务器
#  使用方法：sudo bash deploy/deploy.sh
# ================================================================

set -e

# ===== 颜色定义 =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()   { echo -e "${CYAN}[部署]${NC} $1"; }
ok()    { echo -e "${GREEN}[成功]${NC} $1"; }
warn()  { echo -e "${YELLOW}[警告]${NC} $1"; }
fail()  { echo -e "${RED}[失败]${NC} $1"; exit 1; }

# ===== 检查是否为 root 用户 =====
if [ "$EUID" -ne 0 ]; then
  fail "请使用 root 用户运行此脚本：sudo bash deploy/deploy.sh"
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo ""
echo -e "${BOLD}================================================================${NC}"
echo -e "${BOLD}   🥬 生菜水培数字孪生平台 - 生产环境部署${NC}"
echo -e "${BOLD}================================================================${NC}"
echo ""

# ===== 第 1 步：系统更新 =====
echo -e "${BOLD}── 第 1 步：更新系统软件包 ──────────────────────${NC}"
log "正在更新系统..."
export DEBIAN_FRONTEND=noninteractive
apt update -qq && apt upgrade -y -qq
ok "系统更新完成"

# ===== 第 2 步：安装 Node.js 20 =====
echo ""
echo -e "${BOLD}── 第 2 步：安装 Node.js ──────────────────────${NC}"
if command -v node &>/dev/null && node -v | grep -q "v2[0-9]"; then
  ok "Node.js 已安装：$(node -v)"
else
  log "正在安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  ok "Node.js 安装完成：$(node -v)"
fi
ok "npm 版本：$(npm -v)"

# ===== 第 3 步：安装 PostgreSQL =====
echo ""
echo -e "${BOLD}── 第 3 步：安装 PostgreSQL 数据库 ──────────────────────${NC}"
if command -v psql &>/dev/null; then
  ok "PostgreSQL 已安装"
else
  log "正在安装 PostgreSQL..."
  apt install -y postgresql postgresql-contrib
  ok "PostgreSQL 安装完成"
fi

systemctl start postgresql
systemctl enable postgresql
ok "PostgreSQL 服务已启动"

# ===== 第 4 步：创建数据库和用户 =====
echo ""
echo -e "${BOLD}── 第 4 步：创建数据库 ──────────────────────${NC}"
PG_PASSWORD="postgres"  # 默认密码，可修改

if sudo -u postgres psql -lqt | cut -d '|' -f 1 | grep -qw vegetable_farm; then
  ok "数据库 vegetable_farm 已存在"
else
  log "创建数据库 vegetable_farm..."
  sudo -u postgres psql -c "CREATE DATABASE vegetable_farm;"
  sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '${PG_PASSWORD}';"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE vegetable_farm TO postgres;"
  ok "数据库创建完成"
fi

# ===== 第 5 步：安装 Mosquitto MQTT Broker =====
echo ""
echo -e "${BOLD}── 第 5 步：安装 Mosquitto MQTT Broker ──────────────────────${NC}"
if command -v mosquitto &>/dev/null; then
  ok "Mosquitto 已安装"
else
  log "正在安装 Mosquitto..."
  apt install -y mosquitto mosquitto-clients
  ok "Mosquitto 安装完成"
fi

# 配置 Mosquitto（支持 TCP + WebSocket）
log "配置 Mosquitto..."
cat > /etc/mosquitto/conf.d/vegetable.conf << 'EOF'
listener 1883 127.0.0.1
allow_anonymous true

listener 9001 127.0.0.1
protocol websockets
allow_anonymous true
EOF

systemctl restart mosquitto
systemctl enable mosquitto
ok "Mosquitto 已启动 (TCP:1883 + WebSocket:9001，仅监听本地)"

# ===== 第 6 步：安装 Nginx =====
echo ""
echo -e "${BOLD}── 第 6 步：安装 Nginx ──────────────────────${NC}"
if command -v nginx &>/dev/null; then
  ok "Nginx 已安装"
else
  log "正在安装 Nginx..."
  apt install -y nginx
  ok "Nginx 安装完成"
fi

# ===== 第 7 步：安装 PM2 =====
echo ""
echo -e "${BOLD}── 第 7 步：安装 PM2 进程管理器 ──────────────────────${NC}"
if command -v pm2 &>/dev/null; then
  ok "PM2 已安装"
else
  log "正在安装 PM2..."
  npm install -g pm2
  ok "PM2 安装完成"
fi

# ===== 第 8 步：安装项目依赖 =====
echo ""
echo -e "${BOLD}── 第 8 步：安装项目依赖 ──────────────────────${NC}"
log "安装前端依赖..."
npm install
ok "前端依赖安装完成"

log "安装后端依赖..."
cd server && npm install && cd ..
ok "后端依赖安装完成"

# ===== 第 9 步：配置后端环境变量 =====
echo ""
echo -e "${BOLD}── 第 9 步：配置环境变量 ──────────────────────${NC}"
cd server

if [ ! -f .env ]; then
  log "创建 .env 配置文件..."

  # 生成 JWT 密钥
  JWT_SECRET=$(openssl rand -hex 32)

  # 获取服务器公网 IP
  SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

  cat > .env << EOF
# ===== 安全配置 =====
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="24h"
DEFAULT_ADMIN_USER="admin"
DEFAULT_ADMIN_PASSWORD="changeme123"

# ===== 数据库 =====
DATABASE_URL="postgresql://postgres:${PG_PASSWORD}@localhost:5432/vegetable_farm?schema=public"

# ===== 服务 =====
PORT=3001
CORS_ORIGIN="http://${SERVER_IP}"

# ===== MQTT =====
MQTT_BROKER="mqtt://localhost:1883"
MQTT_SUBSCRIBE_TOPIC="/lettuce/sensor/data"
MQTT_PUBLISH_TOPIC="/lettuce/control/command"

# ===== 数据保留 =====
SENSOR_RETENTION_DAYS=30

# ===== 环境 =====
NODE_ENV=production
EOF

  ok ".env 配置文件已创建"
  warn "管理员默认密码：changeme123（请登录后修改）"
  warn "请记录此 JWT_SECRET（已自动写入 .env 文件）"
else
  ok ".env 文件已存在，跳过创建"
fi

cd ..

# ===== 第 10 步：构建前端 =====
echo ""
echo -e "${BOLD}── 第 10 步：构建前端 ──────────────────────${NC}"
log "正在构建前端（可能需要 1-2 分钟）..."
npm run build
ok "前端构建完成 → dist/"

# ===== 第 11 步：构建后端 =====
echo ""
echo -e "${BOLD}── 第 11 步：构建后端 ──────────────────────${NC}"
log "正在编译后端 TypeScript..."
cd server
npx prisma generate
npm run build
ok "后端编译完成 → dist/"

# ===== 第 12 步：初始化数据库表结构 =====
echo ""
echo -e "${BOLD}── 第 12 步：初始化数据库 ──────────────────────${NC}"
log "创建数据库表..."
npx prisma db push --skip-generate
ok "数据库表结构已创建"

log "写入默认配置数据..."
npx tsx prisma/seed.ts 2>/dev/null || true
ok "默认数据已写入"
cd ..

# ===== 第 13 步：部署前端到 Nginx 目录 =====
echo ""
echo -e "${BOLD}── 第 13 步：部署前端文件 ──────────────────────${NC}"
DEPLOY_DIR="/opt/3d-vegetable"
log "复制前端文件到 ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"
cp -r dist/* "${DEPLOY_DIR}/"
ok "前端文件已部署"

# ===== 第 14 步：配置 Nginx =====
echo ""
echo -e "${BOLD}── 第 14 步：配置 Nginx ──────────────────────${NC}"
log "写入 Nginx 配置..."
cat > /etc/nginx/sites-available/3d-vegetable << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    root /opt/3d-vegetable;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /mqtt {
        proxy_pass http://127.0.0.1:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/3d-vegetable /etc/nginx/sites-enabled/3d-vegetable
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
systemctl enable nginx
ok "Nginx 配置完成"

# ===== 第 15 步：启动后端服务 =====
echo ""
echo -e "${BOLD}── 第 15 步：启动后端服务 ──────────────────────${NC}"
mkdir -p logs

# 停止旧进程
pm2 delete vegetable-server 2>/dev/null || true

# 启动新进程
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true
ok "后端服务已启动 (PM2 管理)"

# ===== 完成 =====
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${BOLD}================================================================${NC}"
echo -e "${GREEN}  🎉 部署完成！${NC}"
echo -e "${BOLD}================================================================${NC}"
echo ""
echo -e "  前端地址：${GREEN}http://${SERVER_IP}${NC}"
echo -e "  API 检查：${GREEN}http://${SERVER_IP}/api/health${NC}"
echo -e "  管理员账号：admin"
echo -e "  管理员密码：changeme123（请尽快修改）"
echo ""
echo -e "${YELLOW}  ⚠️  请到阿里云控制台 → 安全组 → 添加入方向规则：${NC}"
echo -e "     TCP 端口 80  授权对象 0.0.0.0/0"
echo ""
echo -e "${CYAN}  常用命令：${NC}"
echo -e "     查看后端日志：pm2 logs vegetable-server"
echo -e "     重启后端：    pm2 restart vegetable-server"
echo -e "     重启 Nginx：  sudo systemctl restart nginx"
echo -e "     重启 Mosquitto：sudo systemctl restart mosquitto"
echo ""
echo -e "${BOLD}================================================================${NC}"
