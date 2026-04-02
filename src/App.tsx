import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/store'
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
import Schedule from '@/pages/Schedule'
import Hours from '@/pages/Hours'
import BookingPage from '@/pages/BookingPage'
import { Loader2 } from 'lucide-react'

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading || (user && profile === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  // Public routes (no auth required)
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
  if (!profile?.approved) return <PendingApproval />

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isSuperAdmin = profile?.role === 'super_admin'

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<NewIntake />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<IntakeHistory />} />
        <Route path="/services" element={<Services />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/hours" element={<Hours />} />
        {isAdmin && <Route path="/admin" element={<Admin />} />}
        {isSuperAdmin && <Route path="/super-admin" element={<SuperAdmin />} />}
      </Route>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
