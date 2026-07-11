#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()   { echo -e "${CYAN}[START]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}   $1"; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

PIDS=()

cleanup() {
  echo ""
  log "正在停止所有服务..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  docker stop vegetable_postgres vegetable_mosquitto 2>/dev/null || true
  ok "已清理所有服务"
  exit 0
}
trap cleanup SIGINT SIGTERM

check_deps() {
  local missing=()
  command -v node &>/dev/null || missing+=("node")
  command -v npm  &>/dev/null || missing+=("npm")
  if [ ${#missing[@]} -gt 0 ]; then
    fail "缺少必要依赖: ${missing[*]}"
    exit 1
  fi
}

pg_is_ready() {
  docker exec vegetable_postgres pg_isready -U postgres &>/dev/null 2>&1
}

wait_postgres_healthy() {
  local max_wait=30
  local count=0
  while [ $count -lt $max_wait ]; do
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^vegetable_postgres$" && \
       docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^vegetable_postgres$" && \
       pg_is_ready; then
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done
  return 1
}

ensure_docker_image() {
  local image="$1"
  local alt_image="$2"
  if ! docker image inspect "$image" &>/dev/null; then
    if [ -n "$alt_image" ]; then
      docker pull "$alt_image" &>/dev/null 2>&1 && docker tag "$alt_image" "$image" 2>/dev/null || true
    fi
  fi
}

start_postgres() {
  log "检查 PostgreSQL..."
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^vegetable_postgres$" && pg_is_ready; then
    ok "PostgreSQL 已在运行 (端口 5432)"
    return 0
  fi

  if ! command -v docker &>/dev/null; then
    warn "Docker 未安装，跳过 PostgreSQL"
    return 1
  fi

  local PG_IMAGE="postgres:16-alpine"
  ensure_docker_image "$PG_IMAGE" "docker.1ms.run/$PG_IMAGE"

  log "启动 PostgreSQL 容器..."
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^vegetable_postgres$"; then
    docker stop vegetable_postgres &>/dev/null || true
    docker rm vegetable_postgres &>/dev/null || true
    docker volume rm vegetable_pgdata 2>/dev/null || true
  fi

  docker run -d \
    --name vegetable_postgres \
    -e POSTGRES_DB=vegetable_farm \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 \
    -v vegetable_pgdata:/var/lib/postgresql/data \
    "$PG_IMAGE"

  if wait_postgres_healthy; then
    ok "PostgreSQL Docker 容器已启动 (端口 5432)"
    return 0
  fi

  warn "PostgreSQL 启动失败"
  return 1
}

init_db() {
  log "初始化数据库表结构..."
  if (cd server && npx prisma db push --skip-generate --accept-data-loss &>/dev/null 2>&1); then
    ok "数据库表结构已就绪"
  else
    log "初始化数据库失败，清理后重试..."
    docker stop vegetable_postgres &>/dev/null || true
    docker rm vegetable_postgres &>/dev/null || true
    docker volume rm vegetable_pgdata &>/dev/null || true

    docker run -d \
      --name vegetable_postgres \
      -e POSTGRES_DB=vegetable_farm \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -p 5432:5432 \
      -v vegetable_pgdata:/var/lib/postgresql/data \
      "$PG_IMAGE"

    if wait_postgres_healthy; then
      if (cd server && npx prisma db push --skip-generate --accept-data-loss &>/dev/null 2>&1); then
        ok "数据库表结构已就绪"
      else
        warn "数据库初始化失败"
        return 1
      fi
    else
      warn "数据库初始化失败"
      return 1
    fi
  fi

  log "初始化默认配置数据..."
  seed_default_data
  ok "数据库初始化完成"
  return 0
}

seed_default_data() {
  local count
  count=$(docker exec vegetable_postgres psql -U postgres -d vegetable_farm -t -c "SELECT COUNT(*) FROM threshold_config" 2>/dev/null | tr -d ' ')
  if [ "$count" = "0" ]; then
    docker exec vegetable_postgres psql -U postgres -d vegetable_farm -c "
      INSERT INTO threshold_config (parameter, min_val, max_val, updated_at) VALUES
        ('air_temp', 15, 30, NOW()),
        ('air_hum', 50, 85, NOW()),
        ('nutrient_temp', 18, 22, NOW()),
        ('light', 200, 800, NOW()),
        ('ph', 5.5, 6.5, NOW())
      ON CONFLICT (parameter) DO UPDATE SET min_val = EXCLUDED.min_val, max_val = EXCLUDED.max_val;
    " &>/dev/null || true
  fi

  count=$(docker exec vegetable_postgres psql -U postgres -d vegetable_farm -t -c "SELECT COUNT(*) FROM system_config" 2>/dev/null | tr -d ' ')
  if [ "$count" = "0" ]; then
    docker exec vegetable_postgres psql -U postgres -d vegetable_farm -c "
      INSERT INTO system_config (key, value) VALUES
        ('growth_stage', 'growing'),
        ('growth_day', '20'),
        ('planting_date', '$(date +%Y-%m-%d)')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    " &>/dev/null || true
  fi
}

start_mosquitto() {
  log "检查 MQTT Broker..."

  if ! command -v docker &>/dev/null; then
    warn "Docker 未安装，跳过 Mosquitto"
    return 1
  fi

  local MQ_IMAGE="eclipse-mosquitto:2"
  ensure_docker_image "$MQ_IMAGE" "docker.1ms.run/$MQ_IMAGE"

  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^vegetable_mosquitto$"; then
    docker stop vegetable_mosquitto &>/dev/null || true
    docker rm vegetable_mosquitto &>/dev/null || true
  fi

  if nc -z 127.0.0.1 1883 2>/dev/null; then
    log "检测到系统级 Mosquitto (1883)，启动 WebSocket 桥接代理 (9001)..."
    if nc -z 127.0.0.1 9001 2>/dev/null; then
      ok "Mosquitto WebSocket (9001) 已在运行"
      return 0
    fi

    local BRIDGE_CONF="/tmp/veg_mosquitto_bridge.conf"
    cat > "$BRIDGE_CONF" << 'BRIDGEEOF'
listener 9001
protocol websockets
allow_anonymous true

connection bridge-to-system
address host.docker.internal:1883
bridge_protocol_version mqttv311
bridge_insecure true
cleansession true
try_private false
round_robin false
topic /lettuce/# both 0
start_type automatic
BRIDGEEOF

    docker run -d \
      --name vegetable_mosquitto \
      --add-host=host.docker.internal:host-gateway \
      -p 9001:9001 \
      -v "$BRIDGE_CONF:/mosquitto/config/mosquitto.conf:ro" \
      "$MQ_IMAGE"

    sleep 3
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^vegetable_mosquitto$"; then
      ok "Mosquitto WebSocket 桥接代理已启动 (端口 9001)"
      return 0
    fi
    warn "Mosquitto WebSocket 桥接代理启动失败"
    return 1
  fi

  log "启动 Mosquitto Docker 容器 (TCP:1883 + WebSocket:9001)..."

  docker run -d \
    --name vegetable_mosquitto \
    -p 1883:1883 \
    -p 9001:9001 \
    -v "$PROJECT_DIR/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro" \
    "$MQ_IMAGE"

  sleep 3
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^vegetable_mosquitto$"; then
    ok "Mosquitto Docker 容器已启动 (TCP:1883 + WebSocket:9001)"
    return 0
  fi

  warn "Mosquitto Docker 容器启动失败"
  return 1
}

start_server() {
  log "启动后端 API 服务 (端口 3001)..."
  if curl -sf --max-time 3 http://127.0.0.1:3001/api/health &>/dev/null; then
    ok "后端 API 已在运行"
    return 0
  fi

  (cd server && npx tsx src/index.ts) &
  local pid=$!
  PIDS+=("$pid")
  sleep 4

  if kill -0 "$pid" 2>/dev/null && curl -sf --max-time 5 http://127.0.0.1:3001/api/health &>/dev/null; then
    ok "后端 API 已启动 (PID: $pid)"
    return 0
  fi

  warn "后端 API 启动失败"
  return 1
}

start_frontend() {
  log "启动前端开发服务器 (端口 3000)..."
  npx vite --host 0.0.0.0 --port 3000 --force
}

main() {
  check_deps

  echo ""
  echo -e "${BOLD}================================================${NC}"
  echo -e "${BOLD}   🥬 3D蔬菜数字孪生平台 - 一键启动${NC}"
  echo -e "${BOLD}================================================${NC}"
  echo ""

  echo -e "${BOLD}── 依赖检查 ──────────────────────────────────${NC}"
  log "检查 node_modules..."
  if [ ! -d "node_modules" ]; then
    log "安装前端依赖..."
    npm install --silent
  fi
  if [ ! -d "server/node_modules" ]; then
    log "安装后端依赖..."
    (cd server && npm install --silent)
  fi
  ok "依赖检查完成"

  echo ""
  echo -e "${BOLD}── 基础设施 ──────────────────────────────────${NC}"
  local PG_OK=false
  if start_postgres; then
    PG_OK=true
    init_db
  else
    warn "PostgreSQL 不可用，后端 API 将无法连接数据库"
  fi

  start_mosquitto

  echo ""
  echo -e "${BOLD}── 应用服务 ──────────────────────────────────${NC}"
  if [ "$PG_OK" = true ]; then
    start_server
  else
    warn "跳过后端启动（PostgreSQL 不可用）"
  fi

  echo ""
  echo -e "${BOLD}================================================${NC}"
  echo -e "${GREEN}  前端: http://localhost:3000${NC}"
  if [ "$PG_OK" = true ]; then
    echo -e "${GREEN}  后端: http://localhost:3001/api/health${NC}"
  fi
  echo -e "${CYAN}  按 Ctrl+C 停止所有服务${NC}"
  echo -e "${BOLD}================================================${NC}"
  echo ""

  start_frontend
}

main
