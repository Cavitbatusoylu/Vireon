const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: "Vireon - Immutable Ledger Digital Bank",
    icon: path.join(__dirname, 'Vireon.PresentationLayer', 'wwwroot', 'favicon.ico'),
    backgroundColor: '#0a0f1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    show: false
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

  // Remove default menu
  Menu.setApplicationMenu(null);

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

