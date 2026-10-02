import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // По умолчанию Vite слушает только IPv6 (::1) — встроенный браузер
    // Claude и часть окружений туда не доходят и показывают ошибку
    // соединения. 127.0.0.1 открывается везде и не светит dev-сервер в сеть.
    host: '127.0.0.1',
  },
  optimizeDeps: {
    // Явно включаем зависимости лениво загружаемых страниц (BookingPage и т.д.),
    // иначе Vite обнаруживает их только при первом переходе на маршрут и
    // пере-оптимизирует на лету — это на миг создаёт вторую копию React
    // и ломает хуки ("Invalid hook call").
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'motion/react',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'zustand',
      '@supabase/supabase-js',
      'date-fns',
      'date-fns/locale',
      'sonner',
    ],
  },
})
