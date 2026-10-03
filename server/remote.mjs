// Mobilkontroll: telefonen (på samma WiFi) styr Skepnad via en QR-länk.
// Appen kopplar upp sig som "värd" på huvudservern; telefonen ansluter till en
// separat LAN-server som bara serverar kontrollsidan och kräver en engångsnyckel.
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { acceptWebSocket } from './ws.mjs';
import { lanAddresses } from './sys.mjs';

export class RemoteHub {
  constructor({ serveStatic }) {
    this.hosts = new Set();
    this.remotes = new Set();
    this.state = null;
    this.token = randomBytes(12).toString('base64url');
    this.lan = null;
    this.port = 0;
    this.serveStatic = serveStatic;
  }

  addHost(ws) {
    this.hosts.add(ws);
    ws.on('close', () => this.hosts.delete(ws));
    ws.on('message', (data, bin) => {
      if (bin) return;
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      if (msg.type === 'state') {
        this.state = msg;
        for (const r of this.remotes) r.send(data);
      }
    });
    ws.json({ type: 'remotes', count: this.remotes.size });
  }

  _broadcastRemoteCount() {
    for (const h of this.hosts) h.json({ type: 'remotes', count: this.remotes.size });
  }

  addRemote(ws) {
    this.remotes.add(ws);
    this._broadcastRemoteCount();
    ws.on('close', () => {
      this.remotes.delete(ws);
      this._broadcastRemoteCount();
    });
    if (this.state) ws.json(this.state);
    ws.on('message', (data, bin) => {
      if (bin) return;
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      if (msg.type === 'cmd' && typeof msg.action === 'string' && msg.action.length < 40) {
        const out = JSON.stringify({ type: 'cmd', action: msg.action, arg: String(msg.arg ?? '').slice(0, 80) });
        for (const h of this.hosts) h.send(out);
      }
    });
  }

  info() {
    return {
      running: !!this.lan,
      port: this.port,
      token: this.token,
      urls: this.lan ? lanAddresses().map((a) => `http://${a.address}:${this.port}/remote.html#${this.token}`) : [],
      remotes: this.remotes.size,
    };
  }

  start(port = 5175) {
    if (this.lan) return Promise.resolve(this.info());
    return new Promise((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        const path = new URL(req.url, 'http://x').pathname;
        const allowed = path === '/' || path === '/remote.html' || path.startsWith('/assets/') || /^\/(icon-192\.png|icon\.svg|favicon\.svg|manifest\.webmanifest)$/.test(path);
        if (!allowed) {
          res.writeHead(404).end();
          return;
        }
        this.serveStatic(req, res, path === '/' ? '/remote.html' : path);
      });
      srv.on('upgrade', (req, socket, head) => {
        const u = new URL(req.url, 'http://x');
        if (u.pathname !== '/ws/remote' || u.searchParams.get('token') !== this.token) {
          socket.destroy();
          return;
        }
        const ws = acceptWebSocket(req, socket, head);
        if (ws) this.addRemote(ws);
      });
      srv.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && port < 5185) {
          this.start(port + 1).then(resolve, reject);
        } else reject(err);
      });
      srv.listen(port, process.env.SKEPNAD_REMOTE_HOST || '0.0.0.0', () => {
        this.lan = srv;
        this.port = port;
        resolve(this.info());
      });
    });
  }

  stop() {
    this.lan?.close();
    this.lan = null;
    for (const r of this.remotes) r.close();
  }
}
