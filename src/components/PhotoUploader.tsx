import { useEffect, useRef, useMemo } from 'react'
import { Camera, Plus, X } from 'lucide-react'

interface Props {
  photos: File[]
  onChange: (files: File[]) => void
  existingPhotos?: { url: string; id: string }[]
  onDeleteExisting?: (id: string) => void
  label?: string
  maxPhotos?: number
}

export default function PhotoUploader({
  photos,
  onChange,
  existingPhotos = [],
  onDeleteExisting,
  label,
  maxPhotos,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Create object URLs for new file previews
  const previews = useMemo(() => photos.map(f => URL.createObjectURL(f)), [photos])

  // Revoke object URLs on cleanup or when files change
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previews])

  const totalPhotos = existingPhotos.length + photos.length
  const limitReached = maxPhotos != null && totalPhotos >= maxPhotos

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return

    let filesToAdd = newFiles
    if (maxPhotos != null) {
      const remaining = maxPhotos - totalPhotos
      filesToAdd = newFiles.slice(0, remaining)
    }

    onChange([...photos, ...filesToAdd])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    onChange(photos.filter((_, i) => i !== index))
  }

  const triggerInput = () => {
    fileInputRef.current?.click()
  }

  const hasPhotos = totalPhotos > 0

  return (
    <div>
      {label && (
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {!hasPhotos ? (
        /* Empty state */
        <button
          type="button"
          onClick={triggerInput}
          className="w-full flex flex-col items-center justify-center py-8 border-dashed border-2 border-zinc-200 rounded-xl hover:bg-red-50/30 transition-colors cursor-pointer"
        >
          <Camera size={28} className="text-zinc-300 mb-1.5" />
          <span className="text-[13px] text-zinc-400">Tap to upload</span>
        </button>
      ) : (
        /* Photo grid */
        <div className="grid grid-cols-4 gap-2">
          {/* Existing photos */}
          {existingPhotos.map(photo => (
            <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200">
              <img src={photo.url} className="w-full h-full object-cover" alt="" />
              {onDeleteExisting && (
                <button
                  type="button"
                  onClick={() => onDeleteExisting(photo.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm hover:bg-amber-600 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {/* New file photos */}
          {photos.map((_, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200">
              <img src={previews[index]} className="w-full h-full object-cover" alt="" />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm hover:bg-red-700 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Add more button */}
          {!limitReached && (
            <button
              type="button"
              onClick={triggerInput}
              className="aspect-square rounded-xl border-dashed border-2 border-zinc-200 flex flex-col items-center justify-center hover:bg-red-50/30 transition-colors cursor-pointer"
            >
              <Plus size={22} className="text-zinc-300" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
