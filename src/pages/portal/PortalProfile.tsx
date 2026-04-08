import { useState, useEffect, useRef } from 'react'
import { useAuth, useMyCustomerRecord, uploadAvatar } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { User, Phone, Mail, MessageSquare, Lock, Save, Loader2, Download, Camera } from 'lucide-react'

const contactMethods = [
  { value: 'phone' as const, label: 'Phone', icon: Phone },
  { value: 'email' as const, label: 'Email', icon: Mail },
  { value: 'sms' as const, label: 'SMS', icon: MessageSquare },
]

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10'

export default function PortalProfile() {
  const { user, profile } = useAuth()
  const { customer, loading: customerLoading } = useMyCustomerRecord()

  // Personal info state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [preferredContact, setPreferredContact] = useState<'phone' | 'email' | 'sms'>('phone')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Populate form from existing data
  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
      setEmail(customer.email || user?.email || '')
    } else if (profile) {
      setName(profile.display_name || '')
      setEmail(user?.email || '')
    }
    if (profile?.preferred_contact) {
      setPreferredContact(profile.preferred_contact)
    }
    // Set avatar from customer or profile
    setAvatarUrl(customer?.avatar_url || profile?.avatar_url || null)
  }, [customer, profile, user])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      // Upload for customer record if exists, otherwise profile
      if (customer) {
        const url = await uploadAvatar(file, 'customer', customer.id)
        setAvatarUrl(url)
      } else if (profile) {
        const url = await uploadAvatar(file, 'profile', profile.id)
        setAvatarUrl(url)
      }
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      // Update profile preferred_contact
      if (profile) {
        await supabase
          .from('profiles')
          .update({ preferred_contact: preferredContact })
          .eq('id', profile.id)
      }

      // Update customer record
      if (customer) {
        await supabase
          .from('customers')
          .update({ name, phone })
          .eq('id', customer.id)
      }

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

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — Personal Info */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <User className="h-4.5 w-4.5 text-zinc-400" />
            Personal Information
          </h2>

          {/* Avatar */}
          <div className="mt-5 flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border border-zinc-200" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xl font-bold">
                  {(name || 'U')[0]?.toUpperCase()}
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

          <div className="mt-5 space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className={inputClass}
              />
            </div>

            {/* Email (read-only) */}
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

            {/* Preferred contact */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Preferred Contact Method
              </label>
              <div className="flex gap-2">
                {contactMethods.map((cm) => {
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

            {/* Save message */}
            {saveMsg && (
              <p
                className={`text-sm ${
                  saveMsg.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {saveMsg.text}
              </p>
            )}

            {/* Save button */}
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>

        {/* Right — Security & App */}
        <div className="space-y-6">
          {/* Change Password */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              <Lock className="h-4.5 w-4.5 text-zinc-400" />
              Change Password
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={inputClass}
                />
              </div>

              {/* Password message */}
              {pwMsg && (
                <p
                  className={`text-sm ${
                    pwMsg.type === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {pwMsg.text}
                </p>
              )}

              <button
                onClick={handleUpdatePassword}
                disabled={updatingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                {updatingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Update Password
              </button>
            </div>
          </div>

          {/* App Download */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              <Download className="h-4.5 w-4.5 text-zinc-400" />
              Get the Mobile App
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Download our app for the best experience on your phone.
            </p>

            <div className="mt-4 flex gap-3">
              <a
                href="#"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                App Store
              </a>
              <a
                href="#"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                Google Play
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
