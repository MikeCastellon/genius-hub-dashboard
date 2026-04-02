import { useState } from 'react'
import { useServices, useCustomers, createIntake, useAuth } from '@/lib/store'
import { CartItem, PaymentMethod } from '@/lib/types'
import { CheckCircle, Loader2, FileText, Car } from 'lucide-react'
import VehicleForm from '@/components/VehicleForm'
import CustomerForm from '@/components/CustomerForm'
import ServicePicker from '@/components/ServicePicker'
import IntakeSummary from '@/components/IntakeSummary'
import PaymentSelector from '@/components/PaymentSelector'
import BarkoderScanner from '@/components/BarkoderScanner'
import { decodeVin, isLikelyVin } from '@/lib/utils'

interface VehicleData {
  vin: string
  year: string
  make: string
  model: string
  color: string
  license_plate: string
}

export default function NewIntake() {
  const { user, profile } = useAuth()
  const { services, loading: servicesLoading } = useServices()
  const { customers, refresh: refreshCustomers } = useCustomers()

  const [vehicle, setVehicle] = useState<VehicleData>({ vin: '', year: '', make: '', model: '', color: '', license_plate: '' })
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const handleVinDetected = async (vin: string) => {
    setShowScanner(false)
    setVehicle(v => ({ ...v, vin }))

    if (isLikelyVin(vin)) {
      try {
        const info = await decodeVin(vin)
        if (info) {
          setVehicle(v => ({ ...v, vin, year: info.year, make: info.make, model: info.model }))
        }
      } catch { /* ignore */ }
    }
  }

  const handleSubmit = async () => {
    if (!customer.name || !customer.phone || cart.length === 0 || !paymentMethod) {
      alert('Please fill in customer name, phone, add at least one service, and select a payment method.')
      return
    }
    setSubmitting(true)
    try {
      await createIntake(
        { name: customer.name, phone: customer.phone, email: customer.email || null },
        {
          vin: vehicle.vin || undefined,
          year: vehicle.year ? parseInt(vehicle.year) : undefined,
          make: vehicle.make || undefined,
          model: vehicle.model || undefined,
          color: vehicle.color || undefined,
          license_plate: vehicle.license_plate || undefined,
        },
        cart,
        paymentMethod,
        notes,
        user?.id,
        profile?.business_id
      )

      setSuccess(true)
      refreshCustomers()

      setTimeout(() => {
        setVehicle({ vin: '', year: '', make: '', model: '', color: '', license_plate: '' })
        setCustomer({ name: '', phone: '', email: '' })
        setCart([])
        setPaymentMethod(null)
        setNotes('')
        setSuccess(false)
      }, 2200)
    } catch (err: any) {
      alert('Error saving intake: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/25">
            <CheckCircle size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Intake Saved!</h2>
          <p className="text-zinc-400 mt-2 text-sm">Preparing new intake form...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {showScanner && (
        <BarkoderScanner
          onClose={() => setShowScanner(false)}
          onDetected={handleVinDetected}
          onFail={() => setShowScanner(false)}
        />
      )}

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-5">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Car size={18} className="text-red-600" />
            New Vehicle Intake
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">Scan VIN or enter details manually</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: Vehicle + Customer + Services */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="glass rounded-2xl p-4 md:p-5">
              <VehicleForm
                value={vehicle}
                onChange={setVehicle}
                onScanClick={() => setShowScanner(true)}
              />
            </div>

            <div className="glass rounded-2xl p-4 md:p-5">
              <CustomerForm
                customers={customers}
                value={customer}
                onChange={setCustomer}
              />
            </div>

            <div className="glass rounded-2xl p-4 md:p-5">
              {servicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-red-600" />
                </div>
              ) : (
                <ServicePicker
                  services={services}
                  cart={cart}
                  onCartChange={setCart}
                />
              )}
            </div>
          </div>

          {/* Right: Summary + Payment + Notes + Submit */}
          <div className="space-y-4 md:space-y-6">
            <div className="glass rounded-2xl p-4 md:p-5">
              <IntakeSummary cart={cart} onCartChange={setCart} />
            </div>

            <div className="glass rounded-2xl p-4 md:p-5">
              <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} />
            </div>

            <div className="glass rounded-2xl p-4 md:p-5">
              <h3 className="text-[13px] font-semibold text-zinc-800 flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileText size={13} className="text-amber-500" />
                </div>
                Notes
              </h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all resize-none"
                rows={3}
                placeholder="Optional notes about the vehicle or services..."
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0 || !paymentMethod || !customer.name || !customer.phone}
              className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white py-3 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-red-700/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                `Save Intake · $${cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
