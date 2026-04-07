import { useRecallLookups, useRepairGuides } from '@/lib/store'
import type { Vehicle, RepairGuide } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { AlertTriangle, BookOpen, Shield, Clock } from 'lucide-react'

interface Props {
  vehicle: Vehicle
}

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-4 space-y-2 animate-pulse">
      <div className="h-4 bg-zinc-200 rounded w-3/4" />
      <div className="h-3 bg-zinc-200 rounded w-1/2" />
      <div className="h-3 bg-zinc-200 rounded w-1/3" />
    </div>
  )
}

function SkeletonStatRow() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <div key={i} className="glass rounded-xl p-4 animate-pulse">
          <div className="h-8 bg-zinc-200 rounded w-12 mb-2" />
          <div className="h-3 bg-zinc-200 rounded w-24" />
        </div>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  accent: 'red' | 'green' | 'blue'
}) {
  const bgMap = {
    red: 'bg-red-50 border-red-200',
    green: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
  }
  const textMap = {
    red: 'text-red-600',
    green: 'text-emerald-600',
    blue: 'text-blue-600',
  }

  return (
    <div className={`glass rounded-xl p-4 border ${bgMap[accent]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={textMap[accent]} />
        <span className={`text-2xl font-bold ${textMap[accent]}`}>{value}</span>
      </div>
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
    </div>
  )
}

export default function RepairsOverview({ vehicle }: Props) {
  const { recalls, loading: recallsLoading } = useRecallLookups(vehicle.id)
  const { guides, loading: guidesLoading } = useRepairGuides(vehicle.id)

  const statsLoading = recallsLoading || guidesLoading

  const activeRecalls = recalls?.length ?? 0
  const guideCount = guides?.length ?? 0

  const recentGuides: RepairGuide[] = (guides ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-5">
      {/* Quick Stats */}
      {statsLoading ? (
        <SkeletonStatRow />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Active Recalls"
            value={activeRecalls}
            icon={AlertTriangle}
            accent={activeRecalls > 0 ? 'red' : 'green'}
          />
          <StatCard
            label="Repair Guides"
            value={guideCount}
            icon={BookOpen}
            accent="blue"
          />
        </div>
      )}

      {/* Warranty Summary */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-red-600" />
          <h4 className="text-sm font-semibold text-zinc-800">Warranty Status</h4>
        </div>
        <p className="text-sm text-zinc-500">
          Warranty data is loaded from VehicleDatabases when available.
        </p>
      </div>

      {/* Recent Repair Guides */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-red-600" />
          <h4 className="text-sm font-semibold text-zinc-800">Recent Repair Guides</h4>
        </div>

        {guidesLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : recentGuides.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No repair guides generated yet.</p>
        ) : (
          <div className="space-y-3">
            {recentGuides.map((guide) => (
              <div key={guide.id} className="flex items-start gap-3 rounded-lg bg-zinc-50/60 p-3">
                <Clock size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-700 truncate">
                    {guide.user_prompt || `${guide.content.steps.length}-step guide`}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatDate(guide.created_at)} &middot; {guide.content.steps.length} steps
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
