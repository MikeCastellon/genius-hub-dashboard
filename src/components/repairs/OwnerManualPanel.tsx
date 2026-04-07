import { useState, useEffect } from 'react'
import { callRepairsVehicleDB } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import type { Vehicle } from '@/lib/types'
import { BookOpen, Download, Loader2, FileText } from 'lucide-react'

interface ManualData {
  year: string
  make: string
  model: string
  path: string
}

interface Props {
  vehicle: Vehicle
}

export default function OwnerManualPanel({ vehicle }: Props) {
  const [manual, setManual] = useState<ManualData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vehicle.vin) return
    setLoading(true)
    setError(null)

    callRepairsVehicleDB({ action: 'owner_manual', vin: vehicle.vin })
      .then(result => {
        const data = result?.data ?? result
        if (data && typeof data === 'object' && 'path' in data) {
          setManual(data as ManualData)
        } else {
          setManual(null)
        }
      })
      .catch(() => {
        setError('Failed to load owner manual')
        setManual(null)
      })
      .finally(() => setLoading(false))
  }, [vehicle.vin])

  const handleDownload = async () => {
    if (!vehicle.vin) return
    setDownloading(true)
    try {
      const { data, error } = await supabase.functions.invoke('repairs-vehicledb', {
        body: { action: 'download_manual', vin: vehicle.vin },
      })

      if (error) throw error

      // data comes back as a Blob when Content-Type is application/pdf
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${vehicle.year}_${vehicle.make}_${vehicle.model}_owners_manual.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || 'Failed to download manual')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-400">Loading owner's manual...</p>
      </div>
    )
  }

  if (error || !manual) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <BookOpen size={28} className="mx-auto text-zinc-300 mb-3" />
        <p className="text-sm text-zinc-400 font-medium">
          {error || "Owner's manual not available for this vehicle"}
        </p>
        <p className="text-xs text-zinc-300 mt-1">Coverage: US makes, model years 2000–2024</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-semibold text-zinc-800">Owner's Manual</h3>
      </div>

      {/* Manual Card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-5">
          {/* PDF Icon */}
          <div className="w-20 h-24 bg-red-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-red-100">
            <FileText size={32} className="text-red-500 mb-1" />
            <span className="text-[9px] font-bold text-red-400 uppercase">PDF</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-zinc-900 mb-1">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h4>
            <p className="text-sm text-zinc-500 mb-4">
              Official owner's manual from {vehicle.make}. Includes maintenance schedules,
              specifications, operating instructions, and warranty information.
            </p>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
