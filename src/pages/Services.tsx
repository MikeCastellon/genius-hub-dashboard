import { useState } from 'react'
import { useAllServices, updateService, createService, deleteService, useAuth } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { Wrench, Loader2, Check, X, Plus, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react'

const SERVICE_CATEGORIES = ['coating', 'correction', 'detail', 'Full Detail', 'restoration', 'wash']

export default function Services() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const { services, loading, refresh } = useAllServices()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Add form
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('detail')
  const [newDuration, setNewDuration] = useState('')
  const [adding, setAdding] = useState(false)

  const displayed = services
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

  const startEdit = (service: any) => {
    setEditingId(service.id)
    setEditPrice(service.price.toString())
    setEditDuration(service.duration_minutes?.toString() || '')
    setEditCategory(service.category)
  }

  const saveEdit = async (id: string) => {
    try {
      await updateService(id, {
        price: parseFloat(editPrice) || 0,
        duration_minutes: editDuration ? parseInt(editDuration) : null,
        category: editCategory,
      })
      refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
    setEditingId(null)
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await updateService(id, { active: !active })
      refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const handleAdd = async () => {
    if (!newName.trim()) return alert('Service name is required')
    setAdding(true)
    try {
      await createService({
        name: newName.trim(),
        price: parseFloat(newPrice) || 0,
        category: newCategory,
        duration_minutes: newDuration ? parseInt(newDuration) : null,
        active: true,
        business_id: profile?.business_id || null,
      })
      setNewName(''); setNewPrice(''); setNewDuration(''); setNewCategory('detail')
      setShowAddForm(false)
      refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
    setAdding(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await deleteService(id)
      refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  const inputClass = 'w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10'

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Wrench size={18} className="text-red-600" />
            Services
          </h2>
          <p className="text-[13px] text-zinc-400 mt-0.5">{displayed.length} of {services.length} services</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-xs font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all">
            <Plus size={14} />
            <span className="hidden sm:inline">Add Service</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search services..."
          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10" />
      </div>

      {/* Add Form */}
      {isAdmin && showAddForm && (
        <div className="glass rounded-2xl p-4 mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
            <Plus size={14} className="text-red-600" />
            New Service
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Name *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className={inputClass} placeholder="Service name" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Price ($)</label>
              <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Duration (min)</label>
              <input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)} className={inputClass} placeholder="60" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Category</label>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className={inputClass}>
                {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleAdd} disabled={adding}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50">
              {adding ? 'Adding...' : 'Add Service'}
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-500 text-xs font-semibold hover:bg-zinc-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block glass rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Service</th>
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Category</th>
              <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Price</th>
              <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Duration</th>
              <th className="text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Active</th>
              {isAdmin && <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayed.map(service => (
              <tr key={service.id} className="border-b border-zinc-50 hover:bg-red-50/20 transition-colors">
                <td className="px-4 py-3 text-xs font-medium text-zinc-700">{service.name}</td>
                <td className="px-4 py-3">
                  {editingId === service.id && isAdmin ? (
                    <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-600/10">
                      {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 font-medium">{service.category}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && editingId === service.id ? (
                    <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                      className="w-20 px-2 py-1 text-xs rounded-lg border border-red-300 focus:outline-none text-right" step="0.01" />
                  ) : (
                    <span className="text-xs font-bold text-red-700">{formatCurrency(service.price)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && editingId === service.id ? (
                    <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)}
                      className="w-16 px-2 py-1 text-xs rounded-lg border border-red-300 focus:outline-none text-right" placeholder="—" />
                  ) : (
                    <span className="text-xs text-zinc-400">{service.duration_minutes ? `${service.duration_minutes}min` : '—'}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {isAdmin ? (
                    <button onClick={() => toggleActive(service.id, service.active)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mx-auto ${
                        service.active
                          ? 'bg-gradient-to-br from-emerald-400 to-green-500 border-emerald-400 shadow-sm shadow-emerald-500/25'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}>
                      {service.active && <Check size={10} className="text-white" />}
                    </button>
                  ) : (
                    <span className={`w-2 h-2 rounded-full inline-block ${service.active ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {editingId === service.id ? (
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => saveEdit(service.id)}
                          className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 text-white hover:shadow-md transition-all">
                          <Check size={12} />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-zinc-200 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => startEdit(service)}
                          className="text-[11px] font-medium text-red-600 hover:text-red-700 transition-colors">Edit</button>
                        <button onClick={() => handleDelete(service.id, service.name)}
                          className="p-1 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-sm text-zinc-400">
                  {services.length === 0 ? 'No services yet. Add your first service above.' : 'No matching services'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {displayed.map(service => {
          const isExpanded = expandedId === service.id
          const isEditing = editingId === service.id

          return (
            <div key={service.id} className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : service.id)}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-700 truncate">{service.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${service.active ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
                    <span className="text-[10px] text-zinc-400">{service.category}</span>
                    {service.duration_minutes && <span className="text-[10px] text-zinc-400">{service.duration_minutes}min</span>}
                  </div>
                </div>
                <span className="text-sm font-bold text-red-700 shrink-0">{formatCurrency(service.price)}</span>
                <div className="text-zinc-300">
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {isExpanded && isAdmin && (
                <div className="border-t border-zinc-100 p-3 bg-zinc-50/30">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase">Price</label>
                          <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-red-300 focus:outline-none" step="0.01" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase">Duration (min)</label>
                          <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-red-300 focus:outline-none" placeholder="—" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(service.id)}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-green-500 text-white text-xs font-semibold">Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 py-1.5 rounded-lg bg-zinc-100 text-zinc-500 text-xs font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(service)}
                        className="flex-1 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors">Edit</button>
                      <button onClick={() => toggleActive(service.id, service.active)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${service.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {service.active ? 'Active ✓' : 'Inactive'}
                      </button>
                      <button onClick={() => handleDelete(service.id, service.name)}
                        className="py-2 px-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {displayed.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-zinc-400">
            {services.length === 0 ? 'No services yet.' : 'No matching services'}
          </div>
        )}
      </div>
    </div>
  )
}
