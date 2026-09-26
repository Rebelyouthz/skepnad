// Kamera, mikrofon och ljudutgångar.

export class Devices {
  constructor() {
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.cameraStream = null;
    this.micStream = null;
  }

  get hasCamera() {
    return !!this.cameraStream?.getVideoTracks().some((t) => t.readyState === 'live');
  }

  async startCamera(deviceId = '', quality = 'balanced') {
    this.stopCamera();
    const size = quality === 'high' ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
    const constraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: size.width },
        height: { ideal: size.height },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (deviceId && err.name === 'OverconstrainedError') return this.startCamera('', quality);
      throw err;
    }
    this.cameraStream = stream;
    this.video.srcObject = stream;
    await this.video.play().catch(() => {});
    await new Promise((resolve) => {
      if (this.video.readyState >= 2) resolve();
      else this.video.addEventListener('loadeddata', resolve, { once: true });
    });
    return stream;
  }

  stopCamera() {
    this.cameraStream?.getTracks().forEach((t) => t.stop());
    this.cameraStream = null;
    this.video.srcObject = null;
  }

  async startMic(deviceId = '', { noiseSuppression = true } = {}) {
    this.stopMic();
    const constraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    };
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (deviceId && err.name === 'OverconstrainedError') return this.startMic('', { noiseSuppression });
      throw err;
    }
    return this.micStream;
  }

  stopMic() {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
  }

  async list() {
    const all = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const pick = (kind) =>
      all
        .filter((d) => d.kind === kind && d.deviceId)
        .map((d, i) => ({ id: d.deviceId, label: d.label || `${kind} ${i + 1}` }));
    return { cameras: pick('videoinput'), mics: pick('audioinput'), outputs: pick('audiooutput') };
  }
}
