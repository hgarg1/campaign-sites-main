export default function PortalShell(): JSX.Element {
  // The portal is loaded via BrowserView in the main process.
  // This renderer provides only the custom titlebar shell.
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Custom titlebar */}
      <div
        className="flex items-center justify-between h-12 px-4 bg-gray-950 border-b border-gray-800 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-200">System Admin</span>
        </div>
      </div>
      {/* BrowserView fills the remaining space — positioned by main process */}
      <div className="flex-1" />
    </div>
  )
}
