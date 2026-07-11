#!/bin/sh
set -e

# 同步数据库表结构（项目未用 Prisma Migrate）
cd /app/server
npx prisma db push --skip-generate --accept-data-loss

# 启动后端 API
node dist/index.js &

# 启动 Nginx 提供前端 + 反向代理
nginx -g 'daemon off;'
