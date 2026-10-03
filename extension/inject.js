// Skepnad Kamera – körs i sidans egen JavaScript-värld (MAIN).
// Lägger till "Skepnad Kamera" och "Skepnad Mikrofon" och hämtar bilden/rösten
// från Skepnad-fönstret via en lokal WebRTC-förbindelse.
(() => {
  if (window.__skepnadInjected || !navigator.mediaDevices) return;
  window.__skepnadInjected = true;
  const md = navigator.mediaDevices;
  const origGUM = md.getUserMedia.bind(md);
  const origEnum = md.enumerateDevices.bind(md);
  const CAM = { deviceId: 'skepnad-kamera', kind: 'videoinput', label: 'Skepnad Kamera', groupId: 'skepnad' };
  const MIC = { deviceId: 'skepnad-mikrofon', kind: 'audioinput', label: 'Skepnad Mikrofon', groupId: 'skepnad' };
  const pending = new Map();
  let seq = 0;

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.__skepnad !== 'to-page') return;
    const cb = pending.get(e.data.id);
    if (cb) cb(e.data);
  });

  const ask = (msg, timeout = 4000) =>
    new Promise((resolve) => {
      const id = `s${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const t = setTimeout(() => {
        pending.delete(id);
        resolve({ error: 'timeout' });
      }, timeout);
      pending.set(id, (d) => {
        clearTimeout(t);
        pending.delete(id);
        resolve(d);
      });
      window.postMessage({ __skepnad: 'from-page', id, ...msg }, '*');
    });

  const idsOf = (c) => {
    if (!c || c === true || typeof c !== 'object') return [];
    const d = c.deviceId;
    if (!d) return [];
    if (typeof d === 'string') return [d];
    if (Array.isArray(d)) return d;
    return [].concat(d.exact ?? [], d.ideal ?? []);
  };
  const wants = (c, dev) => idsOf(c).includes(dev.deviceId);
  const strip = (c) => {
    if (!c || c === true || typeof c !== 'object') return c;
    if (!idsOf(c).some((id) => id.startsWith('skepnad-'))) return c;
    const { deviceId, ...rest } = c;
    return Object.keys(rest).length ? rest : true;
  };

  function fakeDevice(d) {
    const o = {
      deviceId: d.deviceId,
      kind: d.kind,
      label: d.label,
      groupId: d.groupId,
      toJSON() {
        return { deviceId: d.deviceId, kind: d.kind, label: d.label, groupId: d.groupId };
      },
      getCapabilities() {
        return d.kind === 'videoinput' ? { deviceId: d.deviceId, width: { min: 320, max: 1920 }, height: { min: 180, max: 1920 }, frameRate: { min: 1, max: 30 }, facingMode: ['user'] } : { deviceId: d.deviceId, channelCount: { min: 1, max: 2 } };
      },
    };
    try {
      Object.setPrototypeOf(o, (window.InputDeviceInfo || window.MediaDeviceInfo).prototype);
    } catch {
      /* ok */
    }
    return o;
  }

  md.enumerateDevices = async function enumerateDevices() {
    const list = await origEnum();
    return [...list, fakeDevice(CAM), fakeDevice(MIC)];
  };

  function dress(track, dev) {
    if (!track) return track;
    const base = track.getSettings.bind(track);
    try {
      Object.defineProperty(track, 'label', { value: dev.label, configurable: true });
    } catch {
      /* ok */
    }
    track.getSettings = () => ({ ...base(), deviceId: dev.deviceId, groupId: dev.groupId, ...(dev.kind === 'videoinput' ? { facingMode: 'user', frameRate: 30 } : { echoCancellation: false, noiseSuppression: false, autoGainControl: false }) });
    track.getCapabilities = () => fakeDevice(dev).getCapabilities();
    track.getConstraints = () => ({});
    track.applyConstraints = () => Promise.resolve();
    return track;
  }

  const iceDone = (pc) =>
    new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const t = setTimeout(resolve, 1500);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(t);
          resolve();
        }
      });
    });

  // Höj bithastigheten på den lokala förbindelsen så att bilden blir skarp direkt.
  function boost(sdp) {
    const P = 'x-google-min-bitrate=2500;x-google-start-bitrate=5000;x-google-max-bitrate=10000';
    const lines = sdp.split('\r\n');
    const vids = new Set();
    const hasFmtp = new Set();
    let sec = '';
    for (const l of lines) {
      if (l.startsWith('m=')) sec = l.startsWith('m=video') ? 'v' : 'o';
      if (sec !== 'v') continue;
      const r = /^a=rtpmap:(\d+) (VP8|VP9|H264|AV1)\//i.exec(l);
      if (r) vids.add(r[1]);
      const f = /^a=fmtp:(\d+) /.exec(l);
      if (f) hasFmtp.add(f[1]);
    }
    const out = [];
    sec = '';
    for (const l of lines) {
      if (l.startsWith('m=')) sec = l.startsWith('m=video') ? 'v' : 'o';
      const f = /^a=fmtp:(\d+) /.exec(l);
      if (sec === 'v' && f && vids.has(f[1]) && !l.includes('x-google')) {
        out.push(`${l};${P}`);
        continue;
      }
      out.push(l);
      const r = /^a=rtpmap:(\d+) /.exec(l);
      if (sec === 'v' && r && vids.has(r[1]) && !hasFmtp.has(r[1])) out.push(`a=fmtp:${r[1]} ${P}`);
    }
    return out.join('\r\n');
  }

  async function connectSkepnad({ video, audio }) {
    const pc = new RTCPeerConnection({ iceServers: [] });
    const need = (video ? 1 : 0) + (audio ? 1 : 0);
    const tracks = [];
    const got = new Promise((resolve) => {
      pc.ontrack = (e) => {
        tracks.push(e.track);
        if (tracks.length >= need) resolve(true);
      };
      setTimeout(() => resolve(false), 6000);
    });
    const offer = await ask({ type: 'offer-request', video, audio, page: location.host }, 6000);
    if (!offer.sdp) {
      pc.close();
      return null;
    }
    await pc.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription({ type: 'answer', sdp: boost(answer.sdp) });
    await iceDone(pc);
    await ask({ type: 'answer', callId: offer.callId, sdp: pc.localDescription.sdp }, 4000);
    if (!(await got)) {
      pc.close();
      return null;
    }
    const watch = setInterval(() => {
      if (tracks.every((t) => t.readyState === 'ended')) {
        clearInterval(watch);
        pc.close();
        ask({ type: 'hangup', callId: offer.callId }, 2000);
      }
    }, 1000);
    return tracks;
  }

  md.getUserMedia = async function getUserMedia(constraints = {}) {
    if (window.__SKEPNAD_APP__) return origGUM(constraints);
    const vReq = !!constraints.video;
    const aReq = !!constraints.audio;
    const explicitCam = wants(constraints.video, CAM);
    const explicitMic = wants(constraints.audio, MIC);
    const plan = await ask({ type: 'plan', video: vReq, audio: aReq, explicitCam, explicitMic }, 1500);
    const useCam = vReq && plan.hostReady && (explicitCam || plan.autoCam);
    const useMic = aReq && plan.hostReady && (explicitMic || plan.autoMic);
    const cleaned = { ...constraints, video: strip(constraints.video), audio: strip(constraints.audio) };
    if (!useCam && !useMic) return origGUM(cleaned);
    const sk = await connectSkepnad({ video: useCam, audio: useMic });
    if (!sk) return origGUM(cleaned);
    const out = [];
    for (const t of sk) out.push(dress(t, t.kind === 'video' ? CAM : MIC));
    if (aReq && !useMic) out.push(...(await origGUM({ audio: cleaned.audio })).getAudioTracks());
    if (vReq && !useCam) out.push(...(await origGUM({ video: cleaned.video })).getVideoTracks());
    return new MediaStream(out);
  };

  // Äldre API:er som vissa sidor fortfarande använder
  const legacy = function (c, ok, fail) {
    md.getUserMedia(c).then(ok, fail);
  };
  try {
    navigator.getUserMedia = legacy;
    navigator.webkitGetUserMedia = legacy;
  } catch {
    /* ok */
  }
})();
