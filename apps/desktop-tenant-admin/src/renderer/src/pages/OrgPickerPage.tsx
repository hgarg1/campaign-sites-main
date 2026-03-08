import { useState, useEffect } from 'react'

const PRODUCTION_URL = 'https://web-tau-eight-27.vercel.app'

interface Org {
  id: string
  name: string
  slug: string
  logoUrl?: string
}

interface OrgPickerPageProps {
  onOrgSelected: (orgId: string) => void
}

export default function OrgPickerPage({ onOrgSelected }: OrgPickerPageProps): JSX.Element {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${PRODUCTION_URL}/api/auth/me`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load organizations')
        return res.json()
      })
      .then((data) => {
        // Support both { organizations: [...] } and { orgs: [...] } shapes
        const list: Org[] = data.organizations ?? data.orgs ?? []
        setOrgs(list)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load organizations'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSelect(orgId: string): Promise<void> {
    setSelecting(orgId)
    try {
      await window.desktopBridge.selectOrg(orgId)
      onOrgSelected(orgId)
    } catch {
      setError('Failed to select organization')
      setSelecting(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* Custom titlebar drag region */}
      <div
        className="fixed top-0 left-0 right-0 h-12 bg-gray-950 border-b border-gray-800"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 h-full px-4">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-200">Tenant Admin</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center pt-12">
        <div className="w-full max-w-lg px-8 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
              <svg
                className="w-8 h-8 text-white"
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
            <h1 className="text-2xl font-bold text-white">Choose Organization</h1>
            <p className="text-gray-400 text-sm mt-1">Select the organization you want to manage</p>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm mb-4">
              {error}
            </div>
          )}

          {!loading && orgs.length === 0 && !error && (
            <p className="text-center text-gray-500 py-8">No organizations found for your account.</p>
          )}

          <div className="space-y-3">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org.id)}
                disabled={selecting !== null}
                className="w-full flex items-center gap-4 px-5 py-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-xl transition-all disabled:opacity-60 text-left group"
              >
                {/* Org avatar */}
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <span className="text-indigo-400 font-bold text-sm">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{org.name}</p>
                  <p className="text-gray-500 text-xs truncate">{org.slug}</p>
                </div>

                {selecting === org.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400 flex-shrink-0" />
                ) : (
                  <svg
                    className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => window.desktopBridge.logout()}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
