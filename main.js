const { app, BrowserWindow, Menu, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const ROOT = __dirname;
const ELECTRON_ICON_DIR = path.join(ROOT, 'electron');
const WWW_IMAGES = path.join(ROOT, 'Vireon.PresentationLayer', 'wwwroot', 'images');

const ICON_CANDIDATES = [
  path.join(ELECTRON_ICON_DIR, 'icon.ico'),
  path.join(ELECTRON_ICON_DIR, 'icon.png'),
  path.join(WWW_IMAGES, 'vireon-logo-transparent-new.ico'),
  path.join(WWW_IMAGES, 'vireon-logo-transparent-new.png'),
];

function resolveAppIcon() {
  for (const iconPath of ICON_CANDIDATES) {
    if (!fs.existsSync(iconPath)) continue;
    let image = nativeImage.createFromPath(iconPath);
    if (!image || image.isEmpty()) continue;

    if (process.platform === 'win32') {
      const { width, height } = image.getSize();
      if (width !== height || width < 48) {
        const side = Math.max(width, height, 256);
        image = image.resize({ width: side, height: side, quality: 'best' });
      } else if (width > 256) {
        image = image.resize({ width: 256, height: 256, quality: 'best' });
      }
    }
    return image;
  }
  return undefined;
}

function createWindow() {
  const appIcon = resolveAppIcon();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Vireon - Immutable Ledger Digital Bank',
    icon: appIcon,
    backgroundColor: '#0a0f1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
    show: false,
    autoHideMenuBar: true,
  });

  mainWindow.loadURL('http://localhost:5202');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const template = [
    {
      label: 'Vireon Bank',
      submenu: [
        { label: 'Yenile', role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { label: 'Zorla Yenile', role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { type: 'separator' },
        { label: 'Çıkış Yap', role: 'quit', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Tam Ekran', role: 'togglefullscreen', accelerator: 'F11' },
        { label: 'Yakınlaştır', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
        { label: 'Uzaklaştır', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { label: 'Sıfırla', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { type: 'separator' },
        { label: 'Geliştirici Araçları (DevTools)', role: 'toggleDevTools', accelerator: 'F12' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.vireon.digitalbank');
  }

  const appIcon = resolveAppIcon();
  if (appIcon && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIcon);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }
});
