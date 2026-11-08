// PC アプリの起動部分。画面は Web 版と同じファイルを app:// で読み込む（ES Modules を使うため file:// ではなく独自の配信にする）。
const { app, BrowserWindow, protocol, net, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

// 二重に起動したら、先に開いている窓を前に出す
if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 520, height: 900, minWidth: 360, minHeight: 560,
    title: 'メトロノーム', backgroundColor: '#1f2124', autoHideMenuBar: true,
    icon: path.join(ROOT, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadURL('app://local/index.html');
  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  let win = createWindow();
  app.on('second-instance', () => { if (win.isMinimized()) win.restore(); win.focus(); });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) win = createWindow(); });
});
app.on('window-all-closed', () => app.quit());
