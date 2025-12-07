import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,      // 强制指定端口为 5173
    strictPort: true, // 如果 5173 被占用，直接报错，而不是自动换成 5174
    host: true       // 允许局域网访问（可选）
  }
})