import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Job } from '@/lib/types'
import { startJob, uploadJobPhoto, useJobPhotos, getJobPhotoUrl } from '@/lib/store'
import PhotoUploader from './PhotoUploader'

interface Props {
  job: Job
  technicianId: string
  onClose: () => void
  onStarted: () => void
}

function getVehicleInfo(job: Job): string | null {
  if (job.intake) {
    const { year, make, model, color } = job.intake
    const parts = [year, make, model].filter(Boolean).join(' ')
    if (!parts) return null
    return color ? `${parts} · ${color}` : parts
  }
  if (job.appointment) {
    const { vehicle_year, vehicle_make, vehicle_model, vehicle_color } = job.appointment
    const parts = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ')
    if (!parts) return null
    return vehicle_color ? `${parts} · ${vehicle_color}` : parts
  }
  return null
}

function getCustomerName(job: Job): string {
  if (job.customer?.name) return job.customer.name
  if (job.appointment?.customer_name) return job.appointment.customer_name
  return 'Unknown Customer'
}

export default function StartJobModal({ job, technicianId, onClose, onStarted }: Props) {
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const { photos: existingPhotos, loading: photosLoading } = useJobPhotos(job.id)

  const beforePhotos = existingPhotos.filter(p => p.photo_type === 'before')
  const existingForUploader = beforePhotos.map(p => ({
    url: getJobPhotoUrl(p.storage_path),
    id: p.id,
  }))

  const customerName = getCustomerName(job)
  const vehicle = getVehicleInfo(job)
  const isWalkIn = !!job.intake_id
  const isScheduled = !!job.appointment_id

  const handleUploadAndStart = async () => {
    setLoading(true)
    try {
      for (const file of photos) {
        await uploadJobPhoto(job.id, job.business_id, file, 'before')
      }
      await startJob(job.id, technicianId)
      onStarted()
    } catch (e: any) {
      alert(e.message || 'Failed to start job')
      setLoading(false)
    }
  }

  const handleSkipAndStart = async () => {
    setLoading(true)
    try {
      await startJob(job.id, technicianId)
      onStarted()
    } catch (e: any) {
      alert(e.message || 'Failed to start job')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 pb-20 sm:pb-4 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/60">
          <h3 className="text-base font-bold text-zinc-900">Start Job</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
          >
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Customer & Vehicle info */}
          <div className="rounded-xl border border-zinc-200/60 p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-zinc-900">{customerName}</p>
              {isWalkIn && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600">Walk-in</span>
              )}
              {isScheduled && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600">Scheduled</span>
              )}
            </div>
            {vehicle && (
              <p className="text-[13px] text-zinc-500 mt-1">{vehicle}</p>
            )}
          </div>

          {/* Before Photos */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Before Photos</h4>
            {photosLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-zinc-300" />
              </div>
            ) : (
              <PhotoUploader
                photos={photos}
                onChange={setPhotos}
                existingPhotos={existingForUploader}
                label=""
                maxPhotos={20}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-zinc-200/60">
          <button
            onClick={handleSkipAndStart}
            disabled={loading}
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Skip & Start'}
          </button>
          <button
            onClick={handleUploadAndStart}
            disabled={loading || photos.length === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Upload & Start
          </button>
        </div>
      </div>
    </div>
  )
}
