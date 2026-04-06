import { useState, useRef } from 'react'
import { Vehicle, RepairGuide, RepairGuideStep } from '@/lib/types'
import { callRepairsAIGuide, useRepairGuides } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import {
  X,
  Image,
  Video,
  Loader2,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
} from 'lucide-react'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

interface Props {
  vehicle: Vehicle
  repairDescription?: string
  dtcCode?: string
  repairLookupId?: string
  onClose: () => void
}

interface UploadedFile {
  file: File
  previewUrl: string
  type: 'photo' | 'video'
}

const uploadFile = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from('repairs-media')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('repairs-media').getPublicUrl(data.path)
  return urlData.publicUrl
}

export default function RepairGuidePanel({ vehicle, repairDescription, dtcCode, repairLookupId, onClose }: Props) {
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [prompt, setPrompt] = useState(repairDescription || '')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [steps, setSteps] = useState<RepairGuideStep[] | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [viewingGuide, setViewingGuide] = useState<RepairGuide | null>(null)

  const { guides, loading: guidesLoading, refresh } = useRepairGuides(vehicle.id)

  // ── File handlers ─────────────────────────────────────────

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    const newFiles: UploadedFile[] = Array.from(selected).map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      type: 'photo' as const,
    }))
    setFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    for (const f of Array.from(selected)) {
      if (f.size > 20 * 1024 * 1024) {
        setError('Video must be under 20MB')
        return
      }
      setFiles(prev => [...prev, { file: f, previewUrl: URL.createObjectURL(f), type: 'video' }])
    }
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Generate ──────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!prompt.trim() && files.length === 0) {
      setError('Add a description or upload media first')
      return
    }

    setError(null)
    setGenerating(true)
    setSteps(null)
    setViewingGuide(null)

    try {
      // Upload files first
      const mediaUrls: string[] = []
      for (const f of files) {
        const ext = f.file.name.split('.').pop() || 'bin'
        const path = `${vehicle.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const url = await uploadFile(f.file, path)
        mediaUrls.push(url)
      }

      const result = await callRepairsAIGuide({
        vehicle_id: vehicle.id,
        repair_lookup_id: repairLookupId,
        dtc_code: dtcCode,
        description: prompt.trim(),
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      })

      setSteps(result.steps)
      refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to generate guide')
    } finally {
      setGenerating(false)
    }
  }

  // ── View a previously saved guide ─────────────────────────

  const viewGuide = (guide: RepairGuide) => {
    setViewingGuide(guide)
    setSteps(guide.content.steps)
  }

  // ── Render helpers ────────────────────────────────────────

  const displayedSteps = steps

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-red-500" />
            <h2 className="font-bold text-zinc-900">AI Repair Guide</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Vehicle context */}
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-xs font-bold">
              {vehicle.year ? String(vehicle.year).slice(-2) : '??'}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              {dtcCode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 mt-0.5">
                  DTC: {dtcCode}
                </span>
              )}
            </div>
          </div>

          {/* Upload section (hide when viewing results) */}
          {!displayedSteps && (
            <>
              {/* Photo upload */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Photos
                </label>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  className="hidden"
                  onChange={handlePhotos}
                />
                <button
                  onClick={() => photoRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-500 hover:border-red-300 hover:text-red-600 transition-all w-full justify-center"
                >
                  <Image size={16} />
                  Add Photos (JPG, PNG)
                </button>
              </div>

              {/* Video upload */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Video
                </label>
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/mp4"
                  className="hidden"
                  onChange={handleVideo}
                />
                <button
                  onClick={() => videoRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-500 hover:border-red-300 hover:text-red-600 transition-all w-full justify-center"
                >
                  <Video size={16} />
                  Add Video (MP4, max 20MB)
                </button>
              </div>

              {/* Upload previews */}
              {files.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                    Uploads ({files.length})
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative group">
                        {f.type === 'photo' ? (
                          <img
                            src={f.previewUrl}
                            alt={f.file.name}
                            className="w-full h-20 object-cover rounded-lg border border-zinc-200"
                          />
                        ) : (
                          <div className="w-full h-20 rounded-lg border border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center px-1">
                            <Video size={16} className="text-zinc-400 mb-1" />
                            <span className="text-[10px] text-zinc-500 truncate w-full text-center">
                              {f.file.name}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Describe what you're seeing
                </label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Squealing noise from front brakes when stopping..."
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Generating state */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={28} className="animate-spin text-red-500" />
              <p className="text-sm font-medium text-zinc-600">AI is analyzing...</p>
              <p className="text-xs text-zinc-400">This may take a moment</p>
            </div>
          )}

          {/* Guide steps */}
          {displayedSteps && !generating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-800">
                  {viewingGuide ? 'Saved Guide' : 'Generated Guide'}
                </h3>
                {displayedSteps && (
                  <button
                    onClick={() => {
                      setSteps(null)
                      setViewingGuide(null)
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Back to editor
                  </button>
                )}
              </div>

              {displayedSteps.map((step) => (
                <div key={step.number} className="glass rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-800">{step.title}</p>
                      <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{step.description}</p>

                      {/* Warnings */}
                      {step.warnings && step.warnings.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {step.warnings.map((w, wi) => (
                            <div
                              key={wi}
                              className="flex items-start gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200"
                            >
                              <AlertTriangle size={14} className="text-orange-600 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-orange-800">{w}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Media refs */}
                      {step.media_refs && step.media_refs.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {step.media_refs.map((ref, ri) => (
                            <span
                              key={ri}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600"
                            >
                              <FileText size={10} />
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Previously generated guides */}
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-800 transition-colors w-full"
            >
              <Clock size={14} />
              Previous Guides ({guidesLoading ? '...' : guides.length})
              {showHistory ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
            </button>

            {showHistory && (
              <div className="mt-2 space-y-2">
                {guidesLoading && (
                  <div className="flex items-center gap-2 py-4 justify-center text-zinc-400 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    Loading...
                  </div>
                )}
                {!guidesLoading && guides.length === 0 && (
                  <p className="text-xs text-zinc-400 py-3 text-center">No guides generated yet</p>
                )}
                {!guidesLoading && guides.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => viewGuide(g)}
                    className={`w-full text-left glass rounded-xl p-3 hover:ring-2 hover:ring-red-200 transition-all ${
                      viewingGuide?.id === g.id ? 'ring-2 ring-red-400' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {g.user_prompt || g.content.steps[0]?.title || 'Repair Guide'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-400">
                        {new Date(g.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {g.content.steps.length} step{g.content.steps.length !== 1 ? 's' : ''}
                      </span>
                      {g.media_urls.length > 0 && (
                        <span className="text-xs text-zinc-400">
                          {g.media_urls.length} media
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Close
          </button>
          {!displayedSteps && (
            <button
              onClick={handleGenerate}
              disabled={generating || (!prompt.trim() && files.length === 0)}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate AI Guide
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
