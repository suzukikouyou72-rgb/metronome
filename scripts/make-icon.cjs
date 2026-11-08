// icon.svg から build/icon.png（512px）を作る。electron で実行する: npx electron scripts/make-icon.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
app.whenReady().then(async () => {
  const svg = fs.readFileSync(path.join(ROOT, 'icon.svg'), 'utf8');
  const win = new BrowserWindow({ width: 512, height: 512, show: false, frame: false, transparent: true, useContentSize: true, webPreferences: { offscreen: true } });
  win.webContents.setZoomFactor(1);
  await win.loadURL('data:text/html,' + encodeURIComponent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:512px;height:512px}</style>${svg}`));
  await new Promise((r) => setTimeout(r, 300));
  const img = (await win.webContents.capturePage()).resize({ width: 512, height: 512 });
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'build', 'icon.png'), img.toPNG());
  console.log('build/icon.png', img.getSize());
  app.quit();
});
