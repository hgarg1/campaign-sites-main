import { useEffect, useState } from 'react'

const PRODUCTION_URL = 'https://web-tau-eight-27.vercel.app'

interface LoginPageProps {
  onSuccess: () => void
}

export default function LoginPage({ onSuccess }: LoginPageProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline = (): void => setIsOnline(true)
    const onOffline = (): void => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function loginWithRetry(payload: { email: string; password: string }): Promise<Response> {
    let lastError: unknown

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await fetch(`${PRODUCTION_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      } catch (error) {
        lastError = error
        if (attempt === 2) break
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Network request failed')
  }

  async function handleLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await loginWithRetry({ email: email.trim(), password })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Login failed' }))
        throw new Error(data.error || 'Login failed')
      }

      await window.desktopBridge.loginSuccess()
      onSuccess()
    } catch (err) {
      if (!navigator.onLine) {
        setError('You appear to be offline. Reconnect and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      {/* Custom titlebar drag region */}
      <div
        className="fixed top-0 left-0 right-0 h-12 bg-gray-950"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <div className="w-full max-w-md px-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Tenant Admin</h1>
          <p className="text-gray-400 text-sm mt-1">CampaignSites Platform</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {!isOnline ? (
            <div className="px-4 py-3 bg-amber-900/30 border border-amber-700 rounded-lg text-amber-200 text-sm">
              Offline mode detected. Login requires an internet connection.
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="admin@yourorg.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-8">CampaignSites Tenant Admin</p>
      </div>
    </div>
  )
}
