const { app, BrowserWindow } = require("electron");
const path = require("path");

// IMPORTANTE: troque pela URL real do seu backend depois do deploy (Vercel).
// Pode ser sobrescrita sem recompilar via variável de ambiente VORTEX_URL.
const DEPLOYED_URL = process.env.VORTEX_URL || "https://vortex-demo-cyan.vercel.app";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, "icon.ico"),
    autoHideMenuBar: true,
    backgroundColor: "#0a0d12",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Câmera/microfone: concede automaticamente só para o nosso próprio app
  // (nunca para conteúdo de terceiros, já que só carregamos DEPLOYED_URL).
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ["media", "display-capture", "notifications"];
    callback(allowed.includes(permission));
  });

  // Compartilhamento de tela: delega para o seletor nativo do Windows
  // (Electron 32+). O usuário escolhe qual tela/janela compartilhar.
  win.webContents.session.setDisplayMediaRequestHandler(
    (_request, callback) => callback({ video: "default" }),
    { useSystemPicker: true },
  );

  win.loadURL(DEPLOYED_URL);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
