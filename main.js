const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

// İkonun Windows görev çubuğunda kesin görünmesi için App ID ayarlıyoruz
if (process.platform === 'win32') {
  app.setAppUserModelId("Vireon Bank");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: "Vireon - Immutable Ledger Digital Bank",
    icon: path.join(__dirname, 'Vireon.PresentationLayer', 'wwwroot', 'images', 'vireon-logo-transparent-new.ico'),
    backgroundColor: '#0a0f1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    show: false,
    autoHideMenuBar: true
  });

  // Load the C# server URL
  mainWindow.loadURL('http://localhost:5202');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Özel Bankacılık Menüsü Oluşturma (Electron Polish)
  const template = [
    {
      label: 'Vireon Bank',
      submenu: [
        { label: 'Yenile', role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { label: 'Zorla Yenile', role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { type: 'separator' },
        { label: 'Çıkış Yap', role: 'quit', accelerator: 'CmdOrCtrl+Q' }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Tam Ekran', role: 'togglefullscreen', accelerator: 'F11' },
        { label: 'Yakınlaştır', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
        { label: 'Uzaklaştır', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { label: 'Sıfırla', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { type: 'separator' },
        { label: 'Geliştirici Araçları (DevTools)', role: 'toggleDevTools', accelerator: 'F12' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Optional: Open DevTools in development
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Quit when all windows are closed
app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }
});

