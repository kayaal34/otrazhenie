// После сборки копирует dist/index.html в dist/404.html.
//
// Зачем: у Timeweb Cloud App Platform (как и у многих других статических
// хостингов без документированного механизма SPA-фолбэка) при обращении к
// несуществующему на диске пути сервер обычно ищет и отдаёт файл 404.html,
// если он есть. Раз в приложении единственная реальная HTML-страница —
// index.html, а весь роутинг клиентский (React Router), то 404.html с тем
// же содержимым решает проблему «белого экрана»/ошибки при обновлении
// страницы или прямом переходе на вложенный путь (например, /booking) —
// сервер отдаёт SPA-оболочку, а дальше маршрутизацией занимается уже
// React Router в браузере.
//
// Дополняет public/_redirects (синтаксис в духе Netlify) — оставлен на
// случай, если используемый сервер статики его поддерживает; 404.html же
// работает почти везде, так как опирается на самое базовое поведение
// раздачи статики, а не на конкретный формат конфигурации.

import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const indexPath = resolve(distDir, 'index.html')
const fallbackPath = resolve(distDir, '404.html')

if (!existsSync(indexPath)) {
  console.error('dist/index.html не найден — сначала должна отработать сборка Vite.')
  process.exit(1)
}

copyFileSync(indexPath, fallbackPath)
console.log('dist/404.html создан как копия dist/index.html (SPA-фолбэк).')
