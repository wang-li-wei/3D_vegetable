import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three'
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) return 'antd'
          if (id.includes('node_modules/echarts')) return 'echarts'
          if (id.includes('node_modules/mqtt')) return 'mqtt'
        },
      },
    },
  },
})
