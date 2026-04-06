import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPublicCertificate, getCertificatePhotoUrl, saveCustomerSignature } from '@/lib/store'
import { Certificate, BUSINESS_TYPE_LABELS } from '@/lib/types'
import { Loader2, ShieldCheck, ShieldOff, Lock, ExternalLink, Printer } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'

export default function VerifyCertificate() {
  const { certId } = useParams<{ certId: string }>()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Signature pad state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [savingSignature, setSavingSignature] = useState(false)
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!certId) return
    getPublicCertificate(certId).then(data => {
      if (data) {
        setCert(data)
        if (data.customer_signature_url) {
          setSavedSignatureUrl(data.customer_signature_url)
        }
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })
  }, [certId])

  // Canvas drawing handlers
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasSigned(true)
  }, [getCanvasCoords])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasCoords(e)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing, getCanvasCoords])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }, [])

  const handleSaveSignature = useCallback(async () => {
    if (!canvasRef.current || !certId) return
    setSavingSignature(true)
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png')
      const url = await saveCustomerSignature(certId, dataUrl)
      setSavedSignatureUrl(url)
    } catch (err) {
      console.error('Failed to save signature:', err)
    } finally {
      setSavingSignature(false)
    }
  }, [certId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <Loader2 size={32} className="animate-spin text-red-600" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-zinc-400" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Certificate Not Available</h1>
        <p className="text-sm text-zinc-500">This certificate is either private or does not exist.</p>
      </div>
    </div>
  )

  if (!cert) return null

  // Support both legacy and new formats
  const isNewFormat = !!cert.vehicle_id
  const intake = (cert as any).intake
  const customer = cert.customer || intake?.customer
  const vehicle = cert.vehicle
  const photos = cert.photos || []
  const business = cert.business

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ')
    : [intake?.year, intake?.make, intake?.model].filter(Boolean).join(' ') || '—'
  const vin = vehicle?.vin || intake?.vin
  const techName = cert.technician_name || (cert as any).technician?.display_name || null
  const isWarrantyActive = cert.status === 'active' && new Date(cert.warranty_expiry) > new Date()
  const qrUrl = `${window.location.origin}/verify/${certId}`
  const serviceDate = cert.service_date || cert.created_at

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      {/* Print button - top right, hidden in print */}
      <div className="max-w-2xl mx-auto px-4 pt-4 print:hidden">
        <div className="flex justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Printer size={14} /> Print Certificate
          </button>
        </div>
      </div>

      {/* Certificate document */}
      <div className="max-w-2xl mx-auto p-4 print:p-0 print:max-w-none">
        <div className="bg-white rounded-xl shadow-lg print:shadow-none print:rounded-none overflow-hidden">
          {/* Document header */}
          <div className="relative px-8 pt-8 pb-6">
            {/* QR code - top right */}
            <div className="absolute top-6 right-6 print:top-4 print:right-4">
              <QRCodeSVG value={qrUrl} size={72} level="M" />
            </div>

            {/* Logo + company name centered */}
            <div className="text-center">
              {business?.logo_url && (
                <div className="mb-3 flex justify-center">
                  <img src={business.logo_url} alt={business.name} className="h-14 object-contain" />
                </div>
              )}
              {business?.name && (
                <h1 className="text-xl font-bold text-zinc-900 tracking-wide uppercase">{business.name}</h1>
              )}
            </div>

            {/* WARRANTY CERTIFICATE title */}
            <div className="text-center mt-5 mb-4">
              <h2 className="text-2xl font-bold tracking-[0.2em] text-zinc-800 uppercase">Warranty Certificate</h2>
              <div className="w-24 h-0.5 bg-zinc-300 mx-auto mt-3" />
            </div>

            {/* Certificate number + status badge */}
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="text-sm text-zinc-500 font-mono">{cert.certificate_number}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                isWarrantyActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {isWarrantyActive ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                {isWarrantyActive ? 'Active' : cert.status === 'voided' ? 'Voided' : 'Expired'}
              </span>
              {cert.business_type && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
                  {BUSINESS_TYPE_LABELS[cert.business_type]}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-8 border-t border-zinc-200" />

          {/* Certificate body - structured rows */}
          <div className="px-8 py-6 space-y-0">
            <InfoRow label="Customer Name" value={customer?.name || '—'} />
            <InfoRow label="Vehicle" value={vehicleLabel} />
            {vin && (
              <InfoRow label="VIN" value={
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm">{vin}</span>
                  <Link to={`/vin/${vin}`} className="text-red-600 hover:text-red-700 flex items-center gap-0.5 text-xs print:hidden">
                    History <ExternalLink size={10} />
                  </Link>
                </span>
              } />
            )}
            <InfoRow label="Service Date" value={formatDate(serviceDate)} />
            {business?.name && (
              <InfoRow label="Issuing Company" value={business.name} />
            )}
            {business?.address && (
              <InfoRow label="Address" value={business.address} />
            )}
            <div className="grid grid-cols-2 border-b border-zinc-100">
              {business?.phone && (
                <div className="py-3 pr-4">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Phone</span>
                  <p className="text-sm font-medium text-zinc-900 mt-0.5">{business.phone}</p>
                </div>
              )}
              {techName && (
                <div className="py-3 pl-4">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Installer</span>
                  <p className="text-sm font-medium text-zinc-900 mt-0.5">{techName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Service details section */}
          {(isNewFormat && cert.details) ? (
            <div className="px-8 pb-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Service Details</h3>
              <PublicDetailSection
                businessType={cert.business_type!}
                details={cert.details}
                serviceDate={cert.service_date}
                technicianName={cert.technician_name || (cert as any).technician?.display_name}
              />
            </div>
          ) : (cert.coating_brand || cert.coating_product) ? (
            <div className="px-8 pb-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Service Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Brand</p>
                  <p className="text-sm font-medium text-zinc-900">{cert.coating_brand}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Product</p>
                  <p className="text-sm font-medium text-zinc-900">{cert.coating_product}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Divider */}
          <div className="mx-8 border-t border-zinc-200" />

          {/* Warranty status section */}
          <div className="px-8 py-6">
            <div className={`p-5 rounded-lg ${isWarrantyActive ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isWarrantyActive
                    ? <ShieldCheck size={28} className="text-emerald-600" />
                    : <ShieldOff size={28} className="text-red-500" />
                  }
                  <div>
                    <p className={`text-lg font-bold ${isWarrantyActive ? 'text-emerald-700' : 'text-red-600'}`}>
                      {isWarrantyActive ? 'Warranty Active' : cert.status === 'voided' ? 'Warranty Voided' : 'Warranty Expired'}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {cert.warranty_years} year{cert.warranty_years > 1 ? 's' : ''} coverage
                      {cert.warranty_mileage_cap && ` or ${cert.warranty_mileage_cap.toLocaleString()} miles`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">{isWarrantyActive ? 'Expires' : 'Expired'}</p>
                  <p className="text-sm font-bold text-zinc-800">{formatDate(cert.warranty_expiry)}</p>
                </div>
              </div>
            </div>

            {/* Warranty statement */}
            <p className="mt-4 text-sm text-zinc-500 italic text-center leading-relaxed">
              This warranty is valid for {cert.warranty_years} year{cert.warranty_years > 1 ? 's' : ''} from the date of service
              {cert.warranty_mileage_cap ? `, or ${cert.warranty_mileage_cap.toLocaleString()} miles, whichever comes first` : ''}.
              Subject to the terms and conditions of the issuing company.
            </p>
          </div>

          {/* Divider */}
          <div className="mx-8 border-t border-zinc-200" />

          {/* Signatures section - two side by side */}
          <div className="px-8 py-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Signatures</h3>
            <div className="grid grid-cols-2 gap-8">
              {/* Shop Signature */}
              <div>
                {business?.signature_url ? (
                  <div className="h-20 flex items-end justify-center mb-2">
                    <img src={business.signature_url} alt="Shop Signature" className="max-h-20 object-contain" />
                  </div>
                ) : (
                  <div className="h-20 flex items-end mb-2" />
                )}
                <div className="border-t border-zinc-400 pt-2">
                  <p className="text-xs text-zinc-500 text-center">Shop Signature</p>
                </div>
              </div>

              {/* Customer Signature */}
              <div>
                {savedSignatureUrl ? (
                  <>
                    <div className="h-20 flex items-end justify-center mb-2">
                      <img src={savedSignatureUrl} alt="Customer Signature" className="max-h-20 object-contain" />
                    </div>
                    <div className="border-t border-zinc-400 pt-2">
                      <p className="text-xs text-zinc-500 text-center">Customer Signature</p>
                    </div>
                  </>
                ) : (
                  <div className="print:block">
                    {/* Interactive canvas - hidden in print */}
                    <div className="print:hidden">
                      <canvas
                        ref={canvasRef}
                        width={300}
                        height={80}
                        className="w-full h-20 border border-zinc-200 rounded cursor-crosshair bg-white touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      <div className="border-t border-zinc-400 pt-2">
                        <p className="text-xs text-zinc-500 text-center">Customer Signature</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={clearCanvas}
                          className="text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded border border-zinc-200 transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleSaveSignature}
                          disabled={!hasSigned || savingSignature}
                          className="flex-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                        >
                          {savingSignature && <Loader2 size={12} className="animate-spin" />}
                          {savingSignature ? 'Saving...' : 'Sign & Save'}
                        </button>
                      </div>
                    </div>
                    {/* Print fallback - blank line */}
                    <div className="hidden print:block">
                      <div className="h-20" />
                      <div className="border-t border-zinc-400 pt-2">
                        <p className="text-xs text-zinc-500 text-center">Customer Signature</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photos section */}
          {photos.length > 0 && (
            <>
              <div className="mx-8 border-t border-zinc-200" />
              <div className="px-8 py-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Installation Photos</h3>
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo: any) => (
                    <div key={photo.id} className="relative rounded-lg overflow-hidden aspect-square border border-zinc-200">
                      <img
                        src={getCertificatePhotoUrl(photo.storage_path)}
                        alt={photo.photo_type}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-1 capitalize font-medium">
                        {photo.photo_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="px-8 py-4 border-t border-zinc-100 bg-zinc-50/50 print:bg-white">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium text-center">
              Powered by Pro Hub
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Info Row Component ──────────────────────────── */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] py-3 border-b border-zinc-100 items-baseline">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{typeof value === 'string' ? value : value}</span>
    </div>
  )
}

/* ── Public Detail Section (kept from original) ──── */

function PublicDetailSection({ businessType, details, serviceDate, technicianName }: {
  businessType: string
  details: Record<string, any>
  serviceDate: string | null
  technicianName: string | null
}) {
  // Show key fields based on business type
  const keyFields: Record<string, any> = {}
  const d = details as any

  if (businessType === 'CERAMIC_COATING') {
    if (d.coating_brand) keyFields['Brand'] = d.coating_brand
    if (d.coating_product) keyFields['Product'] = d.coating_product
    if (d.layers_applied) keyFields['Layers'] = d.layers_applied
    if (d.surfaces_coated?.length) keyFields['Surfaces'] = d.surfaces_coated.map((s: string) => s.replace(/_/g, ' ')).join(', ')
  } else if (businessType === 'WINDOW_TINT') {
    if (d.film_brand) keyFields['Brand'] = d.film_brand
    if (d.film_product) keyFields['Product'] = d.film_product
    if (d.film_type) keyFields['Type'] = d.film_type
    if (d.vlt_windshield != null) keyFields['VLT Windshield'] = `${d.vlt_windshield}%`
    if (d.vlt_front != null) keyFields['VLT Front'] = `${d.vlt_front}%`
    if (d.vlt_rear != null) keyFields['VLT Rear'] = `${d.vlt_rear}%`
    if (d.vlt_back != null) keyFields['VLT Back'] = `${d.vlt_back}%`
    if (d.vlt_sunroof != null) keyFields['VLT Sunroof'] = `${d.vlt_sunroof}%`
    if (d.windows_covered?.length) keyFields['Windows'] = d.windows_covered.map((s: string) => s.replace(/_/g, ' ')).join(', ')
    if (d.uv_rejection_pct != null) keyFields['UV Rejection'] = `${d.uv_rejection_pct}%`
    if (d.ir_rejection_pct != null) keyFields['IR Rejection'] = `${d.ir_rejection_pct}%`
    if (d.state_compliant != null) keyFields['State Compliant'] = d.state_compliant ? 'Yes' : 'No'
  } else if (businessType === 'PPF') {
    if (d.film_brand) keyFields['Brand'] = d.film_brand
    if (d.film_product) keyFields['Product'] = d.film_product
    if (d.coverage_areas?.length) keyFields['Coverage'] = d.coverage_areas.map((s: string) => s.replace(/_/g, ' ')).join(', ')
  } else if (businessType === 'AUDIO_ELECTRONICS') {
    if (d.install_type?.length) keyFields['Install Type'] = d.install_type.map((s: string) => s.replace(/_/g, ' ')).join(', ')
    if (d.labor_scope) keyFields['Scope'] = d.labor_scope
  } else if (businessType === 'MECHANICAL') {
    if (d.service_category) keyFields['Category'] = d.service_category
    if (d.labor_description) keyFields['Work'] = d.labor_description
  } else if (businessType === 'WHEELS_TIRES') {
    if (d.service_type) keyFields['Service'] = d.service_type.replace(/_/g, ' ')
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(keyFields).map(([label, val]) => (
        <div key={label}>
          <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
          <p className="text-sm font-medium text-zinc-900">{val}</p>
        </div>
      ))}
      {serviceDate && (
        <div>
          <p className="text-xs text-zinc-400 mb-0.5">Service Date</p>
          <p className="text-sm font-medium text-zinc-900">{formatDate(serviceDate)}</p>
          {technicianName && <p className="text-xs text-zinc-500">by {technicianName}</p>}
        </div>
      )}
    </div>
  )
}
