// Minimal WebSocket-server (RFC 6455) utan beroenden.
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class WsConn extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.frags = null;
    this.fragOp = 0;
    this.open = true;
    socket.setNoDelay(true);
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
  }

  _closed() {
    if (!this.open) return;
    this.open = false;
    this.emit('close');
  }

  _onData(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0;
      const op = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (b.length < 4) return;
        len = b.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (b.length < 10) return;
        len = Number(b.readBigUInt64BE(2));
        off = 10;
      }
      const maskLen = masked ? 4 : 0;
      if (b.length < off + maskLen + len) return;
      let payload = Buffer.from(b.subarray(off + maskLen, off + maskLen + len));
      if (masked) {
        const m = b.subarray(off, off + 4);
        for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3];
      }
      this.buf = b.subarray(off + maskLen + len);
      if (op === 0x8) {
        this._send(0x8, Buffer.alloc(0));
        this.socket.end();
        this._closed();
        return;
      }
      if (op === 0x9) {
        this._send(0xa, payload);
        continue;
      }
      if (op === 0xa) continue;
      if (op === 0x1 || op === 0x2) {
        if (fin) this._deliver(op, payload);
        else {
          this.frags = [payload];
          this.fragOp = op;
        }
      } else if (op === 0x0 && this.frags) {
        this.frags.push(payload);
        if (fin) {
          payload = Buffer.concat(this.frags);
          this.frags = null;
          this._deliver(this.fragOp, payload);
        }
      }
    }
  }

  _deliver(op, payload) {
    this.emit('message', op === 0x1 ? payload.toString('utf8') : payload, op === 0x2);
  }

  _send(op, payload) {
    if (!this.open || this.socket.destroyed) return false;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x80 | op, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | op;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | op;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    return this.socket.write(Buffer.concat([header, payload]));
  }

  send(data) {
    if (typeof data === 'string') return this._send(0x1, Buffer.from(data, 'utf8'));
    return this._send(0x2, Buffer.from(data));
  }

  json(obj) {
    return this.send(JSON.stringify(obj));
  }

  close() {
    this._send(0x8, Buffer.alloc(0));
    this.socket.end();
    this._closed();
  }
}

/** Uppgradera en HTTP-förfrågan till WebSocket. */
export function acceptWebSocket(req, socket, head) {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return null;
  }
  const accept = createHash('sha1').update(key + GUID).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const ws = new WsConn(socket);
  if (head?.length) ws._onData(head);
  return ws;
}
