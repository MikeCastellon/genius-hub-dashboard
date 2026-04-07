import { useRef } from 'react'
import { Camera, X, Image as ImageIcon } from 'lucide-react'
import type { CertificatePhoto } from '@/lib/types'

export interface PhotoEntry {
  file: File
  type: CertificatePhoto['photo_type']
  preview: string
}

interface Props {
  photos: PhotoEntry[]
  setPhotos: (p: PhotoEntry[]) => void
}

const PHOTO_TYPES: { type: CertificatePhoto['photo_type']; label: string }[] = [
  { type: 'before', label: 'Before' },
  { type: 'after', label: 'After' },
  { type: 'product', label: 'Product' },
  { type: 'other', label: 'Other' },
]

export default function StepPhotos({ photos, setPhotos }: Props) {
  const addPhotos = (files: FileList, type: CertificatePhoto['photo_type']) => {
    const newPhotos = Array.from(files).map(file => ({
      file,
      type,
      preview: URL.createObjectURL(file),
    }))
    setPhotos([...photos, ...newPhotos])
  }

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photos[idx].preview)
    setPhotos(photos.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
        <Camera size={16} className="text-red-600" /> Photos
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {PHOTO_TYPES.map(({ type, label }) => (
          <PhotoZone
            key={type}
            label={label}
            photos={photos.filter(p => p.type === type)}
            onAdd={(files: FileList) => addPhotos(files, type)}
            onRemove={(idx: number) => {
              const typePhotos = photos.filter(p => p.type === type)
              const globalIdx = photos.indexOf(typePhotos[idx])
              removePhoto(globalIdx)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function PhotoZone({
  label, photos, onAdd, onRemove
}: {
  label: string
  photos: PhotoEntry[]
  onAdd: (files: FileList) => void
  onRemove: (idx: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-600">{label}</p>

      {photos.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:border-red-300 hover:text-red-500 transition-all"
        >
          <ImageIcon size={20} />
          <span className="text-[11px]">Tap to upload</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {photos.map((p, i) => (
              <div key={i} className="relative group">
                <img
                  src={p.preview}
                  alt={`${label} ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <button
                  onClick={() => onRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            + Add more
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={e => e.target.files && onAdd(e.target.files)}
        className="hidden"
      />
    </div>
  )
}
