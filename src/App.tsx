import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { HomePage } from './pages/HomePage'

const BookingPage = lazy(() => import('./pages/BookingPage').then((m) => ({ default: m.BookingPage })))
const GalleryPage = lazy(() => import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const PrivacyPolicyPage = lazy(() =>
  import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })),
)
const PublicOfferPage = lazy(() =>
  import('./pages/PublicOfferPage').then((m) => ({ default: m.PublicOfferPage })),
)
const GiftCertificatePage = lazy(() =>
  import('./pages/GiftCertificatePage').then((m) => ({ default: m.GiftCertificatePage })),
)
const ManageBookingPage = lazy(() =>
  import('./pages/ManageBookingPage').then((m) => ({ default: m.ManageBookingPage })),
)
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const AdminSetPasswordPage = lazy(() =>
  import('./pages/AdminSetPasswordPage').then((m) => ({ default: m.AdminSetPasswordPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

function RouteFallback() {
  return <div className="py-24" />
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="offer" element={<PublicOfferPage />} />
            <Route path="gift-certificate" element={<GiftCertificatePage />} />
            <Route path="manage-booking" element={<ManageBookingPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/set-password" element={<AdminSetPasswordPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
