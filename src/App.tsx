import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/store'
import { registerPushNotifications } from '@/lib/pushNotifications'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import NewIntake from '@/pages/NewIntake'
import Dashboard from '@/pages/Dashboard'
import IntakeHistory from '@/pages/IntakeHistory'
import Services from '@/pages/Services'
import Admin from '@/pages/Admin'
import SuperAdmin from '@/pages/SuperAdmin'
import PendingApproval from '@/pages/PendingApproval'
import ResetPassword from '@/pages/ResetPassword'
import Invoices from '@/pages/Invoices'
import InvoiceDetail from '@/pages/InvoiceDetail'
import Customers from '@/pages/Customers'
import Schedule from '@/pages/Schedule'
import Hours from '@/pages/Hours'
import Queue from '@/pages/Queue'
import BookingPage from '@/pages/BookingPage'
import Certify from '@/pages/Certify'
import CertifyNew from '@/pages/CertifyNew'
import CertificateDetail from '@/pages/CertificateDetail'
import VerifyCertificate from '@/pages/VerifyCertificate'
import VinHistory from '@/pages/VinHistory'
import PortalLayout from './components/PortalLayout'
import PortalBookings from './pages/portal/PortalBookings'
import PortalHistory from './pages/portal/PortalHistory'
import PortalProfile from './pages/portal/PortalProfile'
import FloatingJobPill from '@/components/FloatingJobPill'
import { Loader2 } from 'lucide-react'

export default function App() {
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (user && profile?.approved) {
      registerPushNotifications(user.id);
    }
  }, [user, profile?.approved]);

  if (loading || (user && profile === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  // Public routes (no auth required)
  if (window.location.pathname.startsWith('/verify/')) {
    return (
      <Routes>
        <Route path="/verify/:certId" element={<VerifyCertificate />} />
      </Routes>
    )
  }

  if (window.location.pathname.startsWith('/vin/')) {
    return (
      <Routes>
        <Route path="/vin/:vin" element={<VinHistory />} />
      </Routes>
    )
  }

  if (window.location.pathname.startsWith('/book/')) {
    return (
      <Routes>
        <Route path="/book/:slug" element={<BookingPage />} />
      </Routes>
    )
  }

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />
  }

  if (!user) return <Login />

  // Customer portal — separate layout, auto-approved
  if (user && profile?.role === 'customer') {
    return (
      <Routes>
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/verify/:certId" element={<VerifyCertificate />} />
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalBookings />} />
          <Route path="/portal/history" element={<PortalHistory />} />
          <Route path="/portal/profile" element={<PortalProfile />} />
        </Route>
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    )
  }

  if (!profile?.approved) return <PendingApproval />

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isSuperAdmin = profile?.role === 'super_admin'

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<NewIntake />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<IntakeHistory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/services" element={<Services />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/certify" element={<Certify />} />
          <Route path="/certify/new" element={<CertifyNew />} />
          <Route path="/certify/:id" element={<CertificateDetail />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/hours" element={<Hours />} />
          {isAdmin && <Route path="/admin" element={<Admin />} />}
          {isSuperAdmin && <Route path="/super-admin" element={<SuperAdmin />} />}
        </Route>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingJobPill />
    </>
  )
}
