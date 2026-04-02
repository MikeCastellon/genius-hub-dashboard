import { useState } from 'react'
import { useAuth } from '@/lib/store'
import { Loader2, UserPlus, LogIn, Mail } from 'lucide-react'

type Mode = 'signin' | 'signup' | 'forgot'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const switchMode = (m: Mode) => { setMode(m); setError(''); setSuccessMsg('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!displayName.trim()) { setError('Display name is required'); setLoading(false); return }
        await signUp(email, password, displayName.trim())
        setSuccessMsg('Account created! Await admin approval before signing in.')
        setMode('signin')
      } else if (mode === 'forgot') {
        await resetPassword(email)
        setSuccessMsg('Password reset email sent! Check your inbox.')
      } else {
        await signIn(email, password)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

  const titles: Record<Mode, string> = {
    signin: 'Sign In',
    signup: 'Create Account',
    forgot: 'Reset Password',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dots" style={{ background: '#fafafa' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mx-auto mb-4">
            <img src="https://www.autocaregenius.com/cdn/shop/files/v11_1.svg?v=1760731533&width=160" alt="Auto Care Genius" className="h-12 w-auto" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Pro Hub</h1>
          <p className="text-zinc-400 mt-1 text-[11px] font-medium tracking-widest uppercase">Sales & Service by Auto Care Genius</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-8 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700 text-center mb-2">{titles[mode]}</h2>

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Name</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                className={inputClass} placeholder="Your name" required />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className={inputClass} placeholder="you@example.com" required autoFocus />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter password'}
                required minLength={6} />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">{error}</p>
          )}
          {successMsg && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">{successMsg}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white py-3 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-red-700/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <><Loader2 size={15} className="animate-spin" />{mode === 'signup' ? 'Creating...' : mode === 'forgot' ? 'Sending...' : 'Signing in...'}</>
            ) : (
              <>
                {mode === 'signup' ? <UserPlus size={15} /> : mode === 'forgot' ? <Mail size={15} /> : <LogIn size={15} />}
                {titles[mode]}
              </>
            )}
          </button>

          <div className="text-center text-xs text-zinc-400 pt-1 space-y-1.5">
            {mode === 'signin' && (
              <>
                <p>
                  <button type="button" onClick={() => switchMode('forgot')}
                    className="text-zinc-400 hover:text-red-600 transition-colors">Forgot password?</button>
                </p>
                <p>Don't have an account?{' '}
                  <button type="button" onClick={() => switchMode('signup')}
                    className="text-red-600 font-semibold hover:text-red-700">Sign Up</button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p>Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')}
                  className="text-red-600 font-semibold hover:text-red-700">Sign In</button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                <button type="button" onClick={() => switchMode('signin')}
                  className="text-red-600 font-semibold hover:text-red-700">Back to Sign In</button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
