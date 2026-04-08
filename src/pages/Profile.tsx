import { useState, useEffect, useRef } from 'react'
import { useAuth, uploadAvatar } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { User, Phone, Mail, MessageSquare, Lock, Save, Loader2, Camera, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const contactMethods = [
  { value: 'phone' as const, label: 'Phone', icon: Phone },
  { value: 'email' as const, label: 'Email', icon: Mail },
  { value: 'sms' as const, label: 'SMS', icon: MessageSquare },
]

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10'

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [preferredContact, setPreferredContact] = useState<'phone' | 'email' | 'sms'>('phone')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || '')
      setEmail(user?.email || '')
      setPreferredContact(profile.preferred_contact || 'phone')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile, user])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(file, 'profile', profile.id)
      setAvatarUrl(url)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await supabase
        .from('profiles')
        .update({
          display_name: name.trim(),
          preferred_contact: preferredContact,
        })
        .eq('id', profile.id)
      setSaveMsg({ type: 'success', text: 'Profile updated successfully' })
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    setPwMsg(null)
    if (!newPassword) {
      setPwMsg({ type: 'error', text: 'Please enter a new password' })
      return
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Passwords do not match' })
      return
    }
    setUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPwMsg({ type: 'success', text: 'Password updated successfully' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message || 'Failed to update password' })
    } finally {
      setUpdatingPassword(false)
    }
  }

  const initials = (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-zinc-100 transition-colors">
          <ArrowLeft size={20} className="text-zinc-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">My Profile</h1>
          <p className="text-[12px] text-zinc-400">Manage your account settings</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Personal Info Card */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 mb-5">
            <User className="h-4.5 w-4.5 text-zinc-400" />
            Personal Information
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border border-zinc-200" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-xl font-bold">
                  {initials}
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center hover:bg-zinc-50 transition-colors"
              >
                {uploadingAvatar ? <Loader2 size={12} className="animate-spin text-red-600" /> : <Camera size={12} className="text-zinc-500" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{name || 'Your Name'}</p>
              <p className="text-xs text-zinc-400">Tap the camera icon to update your photo</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className={`${inputClass} cursor-not-allowed bg-zinc-50 text-zinc-400`}
              />
              <p className="mt-1 text-xs text-zinc-400">Email is linked to your login and cannot be changed here</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Preferred Contact Method</label>
              <div className="flex gap-2">
                {contactMethods.map(cm => {
                  const active = preferredContact === cm.value
                  return (
                    <button
                      key={cm.value}
                      onClick={() => setPreferredContact(cm.value)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
                      }`}
                    >
                      <cm.icon className="h-4 w-4" />
                      {cm.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {saveMsg && (
              <p className={`text-sm ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {saveMsg.text}
              </p>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 mb-5">
            <Lock className="h-4.5 w-4.5 text-zinc-400" />
            Change Password
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={inputClass}
              />
            </div>

            {pwMsg && (
              <p className={`text-sm ${pwMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {pwMsg.text}
              </p>
            )}

            <button
              onClick={handleUpdatePassword}
              disabled={updatingPassword}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
