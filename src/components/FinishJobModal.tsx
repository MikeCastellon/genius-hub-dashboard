import { useState, useEffect, useMemo } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { Job } from '../lib/types'
import { finishJob, uploadJobPhoto, useJobPhotos, getJobPhotoUrl } from '../lib/store'
import PhotoUploader from './PhotoUploader'

interface Props {
  job: Job
  onClose: () => void
  onFinished: () => void
}

export default function FinishJobModal({ job, onClose, onFinished }: Props) {
  const [afterPhotos, setAfterPhotos] = useState<File[]>([])
  const [notes, setNotes] = useState(job.notes || '')
  const [saving, setSaving] = useState(false)
  const [elapsed, setElapsed] = useState('')

  const { photos: jobPhotos, loading: photosLoading } = useJobPhotos(job.id)

  // Live timer
  useEffect(() => {
    if (!job.started_at) return

    const update = () => {
      const start = new Date(job.started_at!).getTime()
      const diff = Math.max(0, Date.now() - start)
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [job.started_at])

  // Before photos from existing job photos
  const beforePhotos = useMemo(() => {
    return jobPhotos
      .filter(p => p.photo_type === 'before')
      .map(p => ({ url: getJobPhotoUrl(p.storage_path), id: p.id }))
  }, [jobPhotos])

  // Vehicle info string
  const vehicle = [job.intake?.year, job.intake?.make, job.intake?.model]
    .filter(Boolean)
    .join(' ')
  const color = job.intake?.color

  const startedTime = job.started_at
    ? new Date(job.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null

  const handleComplete = async () => {
    setSaving(true)
    try {
      // Upload after photos
      for (const file of afterPhotos) {
        await uploadJobPhoto(job.id, job.business_id, file, 'after')
      }
      // Finish the job
      await finishJob(job.id, notes || undefined)
      onFinished()
    } catch (err) {
      console.error('Failed to complete job:', err)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 pb-20 sm:pb-4 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-lg font-bold text-zinc-900">Complete Job</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100 transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Summary card */}
          <div className="bg-zinc-50 rounded-xl p-4">
            <p className="text-lg font-bold text-zinc-900">
              {job.customer?.name || 'Unknown Customer'}
            </p>
            <p className="text-sm text-zinc-500 mt-0.5">
              {vehicle}{color ? ` · ${color}` : ''}
            </p>

            {/* Timer */}
            {job.started_at && (
              <div className="mt-3 text-center">
                <p className="text-3xl font-bold font-mono text-zinc-900">{elapsed}</p>
                {startedTime && (
                  <p className="text-xs text-zinc-400 mt-0.5">Started at {startedTime}</p>
                )}
              </div>
            )}
          </div>

          {/* Before Photos */}
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Before Photos
            </h3>
            {photosLoading ? (
              <p className="text-sm text-zinc-400">Loading...</p>
            ) : beforePhotos.length === 0 ? (
              <p className="text-sm text-zinc-400">No before photos</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {beforePhotos.map(photo => (
                  <div key={photo.id} className="aspect-square rounded-xl overflow-hidden border border-zinc-200">
                    <img src={photo.url} className="w-full h-full object-cover" alt="" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* After Photos */}
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              After Photos
            </h3>
            <PhotoUploader
              photos={afterPhotos}
              onChange={setAfterPhotos}
              label="Upload after photos"
            />
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Notes
            </h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about the job..."
              rows={3}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-100">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 shadow-sm"
          >
            <CheckCircle size={16} />
            {saving ? 'Saving...' : 'Complete Job'}
          </button>
        </div>
      </div>
    </div>
  )
}
