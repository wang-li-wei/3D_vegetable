// PM2 进程管理配置
// 使用方法：pm2 start ecosystem.config.cjs
// 日志查看：pm2 logs
// 重启服务：pm2 restart vegetable-server
// 停止服务：pm2 stop vegetable-server

module.exports = {
  apps: [
    {
      name: 'vegetable-server',
      cwd: './server',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
