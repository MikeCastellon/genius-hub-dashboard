import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

function isConfigured(url: string): boolean {
  try {
    new URL(url)
    return url.startsWith('http') && !url.includes('your-supabase')
  } catch {
    return false
  }
}

// Deep recursive proxy so supabase.auth.getSession().then(...)
// and supabase.auth.onAuthStateChange(...) don't throw
function createNoopProxy(): any {
  const mockFn: any = function () {
    return Promise.resolve({
      data: { session: null, user: null, subscription: { unsubscribe: () => {} } },
      error: null,
    })
  }
  return new Proxy(mockFn, {
    get(_t, prop) {
      // Don't intercept Promise protocol — let callers know this isn't a promise
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined
      return createNoopProxy()
    },
    apply() {
      return Promise.resolve({
        data: { session: null, user: null, subscription: { unsubscribe: () => {} } },
        error: null,
      })
    },
  })
}

export const supabase: SupabaseClient = isConfigured(supabaseUrl)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createNoopProxy() as unknown as SupabaseClient)
