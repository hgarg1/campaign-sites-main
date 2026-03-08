import { app, shell, BrowserWindow, BrowserView, ipcMain, Tray, Menu, nativeImage, session, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { autoUpdater } from 'electron-updater'

const PRODUCTION_URL = 'https://web-tau-eight-27.vercel.app'
const PORTAL_PATH = '/admin/portal'
const LOGIN_PATH = '/login'
const APP_NAME = 'CampaignSites System Admin'

interface AppStore {
  token: string | null
  windowBounds: Electron.Rectangle | null
  windowMaximized: boolean
}

const store = new Store<AppStore>({
  defaults: { token: null, windowBounds: null, windowMaximized: false },
  encryptionKey: 'cs-system-admin-2024'
})

let mainWindow: BrowserWindow | null = null
let portalView: BrowserView | null = null
let tray: Tray | null = null
let isAuthenticated = false
let unreadCount = 0

function createTray(): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: APP_NAME, enabled: false },
    { type: 'separator' },
    { label: 'Open', click: () => mainWindow?.show() },
    {
      label: 'Check Notifications',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('focus-notifications')
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setToolTip(APP_NAME)
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow?.show())
}

function createMainWindow(): void {
  const savedBounds = store.get('windowBounds')
  const wasMaximized = store.get('windowMaximized')

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1280,
    height: savedBounds?.height ?? 800,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (wasMaximized) mainWindow.maximize()

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', () => {
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds())
      store.set('windowMaximized', mainWindow.isMaximized())
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function attachPortalView(): void {
  if (!mainWindow) return

  portalView = new BrowserView({
    webPreferences: {
      preload: join(__dirname, '../preload/portal.js'),
      contextIsolation: true,
      nodeIntegration: false,
      session: session.fromPartition('persist:system-admin-portal')
    }
  })

  mainWindow.setBrowserView(portalView)

  // Position below custom titlebar (48px)
  const bounds = mainWindow.getBounds()
  portalView.setBounds({ x: 0, y: 48, width: bounds.width, height: bounds.height - 48 })
  portalView.setAutoResize({ width: true, height: true })

  // Inject auth token as cookie
  const token = store.get('token')
  if (token) {
    session.fromPartition('persist:system-admin-portal').cookies.set({
      url: PRODUCTION_URL,
      name: 'auth-token',
      value: token,
      httpOnly: true
    })
  }

  // Intercept navigation to login — session expired
  portalView.webContents.on('will-navigate', (_event, url) => {
    const parsedUrl = new URL(url)
    if (parsedUrl.pathname === LOGIN_PATH || parsedUrl.pathname === '/tenant-chooser') {
      store.set('token', null)
      isAuthenticated = false
      mainWindow?.webContents.send('auth-state-changed', { authenticated: false })
      mainWindow?.setBrowserView(null)
      portalView = null
    }
  })

  // Intercept API 401s
  portalView.webContents.session.webRequest.onCompleted(
    { urls: [`${PRODUCTION_URL}/api/*`] },
    (details) => {
      if (details.statusCode === 401) {
        store.set('token', null)
        isAuthenticated = false
        mainWindow?.webContents.send('auth-state-changed', { authenticated: false })
        mainWindow?.setBrowserView(null)
        portalView = null
      }
    }
  )

  portalView.webContents.loadURL(`${PRODUCTION_URL}${PORTAL_PATH}`)
}

function createBadgeDataURL(count: number): string {
  const size = 20
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ef4444"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="12" fill="white">${count > 99 ? '99+' : count}</text>
  </svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// IPC handlers
ipcMain.handle('get-auth-state', () => ({ authenticated: isAuthenticated }))

ipcMain.handle('login-success', (_event, token: string) => {
  store.set('token', token)
  isAuthenticated = true
  attachPortalView()
  return { success: true }
})

ipcMain.handle('logout', () => {
  store.set('token', null)
  isAuthenticated = false
  if (mainWindow && portalView) {
    mainWindow.setBrowserView(null)
    portalView = null
  }
  return { success: true }
})

ipcMain.handle('get-platform', () => process.platform)
ipcMain.handle('get-version', () => app.getVersion())

ipcMain.handle('show-notification', (_event, { title, body }: { title: string; body: string }) => {
  new Notification({ title, body, icon: join(__dirname, '../../resources/icon.png') }).show()
})

ipcMain.handle('update-badge', (_event, count: number) => {
  unreadCount = count
  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '')
  }
  if (process.platform === 'win32' && mainWindow) {
    if (count > 0) {
      const badgeIcon = nativeImage.createFromDataURL(createBadgeDataURL(count))
      mainWindow.setOverlayIcon(badgeIcon, `${count} unread notifications`)
    } else {
      mainWindow.setOverlayIcon(null, '')
    }
  }
})

ipcMain.on('portal-logout', () => {
  store.set('token', null)
  isAuthenticated = false
  if (mainWindow && portalView) {
    mainWindow.setBrowserView(null)
    portalView = null
  }
  mainWindow?.webContents.send('auth-state-changed', { authenticated: false })
})

ipcMain.on('update-badge', (_event, count: number) => {
  unreadCount = count
  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '')
  }
})

// Suppress unused variable warning
void unreadCount

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.campaignsites.system-admin')

  app.setAsDefaultProtocolClient('campaignsites-admin')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createTray()
  createMainWindow()

  // Auto-login if a saved token exists
  const savedToken = store.get('token')
  if (savedToken) {
    isAuthenticated = true
    mainWindow?.once('ready-to-show', () => {
      attachPortalView()
      mainWindow?.webContents.send('auth-state-changed', { authenticated: true })
    })
  }

  autoUpdater.checkForUpdatesAndNotify()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Suppress unused import warning for shell
void shell
