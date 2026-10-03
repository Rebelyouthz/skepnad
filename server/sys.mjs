// Systemhjälpare: mappar, webbläsare, Utforskaren och urklipp.
import os from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';

export const isWin = process.platform === 'win32';

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout: 20000, ...opts }, (err, stdout, stderr) => (err ? reject(Object.assign(err, { stderr })) : resolve(String(stdout).trim())));
  });
}

export const ps = (command) => run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command]);

let videos = null;
export async function videosDir() {
  if (process.env.SKEPNAD_VIDEOS) return process.env.SKEPNAD_VIDEOS;
  if (videos) return videos;
  let base = join(os.homedir(), 'Videos');
  if (isWin) {
    try {
      const p = await ps("[Environment]::GetFolderPath('MyVideos')");
      if (p) base = p;
    } catch {
      /* standardmapp */
    }
  }
  videos = join(base, 'Skepnad');
  return videos;
}

export function toolsDir() {
  const base = process.env.LOCALAPPDATA || join(os.homedir(), '.local', 'share');
  return join(base, 'Skepnad', 'tools');
}

export function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (/^(169\.254|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address) && /vEthernet|WSL|Hyper-V|VirtualBox|VMware/i.test(name)) continue;
      out.push({ name, address: a.address });
    }
  }
  // Wi-Fi/Ethernet först
  return out.sort((a, b) => Number(/wi-?fi|wlan|trådlös/i.test(b.name)) - Number(/wi-?fi|wlan|trådlös/i.test(a.name)));
}

export function browserPaths() {
  const la = process.env.LOCALAPPDATA || '';
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  return {
    chrome: [`${pf}\\Google\\Chrome\\Application\\chrome.exe`, `${pf86}\\Google\\Chrome\\Application\\chrome.exe`, `${la}\\Google\\Chrome\\Application\\chrome.exe`].find((p) => existsSync(p)),
    edge: [`${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`, `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`].find((p) => existsSync(p)),
  };
}

/** Öppna en adress i webbläsaren. app=true ger ett eget appfönster. */
export function openInBrowser(url, { app = false, prefer = 'chrome' } = {}) {
  if (!isWin) {
    spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    return true;
  }
  const b = browserPaths();
  const exe = prefer === 'edge' ? b.edge || b.chrome : b.chrome || b.edge;
  if (exe) {
    const args = app ? [`--app=${url}`, '--window-size=1600,1000'] : [url];
    spawn(exe, args, { detached: true, stdio: 'ignore' }).unref();
    return true;
  }
  spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return true;
}

export function reveal(path) {
  if (isWin) spawn('explorer.exe', [`/select,${path}`], { detached: true, stdio: 'ignore' }).unref();
  else spawn('xdg-open', [join(path, '..')], { detached: true, stdio: 'ignore' }).unref();
}

export function openFolder(path) {
  if (isWin) spawn('explorer.exe', [path], { detached: true, stdio: 'ignore' }).unref();
  else spawn('xdg-open', [path], { detached: true, stdio: 'ignore' }).unref();
}

export async function copyFileToClipboard(path) {
  if (!isWin) throw new Error('Stöds bara i Windows');
  const safe = path.replace(/'/g, "''");
  await ps(`Set-Clipboard -LiteralPath '${safe}'`);
}

export async function copyTextToClipboard(text) {
  if (!isWin) throw new Error('Stöds bara i Windows');
  await ps(`Set-Clipboard -Value '${String(text).replace(/'/g, "''")}'`);
}
