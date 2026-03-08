import { ipcRenderer } from 'electron'

// Runs inside the BrowserView (portal web page).
// Patches portal logout and exposes a minimal bridge for the portal.

window.addEventListener('DOMContentLoaded', () => {
  // Intercept clicks on logout buttons/links
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const logoutEl = target.closest('[data-action="logout"], [href*="logout"]')
    if (logoutEl) {
      e.preventDefault()
      ipcRenderer.send('portal-logout')
    }
  })
})

// Minimal bridge exposed to the portal web page
;(window as any).desktopBridge = {
  isDesktopApp: true,
  platform: process.platform,
  onNotification: (cb: (data: unknown) => void): void => {
    ipcRenderer.on('portal-notification', (_event, data) => cb(data))
  },
  notifyUnreadCount: (count: number): void => {
    ipcRenderer.send('update-badge', count)
  }
}
