import { useRecallLookups } from '@/lib/store'
import { RecallLookup } from '@/lib/types'
import { AlertTriangle, RefreshCw, Loader2, Shield } from 'lucide-react'

interface Props {
  vehicleId: string
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="glass rounded-xl p-4 space-y-2 animate-pulse">
          <div className="h-4 bg-zinc-200 rounded w-3/4" />
          <div className="h-3 bg-zinc-200 rounded w-1/2" />
          <div className="h-3 bg-zinc-200 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}

function RecallItem({ item }: { item: RecallLookup }) {
  return (
    <div className="glass rounded-xl p-4 border-l-4 border-red-500">
      <p className="text-sm font-medium text-zinc-800">{item.description}</p>
      {item.consequence && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 mt-2">
          <span className="font-semibold">Risk:</span> {item.consequence}
        </p>
      )}
      {item.corrective_action && (
        <p className="text-xs text-zinc-500 mt-2">
          <span className="font-semibold text-zinc-600">Corrective Action:</span>{' '}
          {item.corrective_action}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        {item.nhtsa_id && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            NHTSA {item.nhtsa_id}
          </span>
        )}
        <span className="text-xs text-zinc-400">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

export default function RecallsPanel({ vehicleId }: Props) {
  const { recalls, loading, refresh } = useRecallLookups(vehicleId)

  const activeRecalls = recalls.filter((r) => r.type === 'recall')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-zinc-800">Recalls</h3>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h4 className="text-sm font-semibold text-zinc-700">Active Recalls</h4>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {activeRecalls.length}
            </span>
          </div>
          {activeRecalls.length > 0 ? (
            <div className="space-y-2">
              {activeRecalls.map((item) => (
                <RecallItem key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-xl p-6 text-center">
              <p className="text-sm text-zinc-400">No active recalls found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
