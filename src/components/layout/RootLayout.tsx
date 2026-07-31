import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileStickyBookCta } from './MobileStickyBookCta'

export function RootLayout() {
  return (
    <>
      <Header />
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileStickyBookCta />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)',
            background: 'var(--surface)',
            color: 'var(--blue-deep)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </>
  )
}
